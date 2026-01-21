"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Truck,
  Package,
  Route,
  Clock,
  MapPin,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Timer,
  BarChart3,
  Activity,
  TrendingUp,
  CloudOff,
} from "lucide-react"
import { DashboardMap } from "@/components/dashboard/map"
import { getOptimizedRoutes, type StoredRouteData } from "@/lib/route-store"
import Link from "next/link"
import { useCustomers, useVehicles, useDepots } from "@/lib/hooks/use-depot-data"

export function DashboardOverview() {
  const [routeData, setRouteData] = useState<StoredRouteData | null>(null)
  const [dbRoutes, setDbRoutes] = useState<any[]>([])
  
  const { data: customers } = useCustomers()
  const { data: vehicles } = useVehicles()
  const { data: depots } = useDepots()

  useEffect(() => {
    // Fetch routes from database
    const fetchDbRoutes = async () => {
      try {
        const response = await fetch("/api/routes")
        if (response.ok) {
          const routes = await response.json()
          console.log("[v0] Dashboard loaded routes from database:", routes.length)
          setDbRoutes(routes)
        }
      } catch (error) {
        console.error("[v0] Failed to load routes from database:", error)
      }
    }

    fetchDbRoutes()

    // Also check localStorage for backward compatibility
    try {
      const data = getOptimizedRoutes()
      setRouteData(data)
    } catch (error) {
      console.error("Error loading route data:", error)
    }

    const handleRoutesUpdated = (event: CustomEvent) => {
      setRouteData(event.detail)
      fetchDbRoutes() // Refresh from database
    }

    window.addEventListener("routes-updated", handleRoutesUpdated as EventListener)
    return () => window.removeEventListener("routes-updated", handleRoutesUpdated as EventListener)
  }, [])

  const customersList = customers || []
  const vehiclesList = vehicles || []
  const depotsList = depots || []

  // Prefer database routes over localStorage
  const activeRoutes = dbRoutes.length > 0 ? dbRoutes : (routeData?.routes || [])
  
  // Calculate stats from database routes
  const dbStats = dbRoutes.reduce((acc, route) => {
    acc.totalDistance += parseFloat(route.total_distance || route.distance_km || 0)
    acc.totalDuration += parseInt(route.total_duration || route.total_duration_min || 0)
    acc.totalCost += parseFloat(route.total_cost || 0)
    return acc
  }, { totalDistance: 0, totalDuration: 0, totalCost: 0 })

  const stats = {
    totalRoutes: dbRoutes.length > 0 ? dbRoutes.length : (routeData?.summary?.totalRoutes || routeData?.routes?.length || 0),
    totalDistance: dbRoutes.length > 0 ? dbStats.totalDistance : (routeData?.summary?.totalDistance || 0),
    totalDuration: dbRoutes.length > 0 ? dbStats.totalDuration : (routeData?.summary?.totalDuration || 0),
    totalCost: dbRoutes.length > 0 ? dbStats.totalCost : (routeData?.summary?.totalCost || 0),
    totalDepots: depotsList.length,
    totalVehicles: vehiclesList.length,
    availableVehicles: vehiclesList.filter((v: any) => v.status === "available").length,
    totalCustomers: customersList.length,
    pendingCustomers: customersList.filter((c: any) => c.status === "pending").length,
  }

  const optimizedAt = routeData?.optimizedAt ? new Date(routeData.optimizedAt) : null

  const routeStatusBreakdown =
    activeRoutes.reduce(
      (acc, route) => {
        const status = route.status || "pending"
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

  const completedRoutes = routeStatusBreakdown["completed"] || 0
  const inProgressRoutes = routeStatusBreakdown["in_progress"] || 0
  const pendingRoutes = routeStatusBreakdown["pending"] || stats.totalRoutes

  const getProviderLabel = () => {
    if (!routeData?.provider) return null
    if (routeData.provider === "openrouteservice") {
      return { label: "ORS API", icon: Activity, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
    }
    return { label: "Lokal Algoritma", icon: CloudOff, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
  }

  const providerInfo = getProviderLabel()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {optimizedAt
              ? `Son optimizasyon: ${optimizedAt.toLocaleDateString("tr-TR")} ${optimizedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`
              : "Henuz optimizasyon yapilmadi - Rotalarinizi optimize etmek icin baslatin"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {providerInfo && (
            <Badge variant="outline" className={`gap-1.5 py-1.5 px-3 ${providerInfo.color}`}>
              <providerInfo.icon className="h-3.5 w-3.5" />
              {providerInfo.label}
            </Badge>
          )}
          <Link href="/optimize">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Zap className="h-4 w-4" />
              Optimize Et
            </Button>
          </Link>
        </div>
      </div>

      {!routeData && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Henuz rota optimizasyonu yapilmadi</p>
              <p className="text-sm text-amber-700">
                Rotalari optimize etmek icin "Optimize Et" butonuna tiklayin. Optimize edildiginde burada aktif rotalar,
                mesafe, sure ve maliyet bilgileri gorunecek.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Routes */}
        <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Aktif Rotalar</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalRoutes}</p>
                <p className="text-emerald-100 text-xs mt-2">
                  {routeData ? `${completedRoutes} tamamlandi` : "Optimize edilmedi"}
                </p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Route className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
          </CardContent>
        </Card>

        {/* Total Distance */}
        <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Toplam Mesafe</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalDistance.toFixed(0)}</p>
                <p className="text-blue-100 text-xs mt-2">kilometre</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
          </CardContent>
        </Card>

        {/* Total Duration */}
        <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Toplam Sure</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {Math.floor(stats.totalDuration / 60)}
                  <span className="text-lg font-normal">s</span> {stats.totalDuration % 60}
                  <span className="text-lg font-normal">dk</span>
                </p>
                <p className="text-amber-100 text-xs mt-2">tahmini surus</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <Timer className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-violet-500 to-purple-600">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">Toplam Maliyet</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats.totalCost.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
                  <span className="text-lg font-normal ml-1">TL</span>
                </p>
                <p className="text-violet-100 text-xs mt-2">tahmini maliyet</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              <p className="text-xs text-muted-foreground">Toplam Siparis</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Truck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats.availableVehicles}
                <span className="text-sm text-muted-foreground font-normal">/{stats.totalVehicles}</span>
              </p>
              <p className="text-xs text-muted-foreground">Musait Arac</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <MapPin className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalDepots}</p>
              <p className="text-xs text-muted-foreground">Depo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingCustomers}</p>
              <p className="text-xs text-muted-foreground">Bekleyen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <Card className="border shadow-sm overflow-hidden h-[450px]">
            <CardHeader className="p-4 pb-0 flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Canli Harita
              </CardTitle>
              <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Canli
              </Badge>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-56px)]">
              <DashboardMap />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Route Performance */}
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Rota Performansi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Completed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Tamamlanan
                  </span>
                  <span className="font-medium">
                    {completedRoutes} / {stats.totalRoutes || "-"}
                  </span>
                </div>
                <Progress
                  value={stats.totalRoutes > 0 ? (completedRoutes / stats.totalRoutes) * 100 : 0}
                  className="h-2 bg-muted"
                />
              </div>

              {/* In Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Timer className="h-3.5 w-3.5 text-blue-500" />
                    Devam Eden
                  </span>
                  <span className="font-medium">{inProgressRoutes}</span>
                </div>
                <Progress
                  value={stats.totalRoutes > 0 ? (inProgressRoutes / stats.totalRoutes) * 100 : 0}
                  className="h-2 bg-muted"
                />
              </div>

              {/* Pending */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Bekleyen
                  </span>
                  <span className="font-medium">{pendingRoutes}</span>
                </div>
                <Progress
                  value={stats.totalRoutes > 0 ? (pendingRoutes / stats.totalRoutes) * 100 : 0}
                  className="h-2 bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-semibold">Hizli Islemler</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Link href="/optimize" className="block">
                <Button className="w-full justify-between group bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Rotalari Optimize Et
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/map" className="block">
                <Button variant="outline" className="w-full justify-between group bg-transparent" size="sm">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Harita Gorunumu
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/vehicles" className="block">
                <Button variant="outline" className="w-full justify-between group bg-transparent" size="sm">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Arac Yonetimi
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/orders" className="block">
                <Button variant="outline" className="w-full justify-between group bg-transparent" size="sm">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Siparis Listesi
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Routes */}
          {routeData?.routes && routeData.routes.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-emerald-600" />
                    Son Rotalar
                  </span>
                  <Link href="/map">
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                      Tumu
                    </Badge>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {routeData.routes.slice(0, 4).map((route, index) => {
                    const vehiclePlate =
                      (route as any).vehicle_plate || (route as any).vehiclePlate || `Arac ${index + 1}`
                    const depotName = (route as any).depot_name || (route as any).depotName || "Depo"
                    const distance = (route as any).total_distance_km || (route as any).distance || 0
                    const stopsCount = route.stops?.length || 0

                    return (
                      <div
                        key={route.id || index}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{vehiclePlate}</p>
                            <p className="text-xs text-muted-foreground">{depotName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{distance.toFixed(1)} km</p>
                          <p className="text-xs text-muted-foreground">{stopsCount} durak</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
