"use client"

import { useEffect, useState } from "react"
import { mockCustomers, mockDepots } from "@/lib/mock-data"
import { getCustomerCoordinates } from "@/lib/customer-store"
import type { Customer, Depot } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Pencil, Trash2, Search, MapPin, AlertTriangle } from "lucide-react"
import { DEPOT_COLORS } from "@/lib/constants"
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
  const pageSize = 20

  useEffect(() => {
    fetchData()

    const handleCoordinateUpdate = () => {
      fetchData()
    }
    window.addEventListener("customer-coordinates-updated", handleCoordinateUpdate)
    return () => {
      window.removeEventListener("customer-coordinates-updated", handleCoordinateUpdate)
    }
  }, [])

  async function fetchData() {
    try {
      const [customersRes, depotsRes] = await Promise.all([fetch("/api/customers"), fetch("/api/depots")])

      const [customersData, depotsData] = await Promise.all([customersRes.json(), depotsRes.json()])

      const savedCoords = getCustomerCoordinates()
      const customersWithDepot = customersData.map((c: Customer) => {
        const saved = savedCoords[c.id]
        return {
          ...c,
          lat: saved?.lat ?? c.lat,
          lng: saved?.lng ?? c.lng,
          assigned_depot: depotsData.find((d: Depot) => d.id === c.assigned_depot_id),
        }
      })

      setCustomers(customersWithDepot)
      setDepots(depotsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      const savedCoords = getCustomerCoordinates()
      const customersWithDepot = mockCustomers.map((c) => {
        const saved = savedCoords[c.id]
        return {
          ...c,
          lat: saved?.lat ?? c.lat,
          lng: saved?.lng ?? c.lng,
          assigned_depot: mockDepots.find((d) => d.id === c.assigned_depot_id),
        }
      })
      setCustomers(customersWithDepot)
      setDepots(mockDepots)
    } finally {
      setLoading(false)
    }
  }

  async function deleteCustomer(id: string) {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return

    try {
      await fetch(`/api/customers?id=${id}`, { method: "DELETE" })
      fetchData()
    } catch (error) {
      console.error("Failed to delete customer:", error)
    }
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

  const missingCoordsCount = customers.filter((c) => !c.lat || !c.lng || c.lat === 0 || c.lng === 0).length

  if (loading) {
    return <Card className="mt-6 p-8 text-center text-muted-foreground">Yükleniyor...</Card>
  }

  return (
    <>
      {/* Filters - Mobil responsive */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
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
        <div className="flex items-center gap-2">
          <Select
            value={filterDepot}
            onValueChange={(v) => {
              setFilterDepot(v)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Depo" />
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
            <SelectTrigger className="w-full sm:w-[130px]">
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
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {filteredCustomers.length} / {customers.length} müşteri
        </div>
      </div>

      {/* Desktop Table */}
      <Card className="mt-4 hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Müşteri</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead>Konum</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead>Öncelik</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCustomers.map((customer) => {
              const hasValidCoords = customer.lat && customer.lng && customer.lat !== 0 && customer.lng !== 0
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.city}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                    {customer.address}
                  </TableCell>
                  <TableCell>
                    {hasValidCoords ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps?q=${Number(customer.lat)},${Number(customer.lng)}`,
                            "_blank",
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        {Number(customer.lat).toFixed(4)}, {Number(customer.lng).toFixed(4)}
                      </button>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Yok
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.assigned_depot ? (
                      <Badge
                        style={{
                          backgroundColor: DEPOT_COLORS[customer.assigned_depot.city]?.secondary || "#e5e7eb",
                          color: DEPOT_COLORS[customer.assigned_depot.city]?.marker || "#374151",
                        }}
                      >
                        {customer.assigned_depot.city}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        customer.priority <= 2
                          ? "bg-red-50 text-red-700 border-red-300"
                          : customer.priority === 3
                            ? "bg-blue-50 text-blue-700 border-blue-300"
                            : "bg-gray-50 text-gray-700 border-gray-300"
                      }
                    >
                      {customer.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteCustomer(customer.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Cards */}
      <div className="mt-4 sm:hidden space-y-3">
        {paginatedCustomers.map((customer) => {
          const hasValidCoords = customer.lat && customer.lng && customer.lat !== 0 && customer.lng !== 0
          return (
            <Card key={customer.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-slate-900 truncate">{customer.name}</h3>
                  <p className="text-xs text-slate-500 truncate mt-1">{customer.address}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {customer.assigned_depot ? (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      backgroundColor: DEPOT_COLORS[customer.assigned_depot.city]?.secondary || "#e5e7eb",
                      color: DEPOT_COLORS[customer.assigned_depot.city]?.marker || "#374151",
                    }}
                  >
                    {customer.assigned_depot.city}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">-</span>
                )}
                <span className="text-xs text-slate-500">{customer.city}</span>
              </div>

              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Zaman:</span>
                  <span className="font-medium">
                    {customer.time_window_start && customer.time_window_end
                      ? `${customer.time_window_start} - ${customer.time_window_end}`
                      : "Yok"}
                  </span>
                </div>
                {hasValidCoords ? (
                  <div className="flex items-center gap-1 text-slate-500 font-mono">
                    <MapPin className="h-3 w-3 text-green-500" />
                    {Number(customer.lat).toFixed(2)}, {Number(customer.lng).toFixed(2)}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-orange-500">
                    <AlertTriangle className="h-3 w-3" />
                    Koordinat Eksik
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Öncelik:</span>
                  <span className="font-medium">
                    <Badge
                      variant="outline"
                      className={
                        customer.priority <= 2
                          ? "bg-red-50 text-red-700 border-red-300"
                          : customer.priority === 3
                            ? "bg-blue-50 text-blue-700 border-blue-300"
                            : "bg-gray-50 text-gray-700 border-gray-300"
                      }
                    >
                      {customer.priority}
                    </Badge>
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
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

      {missingCoordsCount > 0 && (
        <Alert className="mt-4 border-orange-500/50 bg-orange-500/10">
          <MapPin className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm">
            <strong>{missingCoordsCount} müşteri</strong> için koordinat bilgisi eksik.
          </AlertDescription>
        </Alert>
      )}

      <CustomerFormDialog
        open={editingCustomer !== null}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
        depots={depots}
        onSuccess={fetchData}
      />
    </>
  )
}
