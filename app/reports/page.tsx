"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { BarChart3, TrendingUp, TrendingDown, Truck, MapPin, Fuel, Download, Calendar } from "lucide-react"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("week")
  const [stats, setStats] = useState({
    totalRoutes: 0,
    totalDistance: 0,
    totalCost: 0,
    totalFuelCost: 0,
    avgCostPerKm: 0,
    avgStopsPerRoute: 0,
    vehicleUtilization: 0,
    costSavings: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  const fetchStats = async () => {
    if (!supabase) {
      // Demo stats
      setStats({
        totalRoutes: 47,
        totalDistance: 3250,
        totalCost: 45800,
        totalFuelCost: 18200,
        avgCostPerKm: 14.09,
        avgStopsPerRoute: 8.3,
        vehicleUtilization: 78.5,
        costSavings: 12.3,
      })
      return
    }

    try {
      const { data: routes } = await supabase.from("routes").select(`*, stops:route_stops(count)`)

      if (routes) {
        const totalRoutes = routes.length
        const totalDistance = routes.reduce((sum, r) => sum + (r.total_distance_km || 0), 0)
        const totalCost = routes.reduce((sum, r) => sum + (r.total_cost || 0), 0)
        const totalFuelCost = routes.reduce((sum, r) => sum + (r.fuel_cost || 0), 0)

        setStats({
          totalRoutes,
          totalDistance,
          totalCost,
          totalFuelCost,
          avgCostPerKm: totalDistance > 0 ? totalCost / totalDistance : 0,
          avgStopsPerRoute:
            totalRoutes > 0 ? routes.reduce((sum, r) => sum + (r.stops?.[0]?.count || 0), 0) / totalRoutes : 0,
          vehicleUtilization: 78.5,
          costSavings: 12.3,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Raporlar</h1>
            <p className="text-sm text-slate-500">Performans metrikleri ve maliyet analizi</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 bg-white">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bugun</SelectItem>
                <SelectItem value="week">Bu Hafta</SelectItem>
                <SelectItem value="month">Bu Ay</SelectItem>
                <SelectItem value="year">Bu Yil</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-white">
              <Download className="w-4 h-4 mr-2" />
              Rapor Indir
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Toplam Rota</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalRoutes}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-100">
                    <Truck className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Toplam Mesafe</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalDistance.toFixed(0)} km</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-100">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Toplam Maliyet</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {stats.totalCost.toLocaleString("tr-TR")} TL
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-100">
                    <BarChart3 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Yakit Maliyeti</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {stats.totalFuelCost.toLocaleString("tr-TR")} TL
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-100">
                    <Fuel className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-slate-900">Ort. Maliyet / KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900">{stats.avgCostPerKm.toFixed(2)} TL</span>
                  <span className="text-sm text-emerald-600 flex items-center mb-1">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    -5.2%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-slate-900">Arac Kullanim Orani</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900">{stats.vehicleUtilization}%</span>
                  <span className="text-sm text-emerald-600 flex items-center mb-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +3.1%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${stats.vehicleUtilization}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-slate-900">Maliyet Tasarrufu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-emerald-600">{stats.costSavings}%</span>
                  <span className="text-sm text-slate-500 mb-1">optimizasyon ile</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Depot Performance */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Depo Performansi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Istanbul Depo", "Ankara Depo", "Izmir Depo"].map((depot, i) => (
                  <div key={depot} className="flex items-center gap-4">
                    <div className="w-32 font-medium text-slate-700">{depot}</div>
                    <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${[85, 72, 68][i]}%` }} />
                    </div>
                    <div className="w-16 text-right text-sm font-medium text-slate-900">{[85, 72, 68][i]}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
