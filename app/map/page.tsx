"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockRoutes, type MockRoute } from "@/lib/mock-data"
import { useToast } from "@/components/ui/toast-provider"
import {
  getOptimizedRoutes,
  updateRouteStatus,
  approveAllRoutes,
  deleteRoute,
  type StoredRouteData,
  type RouteStatus,
} from "@/lib/route-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Search,
  Filter,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCustomers, useVehicles, useDepots } from "@/lib/hooks/use-depot-data"
import useSWR from "swr"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"
import FullscreenMap from "@/components/map/fullscreen-map"
import { mutate } from "swr"

export default function MapPage() {
  const searchParams = useSearchParams()
  const { data: depotsData, isLoading: depotsLoading } = useDepots()
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles()
  const { data: customersData, isLoading: customersLoading } = useCustomers()
  
  // Map page should show ALL routes from ALL depots, not filtered
  const { data: savedRoutesData, mutate: mutateRoutes } = useSWR("/api/routes", async (url) => {
    const res = await fetch(url)
    return res.json()
  }, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  })
  
  const [routes, setRoutes] = useState<MockRoute[]>([])
  const [selectedRoute, setSelectedRoute] = useState<MockRoute | null>(null)
  const [showRoutePanel, setShowRoutePanel] = useState(true)
  const [optimizedData, setOptimizedData] = useState<StoredRouteData | null>(null)
  const [mobileView, setMobileView] = useState<"list" | "map">("list")
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepot, setFilterDepot] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const loading = depotsLoading || vehiclesLoading || customersLoading
  const depots = depotsData || []
  const vehicles = vehiclesData || []
  const customers = customersData || []

  useEffect(() => {
    // Load saved routes from database (highest priority)
    if (savedRoutesData && savedRoutesData.length > 0) {
      console.log("[v0] Loading saved routes from database:", savedRoutesData.length)
      console.log("[v0] First route sample:", savedRoutesData[0])
      
      const formattedRoutes = savedRoutesData.map((r: any) => {
        // Database uses total_distance_km, total_duration_min fields
        const distanceKm = parseFloat(r.total_distance_km) || parseFloat(r.distance_km) || 0
        const drivingDurationMin = parseInt(r.total_duration_min) || parseInt(r.total_duration) || 0
        const stops = r.stops || []
        // Calculate service duration from each stop's individual service time
        const serviceDurationMin = stops.reduce((sum, stop: any) => sum + (stop.serviceDuration || 45), 0)
        const durationMin = drivingDurationMin + serviceDurationMin
        const totalCost = parseFloat(r.total_cost) || 0
        const fuelCost = parseFloat(r.fuel_cost) || 0
        
        // Map stops and add depot return as final stop
        const mappedStops = stops.map((s: any, idx: number) => ({
          customerId: s.customer_id,
          customerName: s.customer_name,
          orderId: s.order_id, // Order ID for status updates
          location: { lat: parseFloat(s.lat) || 0, lng: parseFloat(s.lng) || 0 },
          demand: Number(s.demand) || 0, // Individual demand from orders table
          stopOrder: s.stop_order || idx + 1,
          cumulativeLoad: s.cumulative_load_pallets || 0,
          distanceFromPrev: parseFloat(s.distance_from_prev_km) || 0,
          durationFromPrev: parseInt(s.duration_from_prev_min) || 0,
          arrivalTime: s.arrival_time,
          serviceDuration: Number(s.service_duration_minutes) || 45,
        }))
        
        // Add depot return as final stop with calculated distance
        const depot = depotsData?.find((d: any) => d.id === r.depot_id)
        if (depot && mappedStops.length > 0) {
          const lastStop = mappedStops[mappedStops.length - 1]
          
          // Calculate distance from last stop to depot using Haversine formula
          const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
            const R = 6371 // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180
            const dLng = (lng2 - lng1) * Math.PI / 180
            const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return R * c
          }
          
          const returnDistance = calculateDistance(
            lastStop.location.lat,
            lastStop.location.lng,
            parseFloat(depot.lat),
            parseFloat(depot.lng)
          )
          
          mappedStops.push({
            customerId: `depot-${r.depot_id}`,
            customerName: `${r.depot_name || depot.name} (Dönüş)`,
            location: { lat: parseFloat(depot.lat), lng: parseFloat(depot.lng) },
            demand: 0,
            stopOrder: mappedStops.length + 1,
            cumulativeLoad: 0,
            distanceFromPrev: returnDistance,
            durationFromPrev: Math.round(returnDistance * 1.5), // Approximate: ~1.5 min per km
            arrivalTime: null,
          })
        }
        
        return {
          id: r.id,
          vehicle_id: r.vehicle_id,
          plate: r.vehicle_plate || "Unknown",
          vehicle_type: r.vehicle_type || 1,
          depot_id: r.depot_id,
          depot_name: r.depot_name || "Unknown Depot",
          stops: mappedStops,
          distance_km: distanceKm,
          total_distance: distanceKm,
          total_duration: durationMin,
          total_cost: totalCost,
          fuel_cost: fuelCost,
          total_pallets: parseInt(r.total_pallets) || 0,
          geometry: r.geometry || null,
          status: r.status || "pending",
        }
      })
      
      console.log("[v0] Formatted routes:", formattedRoutes.length, "routes")
      console.log("[v0] First formatted route:", formattedRoutes[0])
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

  const { showToast } = useToast()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null)

  const handleStatusChange = async (routeId: string, newStatus: RouteStatus) => {
    try {
      console.log("[v0] Updating route status:", routeId, "to", newStatus)
      
      // Find route before updating
      const route = routes.find((r) => r.id === routeId)
      console.log("[v0] Route found:", route?.id, "stops count:", route?.stops?.length)
      
      // Update route status in database
      const response = await fetch("/api/routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: routeId, status: newStatus }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Route status update failed:", response.status, errorText)
        throw new Error(`Failed to update route status: ${errorText}`)
      }

      const updatedRoute = await response.json()
      console.log("[v0] Route status updated:", updatedRoute.id)

      // Update local state
      updateRouteStatus(routeId, newStatus)

      // Update orders status if route is approved/in_progress/completed
      if (["approved", "in_progress", "completed"].includes(newStatus)) {
        console.log("[v0] Updating orders for route status:", newStatus)
        // Map route status to order status (routes use in_progress, orders use in_transit)
        const orderStatus = newStatus === "in_progress" ? "in_transit" : newStatus
        await updateOrdersStatus(routeId, orderStatus)
      }

      // Refresh routes from database
      mutate("/api/routes")

      showToast("success", "Rota Güncellendi", `Rota durumu "${getStatusText(newStatus)}" olarak değiştirildi`)
    } catch (error) {
      console.error("[v0] Failed to update route status:", error)
      showToast("error", "Güncelleme Başarısız", error instanceof Error ? error.message : "Rota durumu güncellenemedi")
    }
  }

  const updateOrdersStatus = async (routeId: string, routeStatus: string) => {
    try {
      // Orders now use same status as routes (both use in_progress)
      const orderStatus = routeStatus

      // Get route stops to find order IDs
      const route = routes.find((r) => r.id === routeId)
      console.log("[v0] updateOrdersStatus - route found:", !!route, "stops:", route?.stops?.length)
      
      if (!route || !route.stops) {
        console.log("[v0] updateOrdersStatus - no route or stops found")
        return
      }

      // Debug: check first few stops structure
      console.log("[v0] updateOrdersStatus - first stop sample:", JSON.stringify(route.stops[0]))

      // Extract order IDs from stops
      const orderIds = route.stops.map((stop: any) => stop.orderId).filter(Boolean)

      if (orderIds.length === 0) {
        console.log("[v0] No order IDs found in route stops:", routeId)
        console.log("[v0] Stops structure:", route.stops.map(s => ({ customerId: s.customerId, orderId: s.orderId })))
        return
      }

      console.log("[v0] Updating orders:", orderIds, "to status:", orderStatus)

      // Update all orders for this route
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderIds, status: orderStatus }),
      })

      if (response.ok) {
        console.log("[v0] Orders status updated for route:", routeId)
      } else {
        const errorText = await response.text()
        console.error("[v0] Order status update failed:", response.status, errorText)
      }
    } catch (error) {
      console.error("[v0] Failed to update orders status:", error)
    }
  }

  const handleDeleteRoute = (routeId: string) => {
    setRouteToDelete(routeId)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteRoute = async () => {
    if (!routeToDelete) return

    try {
      console.log("[v0] Deleting route:", routeToDelete)

      const response = await fetch(`/api/routes?id=${routeToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete route")
      }

      console.log("[v0] Route deleted successfully")

      // Remove from local state
      setRoutes((prev) => prev.filter((r) => r.id !== routeToDelete))

      // Clear selection if deleted route was selected
      if (selectedRoute?.id === routeToDelete) {
        setSelectedRoute(null)
      }

      // Refresh routes from database
      mutate()

      showToast("success", "Rota Silindi", "Rota başarıyla silindi")
    } catch (error) {
      console.error("[v0] Failed to delete route:", error)
      showToast("error", "Silme Başarısız", "Rota silinemedi")
    } finally {
      setDeleteConfirmOpen(false)
      setRouteToDelete(null)
    }
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

  // Apply filters
  const filteredRoutes = routes.filter((route) => {
    // Search filter (plate, depot name, customer names)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesPlate = route.plate?.toLowerCase().includes(query)
      const matchesDepot = getDepotByRoute(route)?.name?.toLowerCase().includes(query)
      const matchesCustomer = route.stops?.some((stop: any) => 
        stop.customerName?.toLowerCase().includes(query)
      )
      if (!matchesPlate && !matchesDepot && !matchesCustomer) return false
    }
    
    // Depot filter
    if (filterDepot !== "all" && route.depot_id !== filterDepot) return false
    
    // Status filter
    if (filterStatus !== "all" && route.status !== filterStatus) return false
    
    return true
  })

  const pendingCount = filteredRoutes.filter((r) => r.status === "pending").length

  const summaryData = {
    totalRoutes: optimizedData?.summary?.totalRoutes || filteredRoutes.length || 0,
    totalDistance: optimizedData?.summary?.totalDistance || 0,
    totalCost: optimizedData?.summary?.totalCost || 0,
  }

  return (
    <>
    <DashboardLayout>
      <Suspense fallback={<Loading />}>
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

          {/* Filter Bar */}
          <div className="px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Plaka, depo veya müşteri ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Select value={filterDepot} onValueChange={setFilterDepot}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Tüm Depolar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Depolar</SelectItem>
                    {depots.map((depot: any) => (
                      <SelectItem key={depot.id} value={depot.id}>
                        {depot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durum</SelectItem>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="approved">Onaylandı</SelectItem>
                    <SelectItem value="in_progress">Yolda</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || filterDepot !== "all" || filterStatus !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setFilterDepot("all")
                    setFilterStatus("all")
                  }}
                  className="h-9 px-3"
                >
                  <X className="w-4 h-4 mr-1" />
                  Temizle
                </Button>
              )}
            </div>
            
            {routes.length > 0 && (
              <div className="mt-2 text-xs text-slate-500">
                {filteredRoutes.length} / {routes.length} rota gösteriliyor
              </div>
            )}
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
                  ) : filteredRoutes.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">Filtreye uygun rota bulunamadı</div>
                  ) : (
                    filteredRoutes.map((route) => {
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
                          {route.id && (
                            <div className="text-xs text-muted-foreground mb-1 font-mono">
                              ID: {route.id}
                            </div>
                          )}
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
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteRoute(route.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Rotayı Sil
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 mb-2">{depot?.name || "Depo"}</div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Navigation className="w-3 h-3" />
                              {(route.distance_km || route.total_distance || 0).toFixed(1)} km
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <Clock className="w-3 h-3" />
                              {route.total_duration || 0} dk
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
                                {route.stops.map((stop: any, index: number) => (
                                  <div key={stop.customerId || index} className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                                        index === 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600",
                                      )}
                                    >
                                      {stop.stopOrder || index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">{stop.customerName || "Durak"}</div>
                                      <div className="text-xs text-slate-400">
                                        {stop.distanceFromPrev > 0 && `+${stop.distanceFromPrev.toFixed(1)} km`}
                                        {stop.durationFromPrev > 0 && ` dk ${stop.durationFromPrev}`}
                                        {stop.demand > 0 && ` ${stop.demand} palet`}
                                      </div>
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
                routes={filteredRoutes}
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
      </Suspense>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotayı Sil</DialogTitle>
            <DialogDescription>
              Bu rotayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve rotaya ait tüm veriler kalıcı
              olarak silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRoute}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </>
  )
}
