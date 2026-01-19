"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FullscreenMap } from "@/components/map/fullscreen-map"
import { mockRoutes, type MockRoute } from "@/lib/mock-data"
import {
  getOptimizedRoutes,
  updateRouteStatus,
  approveAllRoutes,
  type StoredRouteData,
  type RouteStatus,
} from "@/lib/route-store"
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCustomers, useVehicles, useDepots, useRoutes } from "@/lib/hooks/use-depot-data"

export default function MapPage() {
  const { data: depotsData, isLoading: depotsLoading } = useDepots()
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles()
  const { data: customersData, isLoading: customersLoading } = useCustomers()
  const { data: savedRoutesData, mutate: mutateRoutes } = useRoutes()
  
  const [routes, setRoutes] = useState<MockRoute[]>([])
  const [selectedRoute, setSelectedRoute] = useState<MockRoute | null>(null)
  const [showRoutePanel, setShowRoutePanel] = useState(true)
  const [optimizedData, setOptimizedData] = useState<StoredRouteData | null>(null)
  const [mobileView, setMobileView] = useState<"list" | "map">("list")

  const loading = depotsLoading || vehiclesLoading || customersLoading
  const depots = depotsData || []
  const vehicles = vehiclesData || []
  const customers = customersData || []

  useEffect(() => {
    // Load saved routes from database (highest priority)
    if (savedRoutesData && savedRoutesData.length > 0) {
      console.log("[v0] Loading saved routes from database:", savedRoutesData.length)
      const formattedRoutes = savedRoutesData.map((r: any) => ({
        id: r.id,
        vehicle_id: r.vehicle_id,
        depot_id: r.depot_id,
        stops: [], // Will be loaded from route_stops table
        total_distance: r.total_distance || 0,
        total_duration: r.total_duration || 0,
        total_cost: r.total_cost || 0,
        status: r.status || "pending",
      }))
      setRoutes(formattedRoutes)
    } else {
      // Fallback to localStorage optimization results
      loadOptimizedRoutes()
    }

    const handleRoutesUpdate = (event: CustomEvent<StoredRouteData | null>) => {
      if (event.detail) {
        setOptimizedData(event.detail)
        setRoutes(event.detail.routes || [])
      } else {
        setOptimizedData(null)
        setRoutes(mockRoutes)
      }
      mutateRoutes()
    }

    window.addEventListener("routes-updated", handleRoutesUpdate as EventListener)
    return () => {
      window.removeEventListener("routes-updated", handleRoutesUpdate as EventListener)
    }
  }, [savedRoutesData, mutateRoutes])

  const loadOptimizedRoutes = () => {
    try {
      const stored = getOptimizedRoutes()
      if (stored && stored.routes && stored.routes.length > 0) {
        console.log("[v0] Loading optimized routes from localStorage:", stored.routes.length)
        setOptimizedData(stored)
        setRoutes(stored.routes)
      }
    } catch (error) {
      console.error("Error loading optimized routes:", error)
    }
  }

  const handleStatusChange = (routeId: string, newStatus: RouteStatus) => {
    updateRouteStatus(routeId, newStatus)
  }

  const handleApproveAll = () => {
    approveAllRoutes()
  }

  const getVehicleByRoute = (route: MockRoute) => {
    return vehicles.find((v: any) => v.id === route.vehicle_id)
  }

  const getDepotByRoute = (route: MockRoute) => {
    return depots.find((d: any) => d.id === route.depot_id)
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
        {/* Header - Mobil responsive header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-slate-200 bg-white shrink-0 gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Harita Gorunumu</h1>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-1">
              {optimizedData
                ? `Son: ${new Date(optimizedData.optimizedAt).toLocaleString("tr-TR")}`
                : "Tum konumlari goruntuleyin"}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <Button
              size="sm"
              variant={mobileView === "list" ? "default" : "outline"}
              onClick={() => setMobileView("list")}
              className={mobileView === "list" ? "bg-emerald-600" : ""}
            >
              Rotalar
            </Button>
            <Button
              size="sm"
              variant={mobileView === "map" ? "default" : "outline"}
              onClick={() => setMobileView("map")}
              className={mobileView === "map" ? "bg-emerald-600" : ""}
            >
              Harita
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {pendingCount > 0 && (
              <Button size="sm" onClick={handleApproveAll} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <CheckCheck className="w-4 h-4" />
                Tumunu Onayla ({pendingCount})
              </Button>
            )}
            <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              {depots.length} Depo
            </Badge>
            <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {vehicles.length} Arac
            </Badge>
            <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200 text-xs">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              {customers.length} Musteri
            </Badge>
          </div>
        </div>

        {optimizedData && (
          <div className="px-3 sm:px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs sm:text-sm text-emerald-700 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">
              <strong>{summaryData.totalRoutes}</strong> rota,
              <strong> {summaryData.totalDistance.toFixed(1)}</strong> km,
              <strong> {summaryData.totalCost.toLocaleString("tr-TR")}</strong> TL
            </span>
          </div>
        )}

        {/* Main Content - Mobil responsive layout */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Route Panel - Mobilde tam genislik veya gizli */}
          <div
            className={cn(
              "border-r border-slate-200 bg-white flex flex-col min-h-0",
              "w-full sm:w-80",
              mobileView !== "list" && "hidden sm:flex",
              !showRoutePanel && "sm:hidden",
            )}
          >
            <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                <Route className="w-4 h-4" />
                {optimizedData ? "Optimize Edilmis Rotalar" : "Aktif Rotalar"}
              </h2>
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleApproveAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs sm:hidden"
                >
                  <CheckCheck className="w-3 h-3" />
                  Onayla ({pendingCount})
                </Button>
              )}
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
                        onClick={() => {
                          setSelectedRoute(isSelected ? null : route)
                          if (!isSelected) setMobileView("map")
                        }}
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

          {/* Map - Mobilde mobileView="map" ise gorunur */}
          <div className={cn("flex-1 relative min-h-0", mobileView !== "map" && "hidden sm:block")}>
            <FullscreenMap
              depots={depots}
              vehicles={vehicles}
              customers={customers}
              routes={routes}
              selectedRoute={selectedRoute}
              loading={loading}
            />

            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 left-4 z-[1000] shadow-lg hidden sm:flex"
              onClick={() => setShowRoutePanel(!showRoutePanel)}
            >
              {showRoutePanel ? <ChevronLeft className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
              {showRoutePanel ? "Gizle" : "Rotalar"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 left-4 z-[1000] shadow-lg sm:hidden"
              onClick={() => setMobileView("list")}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Rotalar
            </Button>

            {selectedRoute && (
              <Card className="absolute bottom-4 left-4 right-4 z-[1000] p-3 sm:p-4 bg-white/95 backdrop-blur shadow-lg max-w-2xl mx-auto">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-sm sm:text-base">
                        {getVehicleByRoute(selectedRoute)?.plate || "Arac"}
                      </div>
                      <div className="text-xs text-slate-500">{getDepotByRoute(selectedRoute)?.name || "Depo"}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRoute(null)}>
                    <span className="text-xs">Kapat</span>
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
