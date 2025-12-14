"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Depot } from "@/types/database"
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

interface DepotFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  depot?: Depot | null
  onSuccess?: () => void
}

export function DepotFormDialog({ open, onOpenChange, depot, onSuccess }: DepotFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    lat: "",
    lng: "",
    capacity_pallets: "1000",
    status: "active" as "active" | "inactive",
  })

  useEffect(() => {
    if (depot) {
      setForm({
        name: depot.name,
        city: depot.city,
        address: depot.address || "",
        lat: depot.lat.toString(),
        lng: depot.lng.toString(),
        capacity_pallets: depot.capacity_pallets.toString(),
        status: depot.status,
      })
    } else {
      setForm({
        name: "",
        city: "",
        address: "",
        lat: "",
        lng: "",
        capacity_pallets: "1000",
        status: "active",
      })
    }
  }, [depot, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const data = {
      name: form.name,
      city: form.city,
      address: form.address,
      lat: Number.parseFloat(form.lat),
      lng: Number.parseFloat(form.lng),
      capacity_pallets: Number.parseInt(form.capacity_pallets),
      status: form.status,
    }

    if (depot) {
      await supabase.from("depots").update(data).eq("id", depot.id)
    } else {
      await supabase.from("depots").insert(data)
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{depot ? "Depo Düzenle" : "Yeni Depo Ekle"}</DialogTitle>
          <DialogDescription>Depo bilgilerini girin. Tüm alanlar zorunludur.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Depo Adı</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="İstanbul Ana Depo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Şehir</Label>
              <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Şehir seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="İstanbul">İstanbul</SelectItem>
                  <SelectItem value="Ankara">Ankara</SelectItem>
                  <SelectItem value="İzmir">İzmir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Tam adres"
            />
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
                placeholder="41.0082"
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
                placeholder="28.9784"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Kapasite (Palet)</Label>
              <Input
                id="capacity"
                type="number"
                value={form.capacity_pallets}
                onChange={(e) => setForm({ ...form, capacity_pallets: e.target.value })}
                placeholder="1000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : depot ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
