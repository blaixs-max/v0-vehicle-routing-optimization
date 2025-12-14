"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { mockCustomers, mockDepots } from "@/lib/mock-data"
import type { Customer, Depot } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Pencil, Trash2, Search, MapPin, AlertTriangle } from "lucide-react"
import { DEPOT_COLORS, PRIORITY_LABELS } from "@/lib/constants"
import { CustomerFormDialog } from "./customer-form-dialog"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CustomersTable() {
  const [customers, setCustomers] = useState<(Customer & { assigned_depot?: Depot | null })[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [search, setSearch] = useState("")
  const [filterDepot, setFilterDepot] = useState<string>("all")
  const [filterCity, setFilterCity] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [isDemo, setIsDemo] = useState(false)
  const pageSize = 20

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    if (!supabase) {
      const customersWithDepot = mockCustomers.map((c) => ({
        ...c,
        assigned_depot: mockDepots.find((d) => d.id === c.assigned_depot_id),
      }))
      setCustomers(customersWithDepot)
      setDepots(mockDepots)
      setIsDemo(true)
      setLoading(false)
      return
    }

    const [customersRes, depotsRes] = await Promise.all([
      supabase.from("customers").select("*, assigned_depot:depots(*)").order("name"),
      supabase.from("depots").select("*"),
    ])

    if (customersRes.data) {
      setCustomers(customersRes.data as (Customer & { assigned_depot: Depot | null })[])
    } else {
      const customersWithDepot = mockCustomers.map((c) => ({
        ...c,
        assigned_depot: mockDepots.find((d) => d.id === c.assigned_depot_id),
      }))
      setCustomers(customersWithDepot)
      setIsDemo(true)
    }

    if (depotsRes.data) {
      setDepots(depotsRes.data)
    } else {
      setDepots(mockDepots)
    }
    setLoading(false)
  }

  async function deleteCustomer(id: string) {
    if (isDemo) {
      alert("Demo modunda silme işlemi yapılamaz")
      return
    }
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from("customers").delete().eq("id", id)
    fetchData()
  }

  const cities = [...new Set(customers.map((c) => c.city))]

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase())
    const matchesDepot = filterDepot === "all" || c.assigned_depot_id === filterDepot
    const matchesCity = filterCity === "all" || c.city === filterCity
    return matchesSearch && matchesDepot && matchesCity
  })

  const paginatedCustomers = filteredCustomers.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(filteredCustomers.length / pageSize)

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
            placeholder="Müşteri veya adres ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={filterDepot}
          onValueChange={(v) => {
            setFilterDepot(v)
            setPage(0)
          }}
        >
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
        <Select
          value={filterCity}
          onValueChange={(v) => {
            setFilterCity(v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Şehir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Şehirler</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredCustomers.length} / {customers.length} müşteri
        </div>
      </div>

      <Card className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Müşteri</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead>Koordinat</TableHead>
              <TableHead>Talep</TableHead>
              <TableHead>Öncelik</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{customer.address}</TableCell>
                <TableCell>{customer.city}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <MapPin className="h-3 w-3" />
                    {customer.lat.toFixed(4)}, {customer.lng.toFixed(4)}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{customer.demand_pallet || customer.demand_pallets}</span>
                  <span className="text-muted-foreground text-sm"> palet</span>
                </TableCell>
                <TableCell>
                  <Badge className={`${PRIORITY_LABELS[customer.priority]?.color || "bg-gray-500"} text-white`}>
                    {PRIORITY_LABELS[customer.priority]?.label || `P${customer.priority}`}
                  </Badge>
                </TableCell>
                <TableCell>
                  {customer.assigned_depot ? (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: DEPOT_COLORS[customer.assigned_depot.city]?.primary,
                        color: DEPOT_COLORS[customer.assigned_depot.city]?.primary,
                      }}
                    >
                      {customer.assigned_depot.city}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Atanmamış</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteCustomer(customer.id)}>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Sayfa {page + 1} / {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
                Önceki
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CustomerFormDialog
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
        depots={depots}
        onSuccess={fetchData}
      />
    </>
  )
}
