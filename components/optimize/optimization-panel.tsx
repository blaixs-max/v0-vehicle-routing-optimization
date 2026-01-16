"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
  Save,
} from "lucide-react"
import type { Depot, Vehicle, Customer, OptimizationResult } from "@/lib/types"
import { OptimizationResults } from "./optimization-results"
import { saveCustomerCoordinates } from "@/lib/customer-store"
import { MissingCoordinatesDialog } from "@/components/customers/missing-coordinates-dialog"

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
  const [isSavingRoutes, setIsSavingRoutes] = useState(false)

  const [missingCoordinatesCustomers, setMissingCoordinatesCustomers] = useState<Customer[]>([])
  const [showMissingCoordinatesDialog, setShowMissingCoordinatesDialog] = useState(false)

  // AbortController ile önceki optimize isteklerini iptal etme
  const abortControllerRef = useRef<AbortController | null>(null)

  const [orders, setOrders] = useState<
    { customerId: string; customerName: string; pallets: number; priority?: number }[]
  >([])

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])

  // Parameters
  const [selectedDepots, setSelectedDepots] = useState<string[]>([])
  const [fuelPrice, setFuelPrice] = useState(47.5)
  const [maxRouteDistance, setMaxRouteDistance] = useState<number | null>(null)
  const [maxRouteDuration, setMaxRouteDuration] = useState(600)
  const [useRealDistances, setUseRealDistances] = useState(true)
  const [algorithm, setAlgorithm] = useState<"ors" | "ortools">("ortools")

  // useMemo ile optimize edilmiş hesaplamalar - sadece bağımlılıklar değiştiğinde yeniden hesaplanır
  const availableVehicles = useMemo(
    () => vehicles.filter((v) => selectedDepots.includes(v.depot_id || "")),
    [vehicles, selectedDepots],
  )

  const totalCapacity = useMemo(
    () => availableVehicles.reduce((sum, v) => sum + (v.capacity_pallets || 0), 0),
    [availableVehicles],
  )

  const totalDemand = useMemo(() => orders.reduce((sum, o) => sum + o.pallets, 0), [orders])

  const missingCoords = useMemo(
    () =>
      customers
        .filter((c) => orders.some((o) => o.customerId === c.id))
        .filter((c) => !c.lat || !c.lng || c.lat === 0 || c.lng === 0),
    [customers, orders],
  )

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [depotsRes, vehiclesRes, customersRes, fuelRes, ordersRes] = await Promise.all([
        fetch("/api/depots"),
        fetch("/api/vehicles"),
        fetch("/api/customers?all=true"), // Optimizasyon için tüm müşteriler
        fetch("/api/fuel-price"),
        fetch("/api/orders?all=true"), // Optimizasyon için tüm siparişler
      ])

      if (depotsRes.ok) {
        const depotsData = await depotsRes.json()
        setDepots(depotsData)
        setSelectedDepots(depotsData.map((d: Depot) => d.id))
        setIsDemo(false)
      }

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json()
        setVehicles(vehiclesData)
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData)
      }

      if (fuelRes.ok) {
        const fuelData = await fuelRes.json()
        setFuelPrice(fuelData.price || 47.5)
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        const pendingOrders = ordersData
          .filter((o: any) => o.status === "pending")
          .map((o: any) => ({
            customerId: o.customer_id,
            customerName: o.customer_name,
            pallets: o.pallets,
            priority: o.priority || 3,
          }))
        setOrders(pendingOrders)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch data:", error)
      toast({
        title: "Veri Yükleme Hatası",
        description: "Veriler yüklenemedi. Lütfen sayfayı yenileyin.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveCoordinates(updates: { id: string; lat: number; lng: number }[]) {
    saveCustomerCoordinates(updates)

    setCustomers((prev) =>
      prev.map((c) => {
        const update = updates.find((u) => u.id === c.id)
        if (update) {
          return { ...c, lat: update.lat, lng: update.lng }
        }
        return c
      }),
    )
  }

  async function handleOptimize() {
    console.log("[v0] ========== handleOptimize called ==========")
    console.log("[v0] Selected depots:", selectedDepots.length)
    console.log("[v0] Algorithm:", algorithm)
    console.log("[v0] Available vehicles:", availableVehicles.length)

    if (selectedDepots.length === 0) {
      toast({ description: "En az bir depo seçmelisiniz" })
      return
    }

    const customersToOptimize = selectedCustomers.length > 0 ? selectedCustomers : customers.map((c) => c.id)

    console.log("[v0] Customers to optimize:", customersToOptimize.length)

    if (customersToOptimize.length === 0) {
      toast({ description: "Optimize edilecek müşteri bulunamadı" })
      return
    }

    const missingCoords = customers
      .filter((c) => customersToOptimize.includes(c.id))
      .filter((c) => !c.lat || !c.lng || c.lat === 0 || c.lng === 0)

    if (missingCoords.length > 0) {
      console.log("[v0] Missing coordinates for", missingCoords.length, "customers")
      setMissingCoordinatesCustomers(missingCoords)
      setShowMissingCoordinatesDialog(true)
      toast({
        title: "Koordinat Eksik",
        description: `${missingCoords.length} müşteri için koordinat bilgisi eksik`,
        variant: "destructive",
      })
      return
    }

    console.log("[v0] All validation passed, starting optimization...")

    // Önceki isteği iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Yeni AbortController oluştur
    abortControllerRef.current = new AbortController()

    setOptimizing(true)
    setOptimizeError(null)
    setProgress(10)
    setResult(null)

    const depotsData = selectedDepots.map((id) => depots.find((d) => d.id === id)).filter(Boolean)
    const vehiclesData = vehicles.filter((v) => v.status === "available")
    const customersData = customersToOptimize.map((id) => customers.find((c) => c.id === id)).filter(Boolean)

    console.log("[v0] Sending to API:", {
      depots: depotsData.length,
      vehicles: vehiclesData.length,
      customers: customersData.length,
      orders: orders.length,
      algorithm,
    })

    try {
      console.log("[v0] Fetching /api/optimize...")
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depots: depotsData,
          vehicles: vehiclesData,
          customers: customersData,
          orders,
          algorithm,
          fuelPricePerLiter: fuelPrice,
          maxRouteDistanceKm: maxRouteDistance,
          maxRouteTimeMin: maxRouteDuration,
        }),
        signal: abortControllerRef.current?.signal, // İstek iptali için
      })

      console.log("[v0] API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] API error:", errorData)
        throw new Error(errorData.error || "Optimization failed")
      }

      const result = await response.json()
      console.log("[v0] Optimization result received:", result.routes?.length, "routes")

      setResult(result)
      setOptimizing(false)

      toast({
        title: "Optimizasyon Tamamlandı",
        description: `${result.routes?.length || 0} rota oluşturuldu`,
      })
    } catch (error: any) {
      // İstek iptal edildiyse sessizce geç
      if (error.name === "AbortError") {
        console.log("[v0] Optimization request aborted")
        setOptimizing(false)
        return
      }

      console.error("[v0] Optimization error:", error)
      setOptimizing(false)
      setOptimizeError(error instanceof Error ? error.message : "Bilinmeyen hata")
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive",
      })
    }
  }

  const handleSaveRoutes = async () => {
    if (!result || result.routes.length === 0) {
      toast({ description: "Kaydedilecek rota bulunamadı" })
      return
    }

    setIsSavingRoutes(true)
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routes: result.routes.map((route) => ({
            id: `route-${Date.now()}-${route.vehicleId}`,
            vehicleId: route.vehicleId,
            depotId: route.depotId,
            routeDate: new Date().toISOString().split("T")[0],
            totalDistance: route.totalDistance,
            totalDuration: route.totalDuration,
            totalPallets: route.totalPallets,
            totalCost: route.totalCost,
            fuelCost: route.fuelCost,
            distanceCost: route.distanceCost,
            fixedCost: route.fixedCost,
            stops: route.stops.map((stop) => ({
              customerId: stop.customerId,
              stopOrder: stop.stopOrder,
              distanceFromPrev: stop.distanceFromPrev,
              durationFromPrev: stop.durationFromPrev,
              cumulativeDistance: stop.cumulativeDistance,
              cumulativeLoad: stop.cumulativeLoad,
              arrivalTime: stop.arrivalTime,
            })),
          })),
        }),
      })

      if (!response.ok) throw new Error("Failed to save routes")

      const resultData = await response.json()
      toast({
        title: "Rotalar Kaydedildi",
        description: `${resultData.count} rota başarıyla kaydedildi`,
      })
    } catch (error) {
      console.error("[v0] Save routes error:", error)
      toast({
        title: "Hata",
        description: "Rotalar kaydedilemedi",
        variant: "destructive",
      })
    } finally {
      setIsSavingRoutes(false)
    }
  }

  const activeDepots = depots.filter((d) => selectedDepots.includes(d.id))

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
                    ? "Mesafe ve kapasite optimizasyonu (Time constraints test için kapalı)"
                    : "Hızlı çözüm, sınırlı kısıt desteği"}
                </p>
              </div>

              {algorithm === "ortools" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 mb-2">Aktif Kısıtlar:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>✓ Mesafe optimizasyonu</li>
                    <li>✓ Kapasite kısıtları</li>
                    <li>✓ Araç-depo eşleştirme</li>
                  </ul>
                  <p className="text-xs font-medium text-blue-800 mt-2 mb-1">Test için Kapalı:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>○ Zaman pencereleri</li>
                    <li>○ Araç tipi kısıtları</li>
                    <li>○ Mola kuralları</li>
                  </ul>
                </div>
              )}

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
                  <MapPin className="h-4 w-4" /> Sipariş Sayısı
                </span>
                <Badge variant="outline">
                  {orders.length} sipariş
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
            <>
              <OptimizationResults result={result} depots={depots} />
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Optimizasyon Sonuçları</span>
                    <Button onClick={handleSaveRoutes} disabled={isSavingRoutes} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingRoutes ? "Kaydediliyor..." : "Rotaları Kaydet"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {/* ... existing result display ... */}
              </Card>
            </>
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
