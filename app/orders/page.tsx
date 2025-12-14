"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Search,
  Download,
  Upload,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
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
import { mockOrders, mockCustomers, type MockOrder } from "@/lib/mock-data"

const statusConfig = {
  pending: { label: "Bekliyor", color: "bg-amber-100 text-amber-700", icon: Clock },
  assigned: { label: "Atandı", color: "bg-blue-100 text-blue-700", icon: Package },
  in_transit: { label: "Yolda", color: "bg-purple-100 text-purple-700", icon: Truck },
  delivered: { label: "Teslim Edildi", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  cancelled: { label: "İptal", color: "bg-red-100 text-red-700", icon: XCircle },
}

const priorityConfig = {
  1: { label: "Çok Düşük", color: "bg-slate-100 text-slate-600" },
  2: { label: "Düşük", color: "bg-blue-100 text-blue-600" },
  3: { label: "Normal", color: "bg-emerald-100 text-emerald-600" },
  4: { label: "Yüksek", color: "bg-amber-100 text-amber-600" },
  5: { label: "Acil", color: "bg-red-100 text-red-600" },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<MockOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [cityFilter, setCityFilter] = useState<string>("all")
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<MockOrder | null>(null)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setOrders(mockOrders)
      setLoading(false)
    }, 500)
  }, [])

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesCity = cityFilter === "all" || order.customer_city === cityFilter
    return matchesSearch && matchesStatus && matchesCity
  })

  const cities = [...new Set(orders.map((o) => o.customer_city))]

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    inTransit: orders.filter((o) => o.status === "in_transit").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  }

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map((o) => o.id))
    }
  }

  const handleDeleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id))
    setSelectedOrders((prev) => prev.filter((x) => x !== id))
  }

  const handleBulkDelete = () => {
    setOrders((prev) => prev.filter((o) => !selectedOrders.includes(o.id)))
    setSelectedOrders([])
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Siparişler</h1>
            <p className="text-sm text-slate-500 mt-1">Teslimat siparişlerini yönetin ve takip edin</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              İçe Aktar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Dışa Aktar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setEditingOrder(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Sipariş
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Toplam Sipariş</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-sm text-slate-500">Bekleyen</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.inTransit}</p>
                <p className="text-sm text-slate-500">Yolda</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.delivered}</p>
                <p className="text-sm text-slate-500">Teslim Edildi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Sipariş, müşteri veya adres ara..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="pending">Bekliyor</SelectItem>
                <SelectItem value="assigned">Atandı</SelectItem>
                <SelectItem value="in_transit">Yolda</SelectItem>
                <SelectItem value="delivered">Teslim Edildi</SelectItem>
                <SelectItem value="cancelled">İptal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-40">
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
            {selectedOrders.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-slate-500">{selectedOrders.length} seçili</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Sil
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
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
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleSelectOrder(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{order.customer_name}</p>
                          <p className="text-sm text-slate-500 truncate max-w-[200px]">{order.customer_address}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order.customer_city}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{order.demand_pallet} palet</p>
                          <p className="text-slate-500">{order.demand_kg.toLocaleString()} kg</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityConfig[order.priority].color}>
                          {priorityConfig[order.priority].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[order.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[order.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.delivery_date}</TableCell>
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
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingOrder(order)
                                setDialogOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteOrder(order.id)}>
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
                    <TableCell colSpan={9} className="text-center py-12">
                      <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Sipariş bulunamadı</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Toplam {filteredOrders.length} sipariş gösteriliyor</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Önceki
            </Button>
            <Button variant="outline" size="sm" className="bg-emerald-50 text-emerald-700">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Sonraki
            </Button>
          </div>
        </div>

        {/* Order Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "Siparişi Düzenle" : "Yeni Sipariş"}</DialogTitle>
              <DialogDescription>Sipariş bilgilerini girin veya düzenleyin</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Müşteri</Label>
                <Select defaultValue={editingOrder?.customer_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Palet Sayısı</Label>
                  <Input type="number" placeholder="0" defaultValue={editingOrder?.demand_pallet} />
                </div>
                <div className="space-y-2">
                  <Label>Ağırlık (kg)</Label>
                  <Input type="number" placeholder="0" defaultValue={editingOrder?.demand_kg} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Öncelik</Label>
                  <Select defaultValue={editingOrder?.priority?.toString() || "3"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Çok Düşük</SelectItem>
                      <SelectItem value="2">Düşük</SelectItem>
                      <SelectItem value="3">Normal</SelectItem>
                      <SelectItem value="4">Yüksek</SelectItem>
                      <SelectItem value="5">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teslimat Tarihi</Label>
                  <Input
                    type="date"
                    defaultValue={editingOrder?.delivery_date || new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea placeholder="Sipariş notları..." defaultValue={editingOrder?.notes} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialogOpen(false)}>
                {editingOrder ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
