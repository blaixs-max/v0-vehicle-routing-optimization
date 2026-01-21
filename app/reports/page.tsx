"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, TrendingDown, Truck, MapPin, Fuel, Download, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/toast-provider"

export default function ReportsPage() {
  const { showToast } = useToast()
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
    try {
      const response = await fetch(`/api/reports/stats?dateRange=${dateRange}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch stats")
      }
      const data = await response.json()
      console.log("[v0] Reports stats loaded:", data)
      setStats(data)
    } catch (error) {
      console.error("[v0] Failed to fetch reports stats:", error)
      showToast(
        "error",
        "Rapor verileri yüklenemedi",
        error instanceof Error ? error.message : "Bir hata oluştu"
      )
      // Fallback to zeros if error
      setStats({
        totalRoutes: 0,
        totalDistance: 0,
        totalCost: 0,
        totalFuelCost: 0,
        avgCostPerKm: 0,
        avgStopsPerRoute: 0,
        vehicleUtilization: 0,
        costSavings: 0,
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Raporlar</h1>
            <p className="text-muted-foreground">Performans analizi ve istatistikler</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bugün</SelectItem>
                <SelectItem value="week">Bu Hafta</SelectItem>
                <SelectItem value="month">Bu Ay</SelectItem>
                <SelectItem value="quarter">Bu Çeyrek</SelectItem>
                <SelectItem value="year">Bu Yıl</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Excel İndir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Rota</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRoutes}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-500">+12%</span> geçen döneme göre
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Mesafe</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDistance.toLocaleString()} km</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-500">+8%</span> geçen döneme göre
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Maliyet</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.totalCost.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3 text-green-500" />
                <span className="text-green-500">-{stats.costSavings}%</span> maliyet tasarrufu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yakıt Maliyeti</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.totalFuelCost.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Ortalama: ₺{stats.avgCostPerKm.toFixed(2)}/km</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Araç Kullanım Oranı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm">Kullanılan Araçlar</span>
                  </div>
                  <span className="text-2xl font-bold">{stats.vehicleUtilization}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${stats.vehicleUtilization}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rota Performansı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ortalama Durak Sayısı</span>
                  <span className="text-lg font-semibold">{stats.avgStopsPerRoute}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ortalama Rota Süresi</span>
                  <span className="text-lg font-semibold">6.2 saat</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ortalama Rota Uzunluğu</span>
                  <span className="text-lg font-semibold">
                    {(stats.totalDistance / stats.totalRoutes).toFixed(1)} km
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
