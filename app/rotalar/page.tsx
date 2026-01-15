"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function RotalarPage() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchRoutes()
  }, [])

  const fetchRoutes = async () => {
    try {
      const response = await fetch("/api/routes")
      if (!response.ok) throw new Error("Failed to fetch routes")
      const data = await response.json()
      setRoutes(data)
    } catch (error) {
      console.error("[v0] Failed to fetch routes:", error)
      toast({
        title: "Hata",
        description: "Rotalar yüklenemedi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    planned: { label: "Planlandı", color: "bg-blue-500" },
    in_progress: { label: "Devam Ediyor", color: "bg-yellow-500" },
    completed: { label: "Tamamlandı", color: "bg-green-500" },
    cancelled: { label: "İptal Edildi", color: "bg-red-500" },
  }

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rotalar</h1>
        <p className="text-muted-foreground">Kaydedilmiş rota geçmişi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{routes.length} Rota Kaydı</CardTitle>
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
              {routes.map((route) => {
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
  )
}
