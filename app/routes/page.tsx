"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RouteDetails } from "@/components/routes/route-details"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { mockDepots } from "@/lib/mock-data"
import { getOptimizationResult } from "@/lib/route-store"
import type { Depot } from "@/lib/types"
import { MapPin, Truck, Clock, TrendingDown, RefreshCw, Filter, AlertCircle } from "lucide-react"
import Link from "next/link"

interface RouteData {
  id: string
  vehicle_id: string
  vehicle_plate?: string
  depot_id: string
  depot_name?: string
  status: string
  total_distance_km: number
  total_duration_min: number
  total_cost: number
  stops: Array<{
    id: string
    sequence: number
    customer_id: string
    customer_name?: string
    lat?: number
    lng?: number
    address?: string
    demand?: number
    arrival_time?: string
  }>
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [selectedDepot, setSelectedDepot] = useState<string>("all")
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastOptimization, setLastOptimization] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<string>("map") // Declare viewMode and setViewMode

  useEffect(() => {
    fetchData()
  }, [selectedDepot])

  const fetchData = async () => {
    setLoading(true)

    const result = getOptimizationResult()

    if (result && result.routes && result.routes.length > 0) {
      const mappedRoutes: RouteData[] = result.routes.map((route: any, index: number) => ({
        id: route.id || `route-${index}`,
        vehicle_id: route.vehicle_id || `vehicle-${index}`,
        vehicle_plate: route.vehicle_plate || route.vehiclePlate || `Arac ${index + 1}`,
        depot_id: route.depot_id || "depot-1",
        depot_name: route.depot_name || route.depotName || "Ana Depo",
        status: route.status || "pending",
        total_distance_km: route.total_distance_km ?? route.distance ?? route.totalDistance ?? 0,
        total_duration_min: route.total_duration_min ?? route.duration ?? route.totalDuration ?? 0,
        total_cost: route.total_cost ?? route.cost ?? route.totalCost ?? 0,
        stops: (route.stops || []).map((stop: any, idx: number) => ({
          id: stop.id || `stop-${idx}`,
          sequence: stop.sequence || idx + 1,
          customer_id: stop.customer_id || stop.customerId || `customer-${idx}`,
          customer_name: stop.customer_name || stop.customerName || stop.name || `Musteri ${idx + 1}`,
          lat: stop.lat || stop.latitude,
          lng: stop.lng || stop.longitude,
          address: stop.address || "",
          demand: stop.demand || 0,
          arrival_time: stop.arrival_time || stop.arrivalTime,
        })),
      }))

      const filteredRoutes =
        selectedDepot === "all"
          ? mappedRoutes
          : mappedRoutes.filter((r) => r.depot_id === selectedDepot || r.depot_name === selectedDepot)

      setRoutes(filteredRoutes)
      setLastOptimization(result.optimizedAt ? new Date(result.optimizedAt).toLocaleString("tr-TR") : null)
    } else {
      setRoutes([])
    }

    setDepots(mockDepots as Depot[])
    setLoading(false)
  }

  const stats = {
    totalRoutes: routes.length,
    totalDistance: routes.reduce((sum, r) => sum + (r.total_distance_km || 0), 0),
    totalCost: routes.reduce((sum, r) => sum + (r.total_cost || 0), 0),
    avgDuration:
      routes.length > 0 ? routes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0) / routes.length : 0,
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-full">
        {/* Header - Mobil responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-slate-200 bg-white sticky top-0 z-10 gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Rotalar</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {lastOptimization ? `Son: ${lastOptimization}` : "Henuz optimizasyon yapilmadi"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Select value={selectedDepot} onValueChange={setSelectedDepot}>
              <SelectTrigger className="w-32 sm:w-48 bg-white text-sm">
                <Filter className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                <SelectValue placeholder="Depo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Depolar</SelectItem>
                {depots.map((depot) => (
                  <SelectItem key={depot.id} value={depot.id}>
                    {depot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} className="bg-white shrink-0">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats Cards - Mobilde 2x2 grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-500 truncate">Toplam Rota</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.totalRoutes}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-500 truncate">Mesafe</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.totalDistance.toFixed(0)} km</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-500 truncate">Ort. Sure</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{Math.round(stats.avgDuration)} dk</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-500 truncate">Maliyet</p>
                <p className="text-base sm:text-2xl font-bold text-slate-900">
                  {stats.totalCost.toLocaleString("tr-TR")} TL
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {routes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Henuz Rota Yok</h3>
              <p className="text-slate-500 mb-6 text-sm">
                Rotalari goruntulemek icin once Optimizasyon sayfasindan rota olusturun.
              </p>
              <Link href="/optimize">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Truck className="w-4 h-4 mr-2" />
                  Rotalari Optimize Et
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row flex-1 min-h-[500px]">
            <div className="flex-1 p-3 sm:p-4 bg-slate-50 overflow-auto">
              <div className="grid gap-3 sm:gap-4">
                {routes.map((route, index) => (
                  <Card
                    key={route.id}
                    className={`border cursor-pointer transition-all hover:shadow-md ${
                      selectedRoute?.id === route.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200"
                    }`}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0"
                            style={{ backgroundColor: `hsl(${(index * 45) % 360}, 70%, 50%)` }}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                              {route.vehicle_plate}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 truncate">{route.depot_name}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 sm:flex sm:items-center gap-3 sm:gap-6">
                          <div className="text-center">
                            <p className="text-sm sm:text-lg font-bold text-slate-900">
                              {route.total_distance_km.toFixed(0)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-500">km</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm sm:text-lg font-bold text-slate-900">
                              {Math.round(route.total_duration_min)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-500">dk</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm sm:text-lg font-bold text-slate-900">{route.stops.length}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500">durak</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm sm:text-lg font-bold text-emerald-600">
                              {route.total_cost.toLocaleString("tr-TR")}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-500">TL</p>
                          </div>
                        </div>
                      </div>

                      {selectedRoute?.id === route.id && route.stops.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-sm font-medium text-slate-700 mb-2">Duraklar:</p>
                          <div className="flex flex-wrap gap-2">
                            {route.stops.map((stop, idx) => (
                              <span
                                key={stop.id}
                                className="px-2 py-1 bg-slate-100 rounded text-xs sm:text-sm text-slate-600"
                              >
                                {idx + 1}. {stop.customer_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {selectedRoute && (
              <div className="flex-1 p-3 sm:p-4 bg-slate-50 overflow-auto">
                <RouteDetails route={selectedRoute} />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
