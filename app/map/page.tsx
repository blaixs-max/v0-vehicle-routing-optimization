"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FullscreenMap } from "@/components/map/fullscreen-map"
import { supabase } from "@/lib/supabase/client"
import { mockDepots, mockVehicles, mockCustomers, mockRoutes, type MockRoute } from "@/lib/mock-data"
import {
  getOptimizedRoutes,
  updateRouteStatus,
  approveAllRoutes,
  type StoredRouteData,
  type RouteStatus,
} from "@/lib/route-store"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Route,
  Truck,
  Clock,
  MapPin,
  Fuel,
  Package,
  Navigation,
  AlertCircle,
  CheckCircle,
  Play,
  Square,
  MoreVertical,
  CheckCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function MapPage() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<MockRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<MockRoute | null>(null)
  const [showRoutePanel, setShowRoutePanel] = useState(true)
  const [optimizedData, setOptimizedData] = useState<StoredRouteData | null>(null)

  useEffect(() => {
    fetchData()
    loadOptimizedRoutes()

    const handleRoutesUpdate = (event: CustomEvent<StoredRouteData | null>) => {
      if (event.detail) {
        setOptimizedData(event.detail)
        setRoutes(event.detail.routes || [])
      } else {
        setOptimizedData(null)
        setRoutes(mockRoutes)
      }
    }

    window.addEventListener("routes-updated", handleRoutesUpdate as EventListener)
    return () => {
      window.removeEventListener("routes-updated", handleRoutesUpdate as EventListener)
    }
  }, [])

  const loadOptimizedRoutes = () => {
    try {
      const stored = getOptimizedRoutes()
      if (stored && stored.routes && stored.routes.length > 0) {
        setOptimizedData(stored)
        setRoutes(stored.routes)
      }
    } catch (error) {
      console.error("Error loading optimized routes:", error)
    }
  }

  const fetchData = async () => {
    if (!supabase) {
      setDepots(mockDepots as Depot[])
      setVehicles(mockVehicles as Vehicle[])
      setCustomers(mockCustomers as Customer[])
      const stored = getOptimizedRoutes()
      if (!stored || !stored.routes || stored.routes.length === 0) {
        setRoutes(mockRoutes)
      }
      setIsDemo(true)
      setLoading(false)
      return
    }

    try {
      const [depotsRes, vehiclesRes, customersRes] = await Promise.all([
        supabase.from("depots").select("*").eq("status", "active"),
        supabase.from("vehicles").select("*").eq("status", "active"),
        supabase.from("customers").select("*").eq("status", "active"),
      ])

      if (depotsRes.data) setDepots(depotsRes.data)
      if (vehiclesRes.data) setVehicles(vehiclesRes.data)
      if (customersRes.data) setCustomers(customersRes.data)

      const stored = getOptimizedRoutes()
      if (!stored || !stored.routes || stored.routes.length === 0) {
        setRoutes(mockRoutes)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setDepots(mockDepots as Depot[])
      setVehicles(mockVehicles as Vehicle[])
      setCustomers(mockCustomers as Customer[])
      const stored = getOptimizedRoutes()
      if (!stored || !stored.routes || stored.routes.length === 0) {
        setRoutes(mockRoutes)
      }
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (routeId: string, newStatus: RouteStatus) => {
    updateRouteStatus(routeId, newStatus)
  }

  const handleApproveAll = () => {
    approveAllRoutes()
  }

  const getVehicleByRoute = (route: MockRoute) => {
    return vehicles.find((v) => v.id === route.vehicle_id) || mockVehicles.find((v) => v.id === route.vehicle_id)
  }

  const getDepotByRoute = (route: MockRoute) => {
    return depots.find((d) => d.id === route.depot_id) || mockDepots.find((d) => d.id === route.depot_id)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-blue-500"
      case "in_progress":
        return "bg-emerald-500"
      case "completed":
        return "bg-slate-500"
      case "cancelled":
        return "bg-red-500"
      case "pending":
      default:
        return "bg-amber-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Onaylandi"
      case "in_progress":
        return "Yolda"
      case "completed":
        return "Tamamlandi"
      case "cancelled":
        return "Iptal"
      case "pending":
      default:
        return "Bekliyor"
    }
  }

  const pendingCount = routes.filter((r) => r.status === "pending").length

  const summaryData = {
    totalRoutes: optimizedData?.summary?.totalRoutes || routes.length || 0,
    totalDistance: optimizedData?.summary?.totalDistance || 0,
    totalCost: optimizedData?.summary?.totalCost || 0,
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Harita Gorunumu</h1>
            <p className="text-sm text-slate-500">
              {optimizedData
                ? `Son optimizasyon: ${new Date(optimizedData.optimizedAt).toLocaleString("tr-TR")} (${optimizedData.provider})`
                : isDemo
                  ? "Demo modu - Ornek veriler gosteriliyor"
                  : "Tum depo, arac ve musteri konumlarini goruntuleyin"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {pendingCount > 0 && (
              <Button size="sm" onClick={handleApproveAll} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <CheckCheck className="w-4 h-4" />
                Tumunu Onayla ({pendingCount})
              </Button>
            )}
            <Badge variant="outline" className="gap-2 bg-blue-50 text-blue-700 border-blue-200">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              {depots.length} Depo
            </Badge>
            <Badge variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {vehicles.length} Arac
            </Badge>
            <Badge variant="outline" className="gap-2 bg-orange-50 text-orange-700 border-orange-200">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              {customers.length} Musteri
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "gap-2",
                optimizedData
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-purple-50 text-purple-700 border-purple-200",
              )}
            >
              <Route className="w-3 h-3" />
              {routes.length} Rota {optimizedData && "(Optimize)"}
            </Badge>
          </div>
        </div>

        {optimizedData && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-sm text-emerald-700 shrink-0">
            <AlertCircle className="w-4 h-4" />
            <span>
              <strong>{summaryData.totalRoutes}</strong> rota,
              <strong> {summaryData.totalDistance.toFixed(1)}</strong> km,
              <strong> {summaryData.totalCost.toLocaleString("tr-TR")}</strong> TL - Optimize sayfasindan gelen sonuclar
              gosteriliyor
            </span>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Route Panel */}
          {showRoutePanel && (
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col min-h-0">
              <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Route className="w-4 h-4" />
                  {optimizedData ? "Optimize Edilmis Rotalar" : "Aktif Rotalar"}
                </h2>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-2">
                  {routes.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">Henuz rota olusturulmadi</div>
                  ) : (
                    routes.map((route) => {
                      const vehicle = getVehicleByRoute(route)
                      const depot = getDepotByRoute(route)
                      const isSelected = selectedRoute?.id === route.id

                      return (
                        <Card
                          key={route.id}
                          className={cn(
                            "p-3 cursor-pointer transition-all hover:shadow-md",
                            isSelected ? "ring-2 ring-emerald-500 bg-emerald-50" : "hover:bg-slate-50",
                          )}
                          onClick={() => setSelectedRoute(isSelected ? null : route)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-slate-600" />
                              <span className="font-medium text-sm">{vehicle?.plate || "Arac"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge className={cn("text-xs text-white", getStatusColor(route.status))}>
                                {getStatusText(route.status)}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  {route.status === "pending" && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(route.id, "approved")}>
                                      <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                                      Onayla
                                    </DropdownMenuItem>
                                  )}
                                  {(route.status === "pending" || route.status === "approved") && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(route.id, "in_progress")}>
                                      <Play className="w-4 h-4 mr-2 text-emerald-500" />
                                      Yola Cikart
                                    </DropdownMenuItem>
                                  )}
                                  {route.status === "in_progress" && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(route.id, "completed")}>
                                      <Square className="w-4 h-4 mr-2 text-slate-500" />
                                      Tamamla
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {route.status !== "cancelled" && route.status !== "completed" && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(route.id, "cancelled")}
                                      className="text-red-600"
                                    >
                                      <Square className="w-4 h-4 mr-2" />
                                      Iptal Et
                                    </DropdownMenuItem>
                                  )}
                                  {(route.status === "cancelled" || route.status === "completed") && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(route.id, "pending")}>
                                      <AlertCircle className="w-4 h-4 mr-2 text-amber-500" />
                                      Beklemeye Al
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 mb-2">{depot?.name || "Depo"}</div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Navigation className="w-3 h-3" />
                              {route.total_distance_km?.toFixed(1) || 0} km
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <Clock className="w-3 h-3" />
                              {route.total_duration_min || 0} dk
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3 h-3" />
                              {route.stops?.length || 0} durak
                            </div>
                          </div>

                          {isSelected && route.stops && route.stops.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="text-xs font-medium text-slate-700 mb-2">Duraklar:</div>
                              <div className="space-y-2">
                                {route.stops.map((stop, index) => (
                                  <div key={stop.customer_id} className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                                        index === 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600",
                                      )}
                                    >
                                      {stop.order}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">{stop.customer_name}</div>
                                      <div className="text-xs text-slate-400">{stop.arrival_time}</div>
                                    </div>
                                    {index === 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-600 border-emerald-200"
                                      >
                                        Sirada
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1 text-slate-600">
                                  <Fuel className="w-3 h-3" />
                                  Yakit: {(route.fuel_cost || 0).toLocaleString("tr-TR")} TL
                                </div>
                                <div className="flex items-center gap-1 text-slate-600">
                                  <Package className="w-3 h-3" />
                                  Toplam: {(route.total_cost || 0).toLocaleString("tr-TR")} TL
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Map */}
          <div className="flex-1 relative min-h-0">
            <FullscreenMap
              depots={depots}
              vehicles={vehicles}
              customers={customers}
              routes={routes}
              selectedRoute={selectedRoute}
              loading={loading}
            />

            {/* Toggle Route Panel Button */}
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 left-4 z-[1000] shadow-lg"
              onClick={() => setShowRoutePanel(!showRoutePanel)}
            >
              <Route className="w-4 h-4 mr-1" />
              {showRoutePanel ? "Paneli Gizle" : "Rotalari Goster"}
            </Button>

            {/* Selected Route Info */}
            {selectedRoute && (
              <Card className="absolute bottom-4 left-4 right-4 z-[1000] p-4 bg-white/95 backdrop-blur shadow-lg max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold">{getVehicleByRoute(selectedRoute)?.plate || "Arac"}</div>
                      <div className="text-sm text-slate-500">{getDepotByRoute(selectedRoute)?.name || "Depo"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-lg text-emerald-600">
                        {(selectedRoute.total_distance_km || 0).toFixed(1)}
                      </div>
                      <div className="text-slate-500 text-xs">Kilometre</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-blue-600">{selectedRoute.total_duration_min || 0}</div>
                      <div className="text-slate-500 text-xs">Dakika</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-purple-600">{selectedRoute.stops?.length || 0}</div>
                      <div className="text-slate-500 text-xs">Durak</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-amber-600">
                        {(selectedRoute.total_cost || 0).toLocaleString("tr-TR")}
                      </div>
                      <div className="text-slate-500 text-xs">TL Maliyet</div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
