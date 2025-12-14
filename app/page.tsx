import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardStats } from "@/components/dashboard/stats"
import { DashboardMap } from "@/components/dashboard/map"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, ArrowRight, Clock, Truck } from "lucide-react"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        {/* Stats */}
        <Suspense fallback={<StatsLoading />}>
          <DashboardStats />
        </Suspense>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map - Takes 2 columns */}
          <div className="lg:col-span-2 h-[calc(100vh-280px)] min-h-[400px]">
            <Card className="h-full border border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="p-3 pb-0 flex-row items-center justify-between bg-white">
                <CardTitle className="text-sm font-semibold text-slate-900">Canli Harita</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Canli
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-48px)]">
                <Suspense fallback={<MapLoading />}>
                  <DashboardMap />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-3 bg-white">
                <CardTitle className="text-sm font-semibold text-slate-900">Hizli Islemler</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <Button className="w-full justify-between group bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Rotalari Optimize Et
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button variant="outline" className="w-full justify-between group bg-transparent" size="sm">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Arac Ata
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-3 bg-white">
                <CardTitle className="text-sm font-semibold text-slate-900">Son Aktiviteler</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {[
                    { title: "Rota #127 tamamlandi", time: "5 dk once", type: "success" },
                    { title: "Yeni siparis eklendi", time: "12 dk once", type: "info" },
                    { title: "Arac 34 ABC 123 yola cikti", time: "25 dk once", type: "default" },
                    { title: "Optimizasyon baslatildi", time: "1 saat once", type: "warning" },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 ${
                          activity.type === "success"
                            ? "bg-emerald-500"
                            : activity.type === "info"
                              ? "bg-blue-500"
                              : activity.type === "warning"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{activity.title}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

function MapLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Harita yukleniyor...</p>
      </div>
    </div>
  )
}
