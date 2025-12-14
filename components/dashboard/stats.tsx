"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Package, Truck, Route, TrendingUp, TrendingDown, Clock, MapPin } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getMockStats } from "@/lib/mock-data"
import type { DashboardStats as StatsType } from "@/types/database"
import { cn } from "@/lib/utils"

export function DashboardStats() {
  const [stats, setStats] = useState<StatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      if (!isSupabaseConfigured()) {
        setStats(getMockStats())
        setUsingMock(true)
        setLoading(false)
        return
      }

      const supabase = createClient()
      if (!supabase) {
        setStats(getMockStats())
        setUsingMock(true)
        setLoading(false)
        return
      }

      try {
        const [
          { count: totalDepots },
          { count: totalVehicles },
          { count: availableVehicles },
          { count: totalCustomers },
          { count: pendingCustomers },
          { count: totalRoutes },
          routesData,
        ] = await Promise.all([
          supabase.from("depots").select("*", { count: "exact", head: true }),
          supabase.from("vehicles").select("*", { count: "exact", head: true }),
          supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "available"),
          supabase.from("customers").select("*", { count: "exact", head: true }),
          supabase.from("customers").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("routes").select("*", { count: "exact", head: true }),
          supabase.from("routes").select("total_distance_km, total_cost"),
        ])

        const totalDistance = routesData.data?.reduce((sum, r) => sum + (r.total_distance_km || 0), 0) || 0
        const totalCost = routesData.data?.reduce((sum, r) => sum + (r.total_cost || 0), 0) || 0

        setStats({
          totalDepots: totalDepots || 0,
          totalVehicles: totalVehicles || 0,
          availableVehicles: availableVehicles || 0,
          totalCustomers: totalCustomers || 0,
          pendingCustomers: pendingCustomers || 0,
          totalRoutes: totalRoutes || 0,
          todayRoutes: 0,
          totalDistance,
          totalCost,
        })
      } catch (error) {
        setStats(getMockStats())
        setUsingMock(true)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 w-20 bg-muted rounded mb-3" />
              <div className="h-7 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: "Toplam Sipariş",
      value: stats?.totalCustomers || 0,
      change: "+12%",
      changeType: "positive" as const,
      subtitle: `${stats?.pendingCustomers || 0} bekleyen`,
      icon: Package,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Aktif Araç",
      value: stats?.availableVehicles || 0,
      change: `/${stats?.totalVehicles || 0}`,
      changeType: "neutral" as const,
      subtitle: "Müsait araç",
      icon: Truck,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      title: "Planlı Rota",
      value: stats?.totalRoutes || 0,
      change: "-3%",
      changeType: "negative" as const,
      subtitle: "Bugünkü rotalar",
      icon: Route,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-600",
    },
    {
      title: "Toplam Mesafe",
      value: `${((stats?.totalDistance || 0) / 1000).toFixed(0)}K`,
      change: "km",
      changeType: "neutral" as const,
      subtitle: `₺${((stats?.totalCost || 0) / 1000).toFixed(1)}K maliyet`,
      icon: MapPin,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
  ]

  return (
    <div className="space-y-3">
      {usingMock && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Clock className="h-4 w-4 text-amber-600" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Demo modu aktif - Gerçek veri için Supabase bağlantısını yapılandırın
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", stat.iconBg)}>
                    <Icon className={cn("h-4 w-4", stat.iconColor)} />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                      stat.changeType === "positive" && "text-emerald-600 bg-emerald-500/10",
                      stat.changeType === "negative" && "text-red-600 bg-red-500/10",
                      stat.changeType === "neutral" && "text-muted-foreground bg-muted",
                    )}
                  >
                    {stat.changeType === "positive" && <TrendingUp className="h-3 w-3" />}
                    {stat.changeType === "negative" && <TrendingDown className="h-3 w-3" />}
                    {stat.change}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
