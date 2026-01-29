"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck } from "lucide-react"
import { useRoutes } from "@/lib/hooks/use-depot-data"

export default function RotalarPage() {
  const { data: routes, isLoading: loading } = useRoutes()

  const statusConfig = {
    planned: { label: "Planlandı", color: "bg-blue-500" },
    in_progress: { label: "Devam Ediyor", color: "bg-yellow-500" },
    completed: { label: "Tamamlandı", color: "bg-green-500" },
    cancelled: { label: "İptal Edildi", color: "bg-red-500" },
  }

  const routesList = routes || []

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">Yükleniyor...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rotalar</h1>
        <p className="text-muted-foreground">Kaydedilmiş rota geçmişi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{routesList.length} Rota Kaydı</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rota ID</TableHead>
                <TableHead>Araç</TableHead>
                <TableHead>Depo</TableHead>
                <TableHead>Durak</TableHead>
                <TableHead>Mesafe</TableHead>
                <TableHead>Süre</TableHead>
                <TableHead>Maliyet</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routesList.map((route: any) => {
                const status = statusConfig[route.status] || statusConfig.planned
                return (
                  <TableRow key={route.id}>
                    <TableCell className="font-mono text-sm">{route.id.substring(0, 12)}...</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{route.vehicle_plate}</span>
                      </div>
                    </TableCell>
                    <TableCell>{route.depot_city}</TableCell>
                    <TableCell>{route.stop_count || 0} durak</TableCell>
                    <TableCell>{Number(route.total_distance_km).toFixed(1)} km</TableCell>
                    <TableCell>{route.total_duration_min} dk</TableCell>
                    <TableCell>{Number(route.total_cost).toFixed(2)} TL</TableCell>
                    <TableCell>
                      <Badge className={status.color}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{new Date(route.created_at).toLocaleDateString("tr-TR")}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  )
}
