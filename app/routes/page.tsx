"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoutesMap } from "@/components/routes/routes-map"
import { RoutesList } from "@/components/routes/routes-list"
import { RouteDetails } from "@/components/routes/route-details"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { mockDepots } from "@/lib/mock-data"
import type { Route, Depot } from "@/lib/types"
import { MapPin, Truck, Clock, TrendingDown, RefreshCw, Filter } from "lucide-react"

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [selectedDepot, setSelectedDepot] = useState<string>("all")
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedDepot])

  const fetchData = async () => {
    setLoading(true)

    if (!supabase) {
      setDepots(mockDepots as Depot[])
      setRoutes([])
      setIsDemo(true)
      setLoading(false)
      return
    }

    try {
      const { data: depotsData } = await supabase.from("depots").select("*").eq("status", "active")
      if (depotsData) setDepots(depotsData)

      let routesQuery = supabase
        .from("routes")
        .select(`*, vehicle:vehicles(*), depot:depots(*), stops:route_stops(*, customer:customers(*))`)
        .order("created_at", { ascending: false })

      if (selectedDepot !== "all") {
        routesQuery = routesQuery.eq("depot_id", selectedDepot)
      }

      const { data: routesData } = await routesQuery
      if (routesData) setRoutes(routesData)
    } catch (error) {
      console.error("Error fetching data:", error)
      setDepots(mockDepots as Depot[])
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
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
              {isDemo ? "Demo modu - Ornek veriler" : "Optimize edilmis rotalari goruntuле ve yonet"}
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
        <div className="flex flex-1 min-h-[500px]">
          {viewMode === "map" ? (
            <>
              <div className="flex-1 min-h-[500px]">
                <RoutesMap
                  routes={routes}
                  depots={depots}
                  selectedRoute={selectedRoute}
                  onRouteSelect={setSelectedRoute}
                />
              </div>
              {selectedRoute && (
                <div className="w-96 border-l border-slate-200 overflow-y-auto bg-white max-h-[calc(100vh-300px)]">
                  <RouteDetails route={selectedRoute} onClose={() => setSelectedRoute(null)} />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 p-4 bg-slate-50">
              <RoutesList routes={routes} selectedRoute={selectedRoute} onRouteSelect={setSelectedRoute} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
