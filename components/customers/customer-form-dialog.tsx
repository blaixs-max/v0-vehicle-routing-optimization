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
import { TURKEY_CITIES } from "@/lib/constants"

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
  has_time_constraint: customer?.has_time_constraint || false,
  constraint_start_time: customer?.constraint_start_time || "08:00",
  constraint_end_time: customer?.constraint_end_time || "19:00",
  assigned_depot_id: customer?.assigned_depot_id || depots?.find((d) => d.city === "İstanbul")?.id || "defaultDepotId",
  service_duration_min: customer?.service_duration_min || 15,
  required_vehicle_type: customer?.required_vehicle_type || "", // Add required vehicle type
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
        has_time_constraint: form.has_time_constraint,
        constraint_start_time: form.has_time_constraint ? form.constraint_start_time : null,
        constraint_end_time: form.has_time_constraint ? form.constraint_end_time : null,
        assigned_depot_id: form.assigned_depot_id,
        service_duration_min: form.service_duration_min,
        required_vehicle_type: form.required_vehicle_type || null, // Add required vehicle type
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
              placeholder="ABC Lojistik"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Kartal, Istanbul"
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
                <SelectContent className="max-h-[300px]">
                  {TURKEY_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">İlçe</Label>
              <Input
                id="district"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="Kartal"
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
                placeholder="40.90010000"
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
                placeholder="29.19290000"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_duration_minutes">Boşaltma Süresi (dakika)</Label>
            <Input
              id="service_duration_minutes"
              type="number"
              min="5"
              max="240"
              value={form.service_duration_min}
              onChange={(e) => setForm({ ...form, service_duration_min: Number(e.target.value) })}
              placeholder="45"
            />
            <p className="text-xs text-muted-foreground">Bu müşteride malzeme boşaltma için gereken ortalama süre</p>
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

          <div className="space-y-2">
            <Label htmlFor="service_duration_min">Boşaltma Süresi (dakika)</Label>
            <Input
              id="service_duration_min"
              type="number"
              min="5"
              max="120"
              value={form.service_duration_min}
              onChange={(e) => setForm({ ...form, service_duration_min: e.target.value })}
              placeholder="15"
            />
            <p className="text-xs text-muted-foreground">Müşteride mal boşaltmak için gereken süre</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="required_vehicle_type">Gerekli Araç Tipi (Opsiyonel)</Label>
            <Select
              value={form.required_vehicle_type || "none"}
              onValueChange={(value) => setForm({ ...form, required_vehicle_type: value === "none" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Araç tipi seçin (yoksa boş bırakın)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kısıt Yok (Tüm araçlar)</SelectItem>
                <SelectItem value="kamyonet">Kamyonet (10 palet)</SelectItem>
                <SelectItem value="kamyon_1">Kamyon 1 (14 palet)</SelectItem>
                <SelectItem value="kamyon_2">Kamyon 2 (18 palet)</SelectItem>
                <SelectItem value="tir">TIR (32 palet)</SelectItem>
                <SelectItem value="romork">Romork (36 palet)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Bu müşteriye sadece seçilen araç tipi gidebilir</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_depot">Atanmış Depo</Label>
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
