"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { mockVehicles, mockDepots } from "@/lib/mock-data"
import type { Vehicle, Depot } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Pencil, Trash2, Search, Fuel, AlertTriangle } from "lucide-react"
import { DEPOT_COLORS, VEHICLE_TYPES } from "@/lib/constants"
import { VehicleFormDialog } from "./vehicle-form-dialog"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available: { label: "Müsait", variant: "default" },
  in_use: { label: "Kullanımda", variant: "secondary" },
  in_route: { label: "Rotada", variant: "secondary" },
  maintenance: { label: "Bakımda", variant: "destructive" },
  inactive: { label: "Pasif", variant: "outline" },
}

export function VehiclesTable() {
  const [vehicles, setVehicles] = useState<(Vehicle & { depot?: Depot })[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [search, setSearch] = useState("")
  const [filterDepot, setFilterDepot] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    if (!supabase) {
      const vehiclesWithDepot = mockVehicles.map((v) => ({
        ...v,
        depot: mockDepots.find((d) => d.id === v.depot_id),
      }))
      setVehicles(vehiclesWithDepot)
      setDepots(mockDepots)
      setIsDemo(true)
      setLoading(false)
      return
    }

    const [vehiclesRes, depotsRes] = await Promise.all([
      supabase.from("vehicles").select("*, depot:depots(*)").order("plate"),
      supabase.from("depots").select("*"),
    ])

    if (vehiclesRes.data) {
      setVehicles(vehiclesRes.data as (Vehicle & { depot: Depot })[])
    } else {
      const vehiclesWithDepot = mockVehicles.map((v) => ({
        ...v,
        depot: mockDepots.find((d) => d.id === v.depot_id),
      }))
      setVehicles(vehiclesWithDepot)
      setIsDemo(true)
    }

    if (depotsRes.data) {
      setDepots(depotsRes.data)
    } else {
      setDepots(mockDepots)
    }
    setLoading(false)
  }

  async function deleteVehicle(id: string) {
    if (isDemo) {
      alert("Demo modunda silme işlemi yapılamaz")
      return
    }
    if (!confirm("Bu aracı silmek istediğinize emin misiniz?")) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("vehicles").delete().eq("id", id)
    fetchData()
  }

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = v.plate.toLowerCase().includes(search.toLowerCase())
    const matchesDepot = filterDepot === "all" || v.depot_id === filterDepot
    const matchesType = filterType === "all" || v.vehicle_type === filterType
    return matchesSearch && matchesDepot && matchesType
  })

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

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Plaka ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDepot} onValueChange={setFilterDepot}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Depo filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Depolar</SelectItem>
            {depots.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Araç tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="kamyon">Kamyon</SelectItem>
            <SelectItem value="tir">TIR</SelectItem>
            <SelectItem value="kamyonet">Kamyonet</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredVehicles.length} / {vehicles.length} araç
        </div>
      </div>

      <Card className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plaka</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead>Kapasite</TableHead>
              <TableHead>Maliyet/km</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Fuel className="h-3 w-3" />
                  L/100km
                </div>
              </TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-mono font-medium">{vehicle.plate}</TableCell>
                <TableCell>
                  <Badge variant="outline">{VEHICLE_TYPES[vehicle.vehicle_type]?.label || vehicle.vehicle_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: DEPOT_COLORS[vehicle.depot?.city || ""]?.primary,
                      color: DEPOT_COLORS[vehicle.depot?.city || ""]?.primary,
                    }}
                  >
                    {vehicle.depot?.city || "N/A"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="font-medium">{vehicle.capacity_pallet}</span> palet
                    <span className="text-muted-foreground ml-2">
                      ({((vehicle.capacity_kg || 0) / 1000).toFixed(0)}t)
                    </span>
                  </div>
                </TableCell>
                <TableCell>{vehicle.cost_per_km?.toFixed(2) || "0.00"} TL</TableCell>
                <TableCell>{vehicle.fuel_consumption_per_100km || 0} L</TableCell>
                <TableCell>
                  <Badge variant={STATUS_LABELS[vehicle.status]?.variant || "outline"}>
                    {STATUS_LABELS[vehicle.status]?.label || vehicle.status}
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
                      <DropdownMenuItem onClick={() => setEditingVehicle(vehicle)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteVehicle(vehicle.id)}>
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

      <VehicleFormDialog
        open={!!editingVehicle}
        onOpenChange={(open) => !open && setEditingVehicle(null)}
        vehicle={editingVehicle}
        depots={depots}
        onSuccess={fetchData}
      />
    </>
  )
}
