"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
  Route,
  Truck,
  MapPin,
  Clock,
  Fuel,
  AlertTriangle,
  CheckCircle,
  Settings,
  Play,
  RefreshCw,
  Package,
  Building,
  Zap,
  Target,
  Info,
} from "lucide-react"
import type { Depot, Vehicle, Customer, OptimizationResult } from "@/lib/types"
import { mockDepots, mockVehicles, mockCustomers } from "@/lib/mock-data"
import { createClient } from "@/lib/supabase/client"
import { OptimizationResults } from "./optimization-results"
import { saveOptimizedRoutes } from "@/lib/route-store"
import { saveCustomerCoordinates, getCustomerCoordinates } from "@/lib/customer-store"
import { MissingCoordinatesDialog } from "@/components/customers/missing-coordinates-dialog"
import type { MockRoute } from "@/lib/mock-data"

export function OptimizationPanel() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDemo, setIsDemo] = useState(false)
  const [optimizeError, setOptimizeError] = useState<string | null>(null)

  const [missingCoordinatesCustomers, setMissingCoordinatesCustomers] = useState<Customer[]>([])
  const [showMissingCoordinatesDialog, setShowMissingCoordinatesDialog] = useState(false)

  // Parameters
  const [selectedDepots, setSelectedDepots] = useState<string[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [fuelPrice, setFuelPrice] = useState(47.5)
  const [maxRouteDistance, setMaxRouteDistance] = useState<number | null>(null)
  const [maxRouteDuration, setMaxRouteDuration] = useState(600)
  const [useRealDistances, setUseRealDistances] = useState(true)
  const [algorithm, setAlgorithm] = useState<"ors" | "ortools">("ortools")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    if (!supabase) {
      const savedCoords = getCustomerCoordinates()
      const customersWithCoords = mockCustomers.map((c) => {
        const saved = savedCoords[c.id]
        if (saved) {
          return { ...c, lat: saved.lat, lng: saved.lng }
        }
        return c
      })

      setDepots(mockDepots)
      setVehicles(mockVehicles)
      setCustomers(customersWithCoords)
      setSelectedDepots(mockDepots.map((d) => d.id))
      setIsDemo(true)
      setLoading(false)
      return
    }

    const [depotsRes, vehiclesRes, customersRes] = await Promise.all([
      supabase.from("depots").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("customers").select("*"),
    ])

    if (depotsRes.data) setDepots(depotsRes.data)
    else {
      setDepots(mockDepots)
      setIsDemo(true)
    }

    if (vehiclesRes.data) setVehicles(vehiclesRes.data)
    else setVehicles(mockVehicles)

    if (customersRes.data) setCustomers(customersRes.data)
    else {
      const savedCoords = getCustomerCoordinates()
      const customersWithCoords = mockCustomers.map((c) => {
        const saved = savedCoords[c.id]
        if (saved) {
          return { ...c, lat: saved.lat, lng: saved.lng }
        }
        return c
      })
      setCustomers(customersWithCoords)
    }

    if (depotsRes.data) {
      setSelectedDepots(depotsRes.data.map((d: Depot) => d.id))
    } else {
      setSelectedDepots(mockDepots.map((d) => d.id))
    }

    setLoading(false)
  }

  async function handleSaveCoordinates(updates: { id: string; lat: number; lng: number }[]) {
    const supabase = createClient()

    // Save to localStorage for persistence
    saveCustomerCoordinates(updates)

    if (!supabase || isDemo) {
      // Demo modunda local state'i guncelle
      setCustomers((prev) =>
        prev.map((c) => {
          const update = updates.find((u) => u.id === c.id)
          if (update) {
            return { ...c, lat: update.lat, lng: update.lng }
          }
          return c
        }),
      )
      return
    }

    // Supabase'de guncelle
    for (const update of updates) {
      await supabase.from("customers").update({ lat: update.lat, lng: update.lng }).eq("id", update.id)
    }

    // Verileri yeniden yukle
    fetchData()
  }

  async function handleOptimize() {
    console.log("[v0] Starting optimization")
    console.log("[v0] Algorithm:", algorithm)
    console.log("[v0] Selected depots:", selectedDepots)
    console.log("[v0] Selected customers:", selectedCustomers)

    if (selectedDepots.length === 0) {
      toast({
        title: "Hata",
        description: "Lütfen en az bir depo seçin",
        variant: "destructive",
      })
      return
    }

    const customersToOptimize = selectedCustomers.length === 0 ? customers.map((c) => c.id) : selectedCustomers

    console.log("[v0] Customers to optimize:", customersToOptimize.length)

    // Check missing coordinates
    const missingCoords = customers
      .filter((c) => customersToOptimize.includes(c.id))
      .filter((c) => !c.lat || !c.lng || c.lat === 0 || c.lng === 0)

    if (missingCoords.length > 0) {
      setMissingCoordinatesCustomers(missingCoords)
      setShowMissingCoordinatesDialog(true)
      toast({
        title: "Koordinat Eksik",
        description: `${missingCoords.length} müşteri için koordinat bilgisi eksik`,
        variant: "destructive",
      })
      return
    }

    setOptimizing(true)
    setOptimizeError(null)
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90))
    }, 500)

    try {
      const apiEndpoint = "/api/optimize"
      console.log("[v0] Calling API:", apiEndpoint)

      const depotsData = selectedDepots.map((id) => depots.find((d) => d.id === id)).filter(Boolean)
      const vehiclesData = vehicles.filter((v) => v.status === "available")
      const customersData = customersToOptimize.map((id) => customers.find((c) => c.id === id)).filter(Boolean)

      console.log("[v0] Depots data:", depotsData)
      console.log("[v0] Vehicles data:", vehiclesData)
      console.log("[v0] Customers data:", customersData)

      console.log("[v0] Request body:", {
        depotsCount: depotsData.length,
        vehiclesCount: vehiclesData.length,
        customersCount: customersData.length,
      })

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depots: depotsData,
          vehicles: vehiclesData,
          customers: customersData,
          options: {
            fuelPrice,
            maxRouteDistance,
            maxRouteDuration,
            useRealDistances,
            algorithm,
          },
        }),
      })

      clearInterval(progressInterval)

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API error response:", errorText)

        let errorMessage = "Optimizasyon başarısız"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("[v0] Optimization result:", data)

      setResult(data)
      setProgress(100)

      toast({
        title: "Başarılı",
        description: `${data.routes?.length || 0} rota oluşturuldu`,
      })

      // Save optimized routes to localStorage for Map page
      const mockRoutes: MockRoute[] = data.routes.map((route: any, index: number) => {
        const depot = depots.find((d) => d.id === route.depotId)
        const vehicle = vehicles.find((v) => v.id === route.vehicleId)

        const totalDistanceValue =
          typeof route.totalDistance !== "undefined"
            ? route.totalDistance
            : typeof route.distance !== "undefined"
              ? route.distance
              : 0

        const totalDurationValue =
          typeof route.totalDuration !== "undefined"
            ? route.totalDuration
            : typeof route.duration !== "undefined"
              ? route.duration
              : 0

        const fuelCostValue = route.fuelCost ?? 0
        const distanceCostValue = route.distanceCost ?? 0
        const fixedCostValue = route.fixedCost ?? 0
        const tollCostValue = route.tollCost ?? 0
        const totalCostValue = route.totalCost ?? fuelCostValue + distanceCostValue + fixedCostValue + tollCostValue

        return {
          id: `route-${index + 1}`,
          vehicle_id: route.vehicleId,
          vehicle_plate: vehicle?.plate || `Arac ${index + 1}`,
          depot_id: route.depotId,
          depot_name: depot?.name || depot?.city || "Depo",
          status: "pending" as const,
          total_distance_km: totalDistanceValue,
          total_duration_min: totalDurationValue,
          total_cost: totalCostValue,
          fuel_cost: fuelCostValue,
          distance_cost: distanceCostValue,
          fixed_cost: fixedCostValue,
          toll_cost: tollCostValue,
          stops: route.stops.map((stop: any, stopIndex: number) => {
            const customer = customers.find((c) => c.id === stop.customerId)
            return {
              customer_id: stop.customerId,
              customer_name: customer?.name || stop.customerName || `Musteri ${stopIndex + 1}`,
              order: stopIndex + 1,
              sequence: stopIndex + 1,
              arrival_time: stop.arrivalTime || `${8 + stopIndex}:00`,
              service_time: stop.serviceTime || 15,
              demand: stop.demand || customer?.demand_pallet || 0,
              lat: stop.lat || customer?.lat || 0,
              lng: stop.lng || customer?.lng || 0,
              address: stop.address || customer?.address || "",
            }
          }),
          geometry: route.geometry || null,
        }
      })

      const summaryData = {
        totalRoutes: mockRoutes.length,
        totalDistance:
          data.summary?.totalDistance || mockRoutes.reduce((sum, r) => sum + (r.total_distance_km || 0), 0),
        totalDuration:
          data.summary?.totalDuration || mockRoutes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0),
        totalCost: data.summary?.totalCost || mockRoutes.reduce((sum, r) => sum + (r.total_cost || 0), 0),
        fuelCost: data.summary?.fuelCost || mockRoutes.reduce((sum, r) => sum + (r.fuel_cost || 0), 0),
        distanceCost: data.summary?.distanceCost || mockRoutes.reduce((sum, r) => sum + (r.distance_cost || 0), 0),
        fixedCost: data.summary?.fixedCost || mockRoutes.reduce((sum, r) => sum + (r.fixed_cost || 0), 0),
        tollCost: data.summary?.tollCost || mockRoutes.reduce((sum, r) => sum + (r.toll_cost || 0), 0),
      }

      saveOptimizedRoutes(mockRoutes, summaryData, data.provider || "openrouteservice")
    } catch (err) {
      clearInterval(progressInterval)
      setOptimizeError(err instanceof Error ? err.message : "Bilinmeyen hata")
    } finally {
      setOptimizing(false)
    }
  }

  const activeDepots = depots.filter((d) => selectedDepots.includes(d.id))
  const availableVehicles = vehicles.filter((v) => v.status === "available")
  const totalDemand = customers.reduce((sum, c) => sum + (c.demand_pallet || c.demand_pallets || 0), 0)
  const totalCapacity = availableVehicles.reduce((sum, v) => sum + v.capacity_pallet, 0)
  const missingCoords = customers.filter((c) => !c.lat || !c.lng || c.lat === 0 || c.lng === 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Veriler yükleniyor...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-600 dark:text-blue-400">
            Demo modu aktif - Gerçek veriler için Supabase bağlantısı yapın. Parametreleri ayarlayın ve "Rotaları
            Optimize Et" butonuna tıklayın
          </AlertDescription>
        </Alert>
      )}

      {/* Missing coordinates warning */}
      {missingCoords.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>
              <strong>{missingCoords.length} müşteri</strong> için koordinat bilgisi eksik. Optimizasyon öncesi
              koordinat girmeniz gerekiyor.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-amber-500 text-amber-600 hover:bg-amber-50 bg-transparent"
              onClick={() => {
                setMissingCoordinatesCustomers(missingCoords)
                setShowMissingCoordinatesDialog(true)
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Koordinatları Gir
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Parameters */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Optimizasyon Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Optimizasyon Algoritması</Label>
                <Select value={algorithm} onValueChange={(v: "ors" | "ortools") => setAlgorithm(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ortools">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-500" />
                        <span>OR-Tools (Önerilen)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ors">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span>ORS/VROOM</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {algorithm === "ortools"
                    ? "Tüm kısıtları destekler: zaman penceresi, mola, servis süresi"
                    : "Hızlı çözüm, sınırlı kısıt desteği"}
                </p>
              </div>

              <Separator />

              {/* Depot Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Depo Seçimi</Label>
                <Select
                  value={selectedDepots.length === depots.length ? "all" : selectedDepots[0]}
                  onValueChange={(v) => {
                    if (v === "all") setSelectedDepots(depots.map((d) => d.id))
                    else setSelectedDepots([v])
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Depo seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Depolar</SelectItem>
                    {depots.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name || d.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Müşteri Seçimi</Label>
                <Select
                  value={selectedCustomers.length === customers.length ? "all" : selectedCustomers[0]}
                  onValueChange={(v) => {
                    if (v === "all") setSelectedCustomers(customers.map((c) => c.id))
                    else setSelectedCustomers([v])
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Müşteri seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Müşteriler</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fuel Price */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Yakit Fiyati (TL/L)</Label>
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(Number(e.target.value))}
                    step="0.1"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Max Route Distance */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Maks. Rota Mesafesi (km)</Label>
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={maxRouteDistance || "Sinirsiz"}
                    onChange={(e) => {
                      const val = e.target.value
                      setMaxRouteDistance(val === "" || val === "Sinirsiz" ? null : Number(val))
                    }}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Max Route Duration */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Maks. Rota Süresi (dk): {maxRouteDuration}</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[maxRouteDuration]}
                    onValueChange={([v]) => setMaxRouteDuration(v)}
                    min={60}
                    max={720}
                    step={30}
                    className="flex-1"
                  />
                </div>
              </div>

              <Separator />

              {/* Geometry Option */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rota Geometrisi</Label>
                <p className="text-xs text-muted-foreground">Harita çizimi için</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gerçek yol geometrisi</span>
                  <Switch checked={useRealDistances} onCheckedChange={setUseRealDistances} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Optimizasyon Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" /> Depolar
                </span>
                <div className="flex gap-1">
                  {activeDepots.map((d) => (
                    <Badge key={d.id} variant="secondary" className="text-xs">
                      {d.city}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Musait Araçlar
                </span>
                <Badge variant="outline">{availableVehicles.length} araç</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Bekleyen Teslimat
                </span>
                <Badge variant="outline">
                  {selectedCustomers.length} teslimat
                  {missingCoords.length > 0 && (
                    <span className="ml-1 text-amber-500">({missingCoords.length} koordinatsız)</span>
                  )}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Toplam Talep
                </span>
                <Badge variant="outline">{totalDemand} palet</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Kapasite Durumu</span>
                <Badge variant={totalCapacity >= totalDemand ? "default" : "destructive"}>
                  {totalCapacity >= totalDemand ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" /> Yeterli
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" /> Yetersiz
                    </>
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Optimize Button */}
          <Button
            className="w-full h-12 text-lg"
            onClick={handleOptimize}
            disabled={optimizing || availableVehicles.length === 0}
          >
            {optimizing ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Optimize Ediliyor... %{progress}
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Rotaları Optimize Et
              </>
            )}
          </Button>

          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <Zap className={`h-3 w-3 ${algorithm === "ortools" ? "text-green-500" : "text-blue-500"}`} />
            <span>{algorithm === "ortools" ? "OR-Tools Hazır" : "VROOM Hazır"}</span>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          {optimizeError ? (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-600 dark:text-red-400">{optimizeError}</AlertDescription>
            </Alert>
          ) : result ? (
            <OptimizationResults result={result} depots={depots} />
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Route className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Henüz optimizasyon yapılmadı</h3>
                <p className="text-muted-foreground max-w-sm">
                  Sol panelden parametreleri ayarlayın ve "Rotaları Optimize Et" butonuna tıklayın
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Missing Coordinates Dialog */}
      <MissingCoordinatesDialog
        open={showMissingCoordinatesDialog}
        onOpenChange={setShowMissingCoordinatesDialog}
        customers={missingCoordinatesCustomers}
        onSave={handleSaveCoordinates}
      />
    </div>
  )
}
