"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Vehicle, Depot } from "@/types/database"
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
import { VEHICLE_TYPES } from "@/lib/constants"

interface VehicleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: Vehicle | null
  depots?: Depot[]
  onSuccess?: () => void
}

export function VehicleFormDialog({ open, onOpenChange, vehicle, depots = [], onSuccess }: VehicleFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const prevOpenRef = useRef(false)
  const [form, setForm] = useState({
    plate: "",
    depot_id: "",
    vehicle_type: "kamyon" as "kamyon" | "tir",
    capacity_pallets: "12",
    capacity_kg: "8000",
    capacity_m3: "25", // Hacim kapasitesi eklendi
    cost_per_km: "2.20",
    fuel_consumption_per_100km: "18",
    fixed_daily_cost: "450",
    avg_speed_kmh: "65",
    max_work_hours: "11", // Maksimum çalışma saati eklendi
    mandatory_break_min: "45", // Zorunlu mola eklendi
    status: "available" as Vehicle["status"],
  })

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current
    prevOpenRef.current = open

    if (!justOpened) return

    if (vehicle) {
      setForm({
        plate: vehicle.plate,
        depot_id: vehicle.depot_id,
        vehicle_type: vehicle.vehicle_type,
        capacity_pallets: vehicle.capacity_pallets.toString(),
        capacity_kg: vehicle.capacity_kg.toString(),
        capacity_m3: vehicle.capacity_m3?.toString() || "25", // Hacim kapasitesi
        cost_per_km: vehicle.cost_per_km.toString(),
        fuel_consumption_per_100km: vehicle.fuel_consumption_per_100km.toString(),
        fixed_daily_cost: vehicle.fixed_daily_cost.toString(),
        avg_speed_kmh: vehicle.avg_speed_kmh.toString(),
        max_work_hours: vehicle.max_work_hours?.toString() || "11", // Çalışma saati
        mandatory_break_min: vehicle.mandatory_break_min?.toString() || "45", // Mola süresi
        status: vehicle.status,
      })
    } else {
      setForm({
        plate: "",
        depot_id: depots[0]?.id || "",
        vehicle_type: "kamyon",
        capacity_pallets: "12",
        capacity_kg: "8000",
        capacity_m3: "25",
        cost_per_km: "2.20",
        fuel_consumption_per_100km: "18",
        fixed_daily_cost: "450",
        avg_speed_kmh: "65",
        max_work_hours: "11",
        mandatory_break_min: "45",
        status: "available",
      })
    }
  }, [open, vehicle])

  function handleTypeChange(type: "kamyon" | "tir") {
    const config = VEHICLE_TYPES[type]
    setForm({
      ...form,
      vehicle_type: type,
      capacity_pallets: config.capacity_pallets.toString(),
      capacity_kg: type === "kamyon" ? "8000" : "24000",
      capacity_m3: type === "kamyon" ? "25" : "80", // Hacim TIR için daha büyük
      fuel_consumption_per_100km: config.fuel_consumption.toString(),
      avg_speed_kmh: config.avg_speed.toString(),
      cost_per_km: type === "kamyon" ? "2.20" : "3.50",
      fixed_daily_cost: type === "kamyon" ? "450" : "750",
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const data = {
      plate: form.plate,
      depot_id: form.depot_id,
      vehicle_type: form.vehicle_type,
      capacity_pallets: Number.parseInt(form.capacity_pallets),
      capacity_kg: Number.parseFloat(form.capacity_kg),
      capacity_m3: Number.parseFloat(form.capacity_m3), // Hacim kaydediliyor
      cost_per_km: Number.parseFloat(form.cost_per_km),
      fuel_consumption_per_100km: Number.parseFloat(form.fuel_consumption_per_100km),
      fixed_daily_cost: Number.parseFloat(form.fixed_daily_cost),
      avg_speed_kmh: Number.parseInt(form.avg_speed_kmh),
      max_work_hours: Number.parseInt(form.max_work_hours), // Çalışma saati kaydediliyor
      mandatory_break_min: Number.parseInt(form.mandatory_break_min), // Mola kaydediliyor
      status: form.status,
    }

    if (vehicle) {
      await supabase.from("vehicles").update(data).eq("id", vehicle.id)
    } else {
      await supabase.from("vehicles").insert(data)
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Araç Düzenle" : "Yeni Araç Ekle"}</DialogTitle>
          <DialogDescription>Araç bilgilerini girin.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Plaka</Label>
              <Input
                id="plate"
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                placeholder="34 ABC 123"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depot">Depo</Label>
              <Select value={form.depot_id} onValueChange={(v) => setForm({ ...form, depot_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Depo seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(depots || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Araç Tipi</Label>
              <Select value={form.vehicle_type} onValueChange={(v) => handleTypeChange(v as "kamyon" | "tir")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kamyon">Kamyon (12 palet)</SelectItem>
                  <SelectItem value="tir">TIR (33 palet)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Vehicle["status"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Müsait</SelectItem>
                  <SelectItem value="in_route">Rotada</SelectItem>
                  <SelectItem value="maintenance">Bakımda</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity_pallets">Kapasite (Palet)</Label>
              <Input
                id="capacity_pallets"
                type="number"
                value={form.capacity_pallets}
                onChange={(e) => setForm({ ...form, capacity_pallets: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_kg">Ağırlık (kg)</Label>
              <Input
                id="capacity_kg"
                type="number"
                value={form.capacity_kg}
                onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_m3">Hacim (m³)</Label>
              <Input
                id="capacity_m3"
                type="number"
                step="0.1"
                value={form.capacity_m3}
                onChange={(e) => setForm({ ...form, capacity_m3: e.target.value })}
                placeholder="25"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_work_hours">Maks. Çalışma (saat)</Label>
              <Input
                id="max_work_hours"
                type="number"
                min="8"
                max="12"
                value={form.max_work_hours}
                onChange={(e) => setForm({ ...form, max_work_hours: e.target.value })}
                placeholder="11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandatory_break_min">Zorunlu Mola (dk)</Label>
              <Input
                id="mandatory_break_min"
                type="number"
                min="30"
                max="60"
                value={form.mandatory_break_min}
                onChange={(e) => setForm({ ...form, mandatory_break_min: e.target.value })}
                placeholder="45"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avg_speed">Ort. Hız (km/s)</Label>
              <Input
                id="avg_speed"
                type="number"
                value={form.avg_speed_kmh}
                onChange={(e) => setForm({ ...form, avg_speed_kmh: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_per_km">Maliyet/km (TL)</Label>
              <Input
                id="cost_per_km"
                type="number"
                step="0.01"
                value={form.cost_per_km}
                onChange={(e) => setForm({ ...form, cost_per_km: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel">Yakıt (L/100km)</Label>
              <Input
                id="fuel"
                type="number"
                step="0.1"
                value={form.fuel_consumption_per_100km}
                onChange={(e) => setForm({ ...form, fuel_consumption_per_100km: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixed_cost">Sabit Maliyet/gün</Label>
              <Input
                id="fixed_cost"
                type="number"
                value={form.fixed_daily_cost}
                onChange={(e) => setForm({ ...form, fixed_daily_cost: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : vehicle ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
