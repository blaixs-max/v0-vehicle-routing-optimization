"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Search,
  Download,
  Upload,
  Package,
  Clock,
  CheckCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Order {
  id: string
  customer_id: string
  customer_name: string
  customer_city: string
  customer_district?: string
  customer_address: string
  pallets: number
  priority: number // Add priority field
  order_date: string
  delivery_date?: string
  status: "pending" | "assigned" | "completed" | "cancelled"
  notes?: string
}

const statusConfig = {
  pending: { label: "Bekliyor", color: "bg-amber-100 text-amber-700", icon: Clock },
  assigned: { label: "Atandı", color: "bg-blue-100 text-blue-700", icon: Package },
  completed: { label: "Teslim Edildi", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  cancelled: { label: "İptal", color: "bg-red-100 text-red-700", icon: Clock },
}

const priorityConfig = {
  1: { label: "Çok Acil", color: "bg-red-100 text-red-700" },
  2: { label: "Acil", color: "bg-orange-100 text-orange-700" },
  3: { label: "Normal", color: "bg-emerald-100 text-emerald-700" },
  4: { label: "Düşük", color: "bg-blue-100 text-blue-700" },
  5: { label: "Çok Düşük", color: "bg-slate-100 text-slate-600" },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [cityFilter, setCityFilter] = useState<string>("all")

  const fetchOrders = async () => {
    try {
      console.log("[v0] Fetching orders from /api/orders...")
      const response = await fetch("/api/orders")
      const data = await response.json()
      console.log("[v0] Orders received from API:", data.length)
      setOrders(data)
    } catch (error) {
      console.error("[v0] Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesCity = cityFilter === "all" || order.customer_city === cityFilter
    return matchesSearch && matchesStatus && matchesCity
  })

  const cities = [...new Set(orders.map((o) => o.customer_city).filter(Boolean))]

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    assigned: orders.filter((o) => o.status === "assigned").length,
    completed: orders.filter((o) => o.status === "completed").length,
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Siparişler</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Teslimat siparişlerini yönetin</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent">
              <Upload className="h-4 w-4 mr-2" />
              İçe Aktar
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Dışa Aktar
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Yeni Sipariş</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg shrink-0">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs sm:text-sm text-slate-500 truncate">Toplam</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs sm:text-sm text-slate-500 truncate">Bekleyen</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg shrink-0">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.assigned}</p>
                <p className="text-xs sm:text-sm text-slate-500 truncate">Atandı</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.completed}</p>
                <p className="text-xs sm:text-sm text-slate-500 truncate">Teslim</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Sipariş, müşteri veya adres ara..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="assigned">Atandı</SelectItem>
                  <SelectItem value="completed">Teslim Edildi</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full sm:w-32">
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
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : (
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Şehir</TableHead>
                    <TableHead>Talep</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Teslimat Tarihi</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const StatusIcon = statusConfig[order.status].icon
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm">{order.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{order.customer_name || "N/A"}</p>
                            <p className="text-sm text-slate-500 truncate max-w-[200px]">{order.customer_address}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.customer_city || "N/A"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{order.pallets} palet</p>
                            <span className="text-xs text-muted-foreground">
                              {(order.pallets * 500).toLocaleString()} kg
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(order.priority || 3)}
                            onValueChange={async (value) => {
                              try {
                                const response = await fetch(`/api/orders/${order.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ priority: Number.parseInt(value) }),
                                })
                                if (response.ok) {
                                  fetchOrders()
                                }
                              } catch (error) {
                                console.error("Priority update failed:", error)
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 - Çok Acil</SelectItem>
                              <SelectItem value="2">2 - Acil</SelectItem>
                              <SelectItem value="3">3 - Normal</SelectItem>
                              <SelectItem value="4">4 - Düşük</SelectItem>
                              <SelectItem value="5">5 - Ertelenebilir</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityConfig[(order.priority || 3) as keyof typeof priorityConfig].color}>
                            {priorityConfig[(order.priority || 3) as keyof typeof priorityConfig].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[order.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[order.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.delivery_date || order.order_date}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="h-4 w-4 mr-2" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Sipariş bulunamadı</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm text-slate-500">{filteredOrders.length} sipariş</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Önceki
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="bg-emerald-600 text-white">
                1
              </Button>
            </div>
            <Button variant="outline" size="sm" disabled>
              Sonraki
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
