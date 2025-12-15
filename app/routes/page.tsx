"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoutesMap } from "@/components/routes/routes-map"
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
  const [viewMode, setViewMode] = useState<"map" | "list">("list")
  const [lastOptimization, setLastOptimization] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [selectedDepot])

  const fetchData = async () => {
    setLoading(true)

    const result = getOptimizationResult()

    if (result && result.routes && result.routes.length > 0) {
      // Optimize sonuclari mevcut
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

      // Depo filtreleme
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Rotalar</h1>
            <p className="text-sm text-slate-500">
              {lastOptimization ? `Son optimizasyon: ${lastOptimization}` : "Henuz optimizasyon yapilmadi"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedDepot} onValueChange={setSelectedDepot}>
              <SelectTrigger className="w-48 bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Depo secin" />
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
            <div className="flex rounded-lg border border-slate-200 bg-white">
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className={viewMode === "map" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                Harita
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                Liste
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={fetchData} className="bg-white">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Truck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Toplam Rota</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalRoutes}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-blue-100">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Toplam Mesafe</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalDistance.toFixed(1)} km</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ort. Sure</p>
                <p className="text-2xl font-bold text-slate-900">{Math.round(stats.avgDuration)} dk</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TrendingDown className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Toplam Maliyet</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalCost.toLocaleString("tr-TR")} TL</p>
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
              <p className="text-slate-500 mb-6">
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
          <div className="flex flex-1 min-h-[500px]">
            {viewMode === "map" ? (
              <>
                <div className="flex-1 min-h-[500px]">
                  <RoutesMap
                    routes={routes as any}
                    depots={depots}
                    selectedRoute={selectedRoute as any}
                    onRouteSelect={setSelectedRoute as any}
                  />
                </div>
                {selectedRoute && (
                  <div className="w-96 border-l border-slate-200 overflow-y-auto bg-white max-h-[calc(100vh-300px)]">
                    <RouteDetails route={selectedRoute as any} onClose={() => setSelectedRoute(null)} />
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 p-4 bg-slate-50 overflow-auto">
                <div className="grid gap-4">
                  {routes.map((route, index) => (
                    <Card
                      key={route.id}
                      className={`border cursor-pointer transition-all hover:shadow-md ${
                        selectedRoute?.id === route.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200"
                      }`}
                      onClick={() => setSelectedRoute(route)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: `hsl(${(index * 45) % 360}, 70%, 50%)` }}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{route.vehicle_plate}</h3>
                              <p className="text-sm text-slate-500">{route.depot_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-lg font-bold text-slate-900">
                                {route.total_distance_km.toFixed(1)} km
                              </p>
                              <p className="text-xs text-slate-500">Mesafe</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-slate-900">
                                {Math.round(route.total_duration_min)} dk
                              </p>
                              <p className="text-xs text-slate-500">Sure</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-slate-900">{route.stops.length}</p>
                              <p className="text-xs text-slate-500">Durak</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-emerald-600">
                                {route.total_cost.toLocaleString("tr-TR")} TL
                              </p>
                              <p className="text-xs text-slate-500">Maliyet</p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                route.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : route.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {route.status === "completed"
                                ? "Tamamlandi"
                                : route.status === "in_progress"
                                  ? "Devam Ediyor"
                                  : "Bekliyor"}
                            </span>
                          </div>
                        </div>

                        {/* Durak listesi */}
                        {selectedRoute?.id === route.id && route.stops.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">Duraklar:</p>
                            <div className="flex flex-wrap gap-2">
                              {route.stops.map((stop, idx) => (
                                <span key={stop.id} className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-600">
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
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
