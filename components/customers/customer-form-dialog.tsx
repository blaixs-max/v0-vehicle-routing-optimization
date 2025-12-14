"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
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
  priority: customer?.priority?.toString() || "3",
  assigned_depot_id: customer?.assigned_depot_id || depots?.find((d) => d.city === "İstanbul")?.id || "",
  status: (customer?.status || "pending") as Customer["status"],
})

export function CustomerFormDialog({ open, onOpenChange, customer, depots = [], onSuccess }: CustomerFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => getInitialForm(customer, depots))

  const prevOpen = useRef(open)

  useEffect(() => {
    // Sadece dialog yeni açıldığında form'u güncelle
    if (open && !prevOpen.current) {
      setForm(getInitialForm(customer, depots))
    }
    prevOpen.current = open
  }, [open, customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    if (!supabase) {
      alert("Demo modunda kayıt yapılamaz")
      setLoading(false)
      return
    }

    const data = {
      name: form.name,
      address: form.address,
      city: form.city,
      district: form.district || null,
      lat: Number.parseFloat(form.lat),
      lng: Number.parseFloat(form.lng),
      demand_pallets: Number.parseInt(form.demand_pallets),
      demand_kg: Number.parseFloat(form.demand_kg),
      priority: Number.parseInt(form.priority) as 1 | 2 | 3 | 4 | 5,
      assigned_depot_id: form.assigned_depot_id || null,
      status: form.status,
    }

    if (customer) {
      await supabase.from("customers").update(data).eq("id", customer.id)
    } else {
      await supabase.from("customers").insert(data)
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
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
              <Label htmlFor="demand_kg">Talep (kg)</Label>
              <Input
                id="demand_kg"
                type="number"
                value={form.demand_kg}
                onChange={(e) => setForm({ ...form, demand_kg: e.target.value })}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
