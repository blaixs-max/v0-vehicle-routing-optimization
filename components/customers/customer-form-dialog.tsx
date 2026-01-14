"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import type { Customer, Depot } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  depots?: Depot[]
  onSuccess?: () => void
}

const getInitialForm = (customer?: Customer | null, depots?: Depot[]) => ({
  name: customer?.name || "",
  address: customer?.address || "",
  city: customer?.city || "İstanbul",
  district: customer?.district || "",
  lat: customer?.lat?.toString() || "",
  lng: customer?.lng?.toString() || "",
  demand_pallets: customer?.demand_pallets?.toString() || "1",
  demand_kg: customer?.demand_kg?.toString() || "800",
  has_time_constraint: customer?.has_time_constraint || false,
  constraint_start_time: customer?.constraint_start_time || "08:00",
  constraint_end_time: customer?.constraint_end_time || "19:00",
  priority: customer?.priority?.toString() || "3",
  assigned_depot_id: customer?.assigned_depot_id || depots?.find((d) => d.city === "İstanbul")?.id || "",
  status: (customer?.status || "pending") as Customer["status"],
})

export function CustomerFormDialog({ open, onOpenChange, customer, depots = [], onSuccess }: CustomerFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => getInitialForm(customer, depots))

  const prevOpen = useRef(open)

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(getInitialForm(customer, depots))
    }
    prevOpen.current = open
  }, [open, customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        name: form.name,
        address: form.address,
        city: form.city,
        district: form.district || null,
        lat: Number.parseFloat(form.lat),
        lng: Number.parseFloat(form.lng),
        demand_pallets: Number.parseInt(form.demand_pallets),
        demand_kg: Number.parseFloat(form.demand_kg),
        has_time_constraint: form.has_time_constraint,
        constraint_start_time: form.has_time_constraint ? form.constraint_start_time : null,
        constraint_end_time: form.has_time_constraint ? form.constraint_end_time : null,
        priority: Number.parseInt(form.priority),
        assigned_depot_id: form.assigned_depot_id,
        status: form.status,
      }

      if (customer) {
        await fetch(`/api/customers?id=${customer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else {
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save customer:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}</DialogTitle>
          <DialogDescription>Müşteri/teslimat noktası bilgilerini girin.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Müşteri Adı</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Migros Kadıköy"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Tam adres"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Şehir</Label>
              <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="İstanbul">İstanbul</SelectItem>
                  <SelectItem value="Ankara">Ankara</SelectItem>
                  <SelectItem value="İzmir">İzmir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">İlçe</Label>
              <Input
                id="district"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="Kadıköy"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Enlem (Lat)</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="40.9833"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Boylam (Lng)</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="29.0333"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="demand_pallets">Talep (Palet)</Label>
              <Input
                id="demand_pallets"
                type="number"
                min="1"
                value={form.demand_pallets}
                onChange={(e) => setForm({ ...form, demand_pallets: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demand_kg">Ağırlık (kg)</Label>
              <Input
                id="demand_kg"
                type="number"
                value={form.demand_kg}
                onChange={(e) => setForm({ ...form, demand_kg: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demand_m3">Hacim (m³)</Label>
              <Input
                id="demand_m3"
                type="number"
                step="0.1"
                value={form.demand_m3}
                onChange={(e) => setForm({ ...form, demand_m3: e.target.value })}
                placeholder="2.4"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time_window_start">Teslimat Başlangıç</Label>
              <Input
                id="time_window_start"
                type="time"
                value={form.time_window_start}
                onChange={(e) => setForm({ ...form, time_window_start: e.target.value })}
                placeholder="09:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_window_end">Teslimat Bitiş</Label>
              <Input
                id="time_window_end"
                type="time"
                value={form.time_window_end}
                onChange={(e) => setForm({ ...form, time_window_end: e.target.value })}
                placeholder="17:00"
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Zaman Kısıtı</Label>
                <p className="text-sm text-muted-foreground">Müşterinin teslimat yapılamayacağı saatleri belirleyin</p>
              </div>
              <Button
                type="button"
                variant={form.has_time_constraint ? "default" : "outline"}
                size="sm"
                onClick={() => setForm({ ...form, has_time_constraint: !form.has_time_constraint })}
              >
                {form.has_time_constraint ? "Kısıt Var" : "Kısıt Yok"}
              </Button>
            </div>

            {form.has_time_constraint && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary">
                <div className="space-y-2">
                  <Label htmlFor="constraint_start_time">Kapalı Saat Başlangıç</Label>
                  <Input
                    id="constraint_start_time"
                    type="time"
                    value={form.constraint_start_time}
                    onChange={(e) => setForm({ ...form, constraint_start_time: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Bu saatten itibaren KAPALI</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constraint_end_time">Kapalı Saat Bitiş</Label>
                  <Input
                    id="constraint_end_time"
                    type="time"
                    value={form.constraint_end_time}
                    onChange={(e) => setForm({ ...form, constraint_end_time: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Bu saate kadar KAPALI</p>
                </div>
                <div className="col-span-2">
                  <Alert>
                    <AlertDescription>
                      <strong>Örnek:</strong> 08:00 - 19:00 seçildiğinde, teslimat sadece <strong>19:00-08:00</strong>{" "}
                      arasında (gece/sabah erken) yapılabilir.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service_duration_min">Boşaltma Süresi (dk)</Label>
              <Input
                id="service_duration_min"
                type="number"
                min="5"
                value={form.service_duration_min}
                onChange={(e) => setForm({ ...form, service_duration_min: e.target.value })}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Çok Acil</SelectItem>
                  <SelectItem value="2">2 - Acil</SelectItem>
                  <SelectItem value="3">3 - Normal</SelectItem>
                  <SelectItem value="4">4 - Düşük</SelectItem>
                  <SelectItem value="5">5 - Çok Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Customer["status"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="assigned">Atandı</SelectItem>
                  <SelectItem value="delivered">Teslim Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Atanmış Depo</Label>
            <Select value={form.assigned_depot_id} onValueChange={(v) => setForm({ ...form, assigned_depot_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Depo seçin" />
              </SelectTrigger>
              <SelectContent>
                {depots.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : customer ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
