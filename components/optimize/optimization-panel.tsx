"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { mockDepots, mockVehicles, mockCustomers } from "@/lib/mock-data"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import type { VroomOptimizationResult } from "@/lib/vroom/types"
import { optimizeWithVroom } from "@/lib/vroom/optimizer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Zap,
  Clock,
  Route,
  TrendingDown,
  Fuel,
  AlertCircle,
  Loader2,
  Cpu,
  Webhook,
  CheckCircle2,
  Copy,
} from "lucide-react"
import { DEPOT_COLORS } from "@/lib/constants"
import { VroomResults } from "./vroom-results"

export function OptimizationPanel() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<VroomOptimizationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  const [fuelPrice, setFuelPrice] = useState("47.50")
  const [maxDistance, setMaxDistance] = useState("")
  const [maxTime, setMaxTime] = useState("")
  const [includeGeometry, setIncludeGeometry] = useState(true)
  const [selectedDepot, setSelectedDepot] = useState<string>("")

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/n8n/optimize` : "/api/n8n/optimize"

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    if (!supabase) {
      setDepots(mockDepots)
      setVehicles(mockVehicles)
      setCustomers(mockCustomers)
      setIsDemo(true)
      setLoading(false)
      return
    }

    try {
      const [depotsRes, vehiclesRes, customersRes, fuelRes] = await Promise.all([
        supabase.from("depots").select("*").eq("status", "active"),
        supabase.from("vehicles").select("*").eq("status", "available"),
        supabase.from("customers").select("*").eq("status", "pending"),
        supabase.from("fuel_prices").select("*").order("effective_date", { ascending: false }).limit(1),
      ])

      if (depotsRes.data) setDepots(depotsRes.data)
      if (vehiclesRes.data) setVehicles(vehiclesRes.data)
      if (customersRes.data) setCustomers(customersRes.data)
      if (fuelRes.data?.[0]) setFuelPrice(fuelRes.data[0].price_per_liter.toString())
    } catch (error) {
      setDepots(mockDepots)
      setVehicles(mockVehicles)
      setCustomers(mockCustomers)
      setIsDemo(true)
    }

    setLoading(false)
  }

  async function runOptimization() {
    setOptimizing(true)
    setProgress(10)
    setResult(null)

    try {
      setProgress(30)

      const optimizationResult = await optimizeWithVroom(depots, vehicles, customers, {
        depotId: selectedDepot || undefined,
        fuelPricePerLiter: Number.parseFloat(fuelPrice),
        maxRouteDistanceKm: maxDistance ? Number.parseFloat(maxDistance) : undefined,
        maxRouteTimeMin: maxTime ? Number.parseFloat(maxTime) : undefined,
        includeGeometry,
      })

      setProgress(90)
      setResult(optimizationResult)

      if (optimizationResult.success && !isDemo) {
        const supabase = createClient()
        if (supabase) {
          await supabase.from("optimization_history").insert({
            algorithm: "VROOM",
            depot_id: selectedDepot || null,
            parameters: {
              fuelPrice: Number.parseFloat(fuelPrice),
              maxDistance: maxDistance || null,
              maxTime: maxTime || null,
              includeGeometry,
            },
            total_routes: optimizationResult.summary.totalRoutes,
            total_vehicles_used: optimizationResult.summary.totalRoutes,
            total_distance_km: optimizationResult.summary.totalDistance,
            total_cost: optimizationResult.summary.totalCost,
            computation_time_ms: optimizationResult.summary.computationTimeMs,
          })
        }
      }

      setProgress(100)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
        summary: {
          totalRoutes: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalCost: 0,
          fuelCost: 0,
          fixedCost: 0,
          distanceCost: 0,
          unassignedCount: customers.length,
          computationTimeMs: 0,
        },
        routes: [],
        unassigned: [],
      })
    } finally {
      setOptimizing(false)
    }
  }

  async function copyWebhookUrl() {
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalDemand = customers.reduce((sum, c) => sum + (c.demand_pallet || c.demand_pallets || 0), 0)
  const totalCapacity = vehicles.reduce((sum, v) => sum + (v.capacity_pallet || 0), 0)
  const capacityRatio = totalCapacity > 0 ? (totalDemand / totalCapacity) * 100 : 0

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Veriler yukleniyor...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Demo modu aktif - Supabase baglantisi yapilandirilmamis</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Cpu className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rota Optimizasyonu</h1>
            <p className="text-sm text-muted-foreground">VROOM Engine + OSRM</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          VROOM API Aktif
        </Badge>
      </div>

      <Tabs defaultValue="optimize" className="space-y-6">
        <TabsList>
          <TabsTrigger value="optimize" className="gap-2">
            <Zap className="h-4 w-4" />
            Optimizasyon
          </TabsTrigger>
          <TabsTrigger value="n8n" className="gap-2">
            <Webhook className="h-4 w-4" />
            N8N Entegrasyonu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optimize">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Optimizasyon Ozeti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aktif Depolar</span>
                    <div className="flex gap-1">
                      {depots.map((d) => (
                        <Badge
                          key={d.id}
                          variant="outline"
                          style={{
                            borderColor: DEPOT_COLORS[d.city]?.primary,
                            color: DEPOT_COLORS[d.city]?.primary,
                          }}
                        >
                          {d.city}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Musait Araclar</span>
                    <span className="font-medium">{vehicles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bekleyen Teslimat</span>
                    <span className="font-medium">{customers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam Talep</span>
                    <span className="font-medium">{totalDemand} palet</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kapasite Kullanimi</span>
                      <span className="font-medium">{capacityRatio.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(capacityRatio, 100)} className="h-2" />
                  </div>

                  {capacityRatio > 100 && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Talep, mevcut kapasiteyi asiyor!
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parametreler</CardTitle>
                  <CardDescription>VROOM optimizasyon ayarlari</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Depo Filtresi</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border bg-background"
                      value={selectedDepot}
                      onChange={(e) => setSelectedDepot(e.target.value)}
                    >
                      <option value="">Tum Depolar</option>
                      {depots.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuelPrice">Yakit Fiyati (TL/L)</Label>
                    <div className="relative">
                      <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fuelPrice"
                        type="number"
                        step="0.01"
                        value={fuelPrice}
                        onChange={(e) => setFuelPrice(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDistance">Maks. Rota Mesafesi (km)</Label>
                    <div className="relative">
                      <Route className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="maxDistance"
                        type="number"
                        value={maxDistance}
                        onChange={(e) => setMaxDistance(e.target.value)}
                        placeholder="Sinirsiz"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTime">Maks. Rota Suresi (dk)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="maxTime"
                        type="number"
                        value={maxTime}
                        onChange={(e) => setMaxTime(e.target.value)}
                        placeholder="Sinirsiz"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Rota Geometrisi</Label>
                      <p className="text-xs text-muted-foreground">Harita cizimi icin</p>
                    </div>
                    <Switch checked={includeGeometry} onCheckedChange={setIncludeGeometry} />
                  </div>

                  <Button
                    onClick={runOptimization}
                    disabled={optimizing || customers.length === 0}
                    className="w-full mt-4"
                  >
                    {optimizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        VROOM Calisiyor...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Optimizasyonu Baslat
                      </>
                    )}
                  </Button>

                  {optimizing && <Progress value={progress} className="h-2" />}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {result ? (
                <VroomResults result={result} depots={depots} />
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center space-y-4">
                    <div className="p-4 rounded-full bg-muted inline-block">
                      <TrendingDown className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">Henuz optimizasyon yapilmadi</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Parametreleri ayarlayin ve VROOM ile optimizasyonu baslatin
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="n8n">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  N8N Webhook Endpoints
                </CardTitle>
                <CardDescription>Bu endpointleri N8N workflowlarinizda kullanabilirsiniz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Optimizasyon Endpoint</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono overflow-x-auto">
                      POST {webhookUrl}
                    </code>
                    <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Analiz Endpoint</Label>
                  <code className="block px-3 py-2 bg-muted rounded-md text-sm font-mono">POST /api/n8n/analyze</code>
                </div>

                <div className="space-y-2">
                  <Label>Yeniden Optimizasyon</Label>
                  <code className="block px-3 py-2 bg-muted rounded-md text-sm font-mono">
                    POST /api/n8n/reoptimize
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ornek Request Body</CardTitle>
                <CardDescription>N8N HTTP Request node icin</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                  {`{
  "fuelPricePerLiter": 47.5,
  "maxRouteDistanceKm": 300,
  "maxRouteTimeMin": 480,
  "includeGeometry": true,
  "saveRoutes": true
}`}
                </pre>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>N8N + AI Workflow Ornegi</CardTitle>
                <CardDescription>Yapay zeka destekli otomatik rota optimizasyonu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 overflow-x-auto pb-4">
                  <div className="flex-shrink-0 p-4 bg-orange-100 rounded-lg text-center min-w-[120px]">
                    <div className="text-2xl mb-1">⏰</div>
                    <div className="text-sm font-medium">Schedule</div>
                    <div className="text-xs text-muted-foreground">Her gun 06:00</div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-shrink-0 p-4 bg-blue-100 rounded-lg text-center min-w-[120px]">
                    <div className="text-2xl mb-1">📊</div>
                    <div className="text-sm font-medium">HTTP Request</div>
                    <div className="text-xs text-muted-foreground">/api/n8n/analyze</div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-shrink-0 p-4 bg-green-100 rounded-lg text-center min-w-[120px]">
                    <div className="text-2xl mb-1">🤖</div>
                    <div className="text-sm font-medium">OpenAI</div>
                    <div className="text-xs text-muted-foreground">Parametre oner</div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-shrink-0 p-4 bg-purple-100 rounded-lg text-center min-w-[120px]">
                    <div className="text-2xl mb-1">🚛</div>
                    <div className="text-sm font-medium">HTTP Request</div>
                    <div className="text-xs text-muted-foreground">/api/n8n/optimize</div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-shrink-0 p-4 bg-pink-100 rounded-lg text-center min-w-[120px]">
                    <div className="text-2xl mb-1">📧</div>
                    <div className="text-sm font-medium">Email/Slack</div>
                    <div className="text-xs text-muted-foreground">Rapor gonder</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
