"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { mockDepots } from "@/lib/mock-data"
import type { Depot } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, MapPin, AlertTriangle } from "lucide-react"
import { DEPOT_COLORS } from "@/lib/constants"
import { DepotFormDialog } from "./depot-form-dialog"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function DepotsTable() {
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDepot, setEditingDepot] = useState<Depot | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    fetchDepots()
  }, [])

  async function fetchDepots() {
    const supabase = createClient()

    if (!supabase) {
      setDepots(mockDepots)
      setIsDemo(true)
      setLoading(false)
      return
    }

    const { data } = await supabase.from("depots").select("*").order("city")
    if (data) {
      setDepots(data)
    } else {
      setDepots(mockDepots)
      setIsDemo(true)
    }
    setLoading(false)
  }

  async function deleteDepot(id: string) {
    if (isDemo) {
      alert("Demo modunda silme işlemi yapılamaz")
      return
    }
    if (!confirm("Bu depoyu silmek istediğinize emin misiniz?")) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("depots").delete().eq("id", id)
    fetchDepots()
  }

  if (loading) {
    return <Card className="mt-6 p-8 text-center text-muted-foreground">Yükleniyor...</Card>
  }

  return (
    <>
      {isDemo && (
        <Alert className="mt-4 border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-500">
            Demo modu aktif. Supabase bağlantısı için environment variables ekleyin.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Depo Adı</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead>Koordinat</TableHead>
              <TableHead>Kapasite</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {depots.map((depot) => (
              <TableRow key={depot.id}>
                <TableCell className="font-medium">{depot.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: DEPOT_COLORS[depot.city]?.primary,
                      color: DEPOT_COLORS[depot.city]?.primary,
                    }}
                  >
                    {depot.city}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{depot.address}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {depot.lat.toFixed(4)}, {depot.lng.toFixed(4)}
                  </div>
                </TableCell>
                <TableCell>
                  {depot.capacity_pallets?.toLocaleString() || depot.capacity?.toLocaleString()} palet
                </TableCell>
                <TableCell>
                  <Badge variant={depot.status === "active" ? "default" : "secondary"}>
                    {depot.status === "active" ? "Aktif" : "Pasif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingDepot(depot)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteDepot(depot.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <DepotFormDialog
        open={!!editingDepot}
        onOpenChange={(open) => !open && setEditingDepot(null)}
        depot={editingDepot}
        onSuccess={fetchDepots}
      />
    </>
  )
}
