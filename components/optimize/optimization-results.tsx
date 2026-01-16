"use client"

import { useState, useEffect, useRef } from "react"
import type { OptimizationResult, OptimizedRoute } from "@/lib/vroom/client"
import type { Depot } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Route,
  Clock,
  Fuel,
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Map,
  List,
  Save,
  Zap,
  Landmark,
  DollarSign,
  CircleDollarSign,
} from "lucide-react"
import { DEPOT_COLORS, ROUTE_COLORS } from "@/lib/constants"

interface OptimizationResultsProps {
  result: OptimizationResult
  depots?: Depot[]
}

export function OptimizationResults({ result, depots = [] }: OptimizationResultsProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  const summary = result.summary || {
    totalRoutes: result.routes?.length || 0,
    totalDistance: result.routes?.reduce((sum, route) => sum + (route.totalDistance || 0), 0) || 0,
    totalDuration: result.routes?.reduce((sum, route) => sum + (route.totalDuration || 0), 0) || 0,
    totalCost: result.routes?.reduce((sum, route) => sum + (route.totalCost || 0), 0) || 0,
    fuelCost: result.routes?.reduce((sum, route) => sum + (route.fuelCost || 0), 0) || 0,
    distanceCost: result.routes?.reduce((sum, route) => sum + (route.distanceCost || 0), 0) || 0,
    fixedCost: result.routes?.reduce((sum, route) => sum + (route.fixedCost || 0), 0) || 0,
    tollCost: result.routes?.reduce((sum, route) => sum + (route.tollCost || 0), 0) || 0,
    unassignedCount: 0,
    computationTimeMs: 0,
  }

  const toggleRoute = (vehicleId: string) => {
    const newExpanded = new Set(expandedRoutes)
    if (newExpanded.has(vehicleId)) {
      newExpanded.delete(vehicleId)
    } else {
      newExpanded.add(vehicleId)
    }
    setExpandedRoutes(newExpanded)
  }

  const exportJSON = () => {
    const data = JSON.stringify(result, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `optimization-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveRoutes = async () => {
    // Save logic here
  }

  // Tek useEffect ile map initialization ve güncelleme
  useEffect(() => {
    // Sadece map tab'ı açıksa ve container hazırsa
    if (viewMode !== "map" || !mapRef.current) {
      return
    }

    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default
        await import("leaflet/dist/leaflet.css")

        // Eğer map zaten varsa, sadece layer'ları temizle ve yeniden çiz
        if (mapInstanceRef.current) {
          // Mevcut layer'ları temizle
          mapInstanceRef.current.eachLayer((layer: any) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
              mapInstanceRef.current.removeLayer(layer)
            }
          })
        } else {
          // İlk kez oluştur
          const map = L.map(mapRef.current!, {
            center: [39.9334, 32.8597], // Turkiye merkezi
            zoom: 6,
          })

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(map)

          mapInstanceRef.current = map
        }

        const map = mapInstanceRef.current

        // Rotalari haritaya ekle
        if (result.routes && result.routes.length > 0) {
          const bounds: [number, number][] = []

          result.routes.forEach((route, index) => {
            const color = ROUTE_COLORS?.[index % ROUTE_COLORS.length] || "#3B82F6"

            // Depo noktasi
            const depot = depots?.find((d) => d.id === route.depotId)
            if (depot?.lat && depot?.lng) {
              bounds.push([depot.lat, depot.lng])
              L.circleMarker([depot.lat, depot.lng], {
                radius: 10,
                fillColor: "#1E40AF",
                color: "#fff",
                weight: 2,
                fillOpacity: 1,
              })
                .bindPopup(`<b>${depot.name}</b><br/>Depo`)
                .addTo(map)
            }

            // Duraklar
            const routePoints: [number, number][] = []
            if (depot?.lat && depot?.lng) {
              routePoints.push([depot.lat, depot.lng])
            }

            route.stops?.forEach((stop, stopIndex) => {
              const lat = stop.lat || stop.latitude
              const lng = stop.lng || stop.longitude
              if (lat && lng) {
                bounds.push([lat, lng])
                routePoints.push([lat, lng])

                const markerIcon = L.divIcon({
                  className: "custom-marker",
                  html: `<div style="background-color: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${stopIndex + 1}</div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                })

                L.marker([lat, lng], { icon: markerIcon })
                  .bindPopup(
                    `<b>${stop.customerName || stop.customer_name || `Durak ${stopIndex + 1}`}</b><br/>${stop.address || ""}<br/>Talep: ${stop.demand || 0} palet`,
                  )
                  .addTo(map)
              }
            })

            // Depoya donus
            if (depot?.lat && depot?.lng) {
              routePoints.push([depot.lat, depot.lng])
            }

            // Rota cizgisi
            if (route.geometry && route.geometry.length > 0) {
              // ORS geometry kullan (gerçek yol)
              const geometryPoints: [number, number][] = route.geometry.map((coord: number[]) => [coord[1], coord[0]]) // lat, lng
              L.polyline(geometryPoints, {
                color: color,
                weight: 4,
                opacity: 0.8,
              }).addTo(map)
            } else if (routePoints.length > 1) {
              // Fallback: kuş uçuşu
              L.polyline(routePoints, {
                color: color,
                weight: 4,
                opacity: 0.6,
                dashArray: "5, 10",
              }).addTo(map)
            }
          })

          // Haritayi bounds'a fit et
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] })
          }
        }
      } catch (error) {
        console.error("Error initializing map:", error)
      }
    }

    initMap()

    // Cleanup: sadece component unmount olduğunda map'i temizle
    // viewMode değiştiğinde map instance'ı koru
  }, [viewMode, result.routes, depots])

  // Component unmount olduğunda map'i temizle
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  if (!result.success) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <XCircle className="h-6 w-6" />
            <div>
              <h3 className="font-medium">Optimizasyon Basarisiz</h3>
              <p className="text-sm">{result.error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">Optimizasyon Tamamlandi</span>
        </div>
        <Badge
          variant={
            result.algorithm === "ortools" || result.provider === "ortools-railway"
              ? "default"
              : result.provider === "openrouteservice"
                ? "secondary"
                : "outline"
          }
          className="gap-1"
        >
          {result.algorithm === "ortools" || result.provider === "ortools-railway" ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              OR-Tools (Önerilen)
            </>
          ) : result.provider === "openrouteservice" ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              OpenRouteService API
            </>
          ) : (
            <>
              <MapPin className="h-3 w-3" />
              Yerel Algoritma
            </>
          )}
        </Badge>
      </div>

      {/* Ozet Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Route className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Rota</p>
                <p className="text-xl font-bold">{result.routes?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Mesafe</p>
                <p className="text-xl font-bold">{(summary.totalDistance || 0).toFixed(1)} km</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Sure</p>
                <p className="text-xl font-bold">{Math.round((summary.totalDuration || 0) / 60)} saat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
                <p className="text-xl font-bold">{(summary.totalCost || 0).toLocaleString("tr-TR")} TL</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maliyet Dagilimi */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Maliyet Dagilimi</CardTitle>
            <Badge variant="outline" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {summary.computationTimeMs} ms
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Fuel className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <p className="text-xs text-muted-foreground">Yakit</p>
              <p className="font-semibold text-sm">{(summary.fuelCost || 0).toLocaleString("tr-TR")} TL</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Route className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-muted-foreground">Mesafe</p>
              <p className="font-semibold text-sm">{(summary.distanceCost || 0).toLocaleString("tr-TR")} TL</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Truck className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">Sabit</p>
              <p className="font-semibold text-sm">{(summary.fixedCost || 0).toLocaleString("tr-TR")} TL</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Landmark className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <p className="text-xs text-muted-foreground">Gecis</p>
              <p className="font-semibold text-sm">{(summary.tollCost || 0).toLocaleString("tr-TR")} TL</p>
            </div>
          </div>

          {summary.unassignedCount > 0 && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <XCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                {summary.unassignedCount} musteri atanamadi (kapasite yetersiz)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rotalar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Rotalar ({result.routes?.length || 0})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportJSON}>
                <Download className="h-4 w-4 mr-1" />
                JSON
              </Button>
              <Button size="sm" onClick={saveRoutes} disabled={false}>
                <Save className="h-4 w-4 mr-1" />
                Kaydet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <div className="px-4 border-b">
              <TabsList className="h-9">
                <TabsTrigger value="list" className="text-xs gap-1">
                  <List className="h-3 w-3" />
                  Liste
                </TabsTrigger>
                <TabsTrigger value="map" className="text-xs gap-1">
                  <Map className="h-3 w-3" />
                  Harita
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="m-0">
              <ScrollArea className="h-[350px]">
                {result.routes?.map((route, index) => (
                  <RouteCard
                    key={route.vehicleId || index}
                    route={route}
                    index={index}
                    expanded={expandedRoutes.has(route.vehicleId)}
                    onToggle={() => toggleRoute(route.vehicleId)}
                    depots={depots}
                  />
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="map" className="m-0">
              <div ref={mapRef} className="h-[350px] w-full" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

interface RouteCardProps {
  route: OptimizedRoute
  index: number
  expanded: boolean
  onToggle: () => void
  depots: Depot[]
}

function RouteCard({ route, index, expanded, onToggle, depots }: RouteCardProps) {
  const depot = depots?.find((d) => d.id === route.depotId)
  const depotColor = depot ? DEPOT_COLORS[depot.city] : null
  const routeColor = ROUTE_COLORS?.[index % ROUTE_COLORS.length] || "#3B82F6"

  const totalDistance = route.totalDistance ?? route.distance ?? 0
  const totalDuration = route.totalDuration ?? route.duration ?? 0
  const totalLoad = route.totalLoad ?? route.load ?? 0
  const fuelCost = route.fuelCost ?? 0
  const distanceCost = route.distanceCost ?? 0
  const fixedCost = route.fixedCost ?? 0
  const tollCost = route.tollCost ?? 0

  const tollCrossings = route.tollCrossings || []
  const highwayUsage = route.highwayUsage || []

  const totalCost = route.totalCost != null ? route.totalCost : fuelCost + distanceCost + fixedCost + tollCost

  return (
    <div className="border-b last:border-b-0">
      <button onClick={onToggle} className="w-full p-3 hover:bg-muted/50 transition-colors text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: routeColor }}
            >
              {index + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{route.vehiclePlate || `Arac ${index + 1}`}</span>
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: depotColor?.primary, color: depotColor?.primary }}
                >
                  {route.depotName || depot?.name || "Depo"}
                </Badge>
                {(tollCrossings.length > 0 || highwayUsage.length > 0) && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Landmark className="h-3 w-3" />
                    {tollCrossings.length + highwayUsage.length} gecis
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{route.stops?.length || 0} durak</span>
                <span>{totalDistance.toFixed(1)} km</span>
                <span>{Math.round(totalDuration)} dk</span>
                <span>{totalLoad} palet</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">{(totalCost || 0).toLocaleString("tr-TR")} TL</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <div className="mb-3 p-2 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <p className="text-muted-foreground">Yakit</p>
                <p className="font-medium">{(fuelCost || 0).toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Mesafe</p>
                <p className="font-medium">{(distanceCost || 0).toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Sabit</p>
                <p className="font-medium">{(fixedCost || 0).toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Gecis</p>
                <p className="font-medium">{(tollCost || 0).toLocaleString("tr-TR")} TL</p>
              </div>
            </div>
          </div>

          {tollCrossings.length > 0 && (
            <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs font-medium text-purple-800 mb-2 flex items-center gap-1">
                <Landmark className="h-3 w-3" />
                Kopru / Tunel Gecisleri
              </p>
              <div className="space-y-1">
                {tollCrossings.map((crossing: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-purple-700">
                      {crossing.type === "Kopru" ? "🌉" : "🚇"} {crossing.name}
                    </span>
                    <span className="font-medium text-purple-800">
                      {(crossing.cost || 0).toLocaleString("tr-TR")} TL
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {highwayUsage.length > 0 && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
                <CircleDollarSign className="h-3 w-3" />
                Otoyol Kullanimi
              </p>
              <div className="space-y-1">
                {highwayUsage.map((hw: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="text-blue-700">
                      <span className="font-medium">{hw.highway}</span>
                      <span className="text-blue-500 ml-1">
                        ({hw.entry} → {hw.exit}, {hw.distanceKm} km)
                      </span>
                    </div>
                    <span className="font-medium text-blue-800">{(hw.cost || 0).toLocaleString("tr-TR")} TL</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ml-4 pl-4 border-l-2 space-y-2" style={{ borderColor: routeColor }}>
            <div className="relative">
              <div
                className="absolute -left-[21px] w-3 h-3 rounded-full border-2 bg-background"
                style={{ borderColor: routeColor }}
              />
              <p className="text-xs font-medium">{route.depotName || depot?.name || "Depo"} (Baslangic)</p>
            </div>

            {route.stops?.map((stop, stopIndex) => (
              <div key={stop.customerId || stopIndex} className="relative">
                <div
                  className="absolute -left-[21px] w-3 h-3 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: routeColor, fontSize: "8px" }}
                >
                  {stopIndex + 1}
                </div>
                <div>
                  <p className="text-xs font-medium">{stop.customerName || `Musteri ${stopIndex + 1}`}</p>
                  <p className="text-xs text-muted-foreground">{stop.address || ""}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>+{stop.distanceFromPrev?.toFixed(1)} km</span>
                    <span>{stop.arrivalTime?.toFixed(0)} dk</span>
                    <span>{stop.demand} palet</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="relative">
              <div
                className="absolute -left-[21px] w-3 h-3 rounded-full border-2 bg-background"
                style={{ borderColor: routeColor }}
              />
              <p className="text-xs font-medium">{route.depotName || depot?.name || "Depo"} (Donus)</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rota Toplam Maliyeti</span>
            <span className="font-bold text-sm">{(totalCost || 0).toLocaleString("tr-TR")} TL</span>
          </div>
        </div>
      )}
    </div>
  )
}
