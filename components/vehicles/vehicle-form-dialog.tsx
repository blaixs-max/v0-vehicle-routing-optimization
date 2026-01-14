"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
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
    vehicle_type: "kamyonet" as "kamyonet" | "kamyon_1" | "kamyon_2" | "tir" | "romork",
    capacity_pallets: "10",
    capacity_kg: "7500",
    capacity_m3: "20",
    cost_per_km: "2.20",
    fuel_consumption_per_100km: "15",
    fixed_daily_cost: "450",
    avg_speed_kmh: "65",
    max_work_hours: "11",
    mandatory_break_min: "45",
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
        capacity_m3: vehicle.capacity_m3?.toString() || "20",
        cost_per_km: vehicle.cost_per_km.toString(),
        fuel_consumption_per_100km: vehicle.fuel_consumption_per_100km.toString(),
        fixed_daily_cost: vehicle.fixed_daily_cost.toString(),
        avg_speed_kmh: vehicle.avg_speed_kmh.toString(),
        max_work_hours: vehicle.max_work_hours?.toString() || "11",
        mandatory_break_min: vehicle.mandatory_break_min?.toString() || "45",
        status: vehicle.status,
      })
    } else {
      setForm({
        plate: "",
        depot_id: depots[0]?.id || "",
        vehicle_type: "kamyonet",
        capacity_pallets: "10",
        capacity_kg: "7500",
        capacity_m3: "20",
        cost_per_km: "2.20",
        fuel_consumption_per_100km: "15",
        fixed_daily_cost: "450",
        avg_speed_kmh: "65",
        max_work_hours: "11",
        mandatory_break_min: "45",
        status: "available",
      })
    }
  }, [open, vehicle])

  function handleTypeChange(type: "kamyonet" | "kamyon_1" | "kamyon_2" | "tir" | "romork") {
    const config = VEHICLE_TYPES[type]
    setForm({
      ...form,
      vehicle_type: type,
      capacity_pallets: config.capacity_pallets.toString(),
      fuel_consumption_per_100km: config.fuel_consumption.toString(),
      capacity_kg:
        type === "kamyonet"
          ? "7500"
          : type === "kamyon_1"
            ? "10000"
            : type === "kamyon_2"
              ? "13000"
              : type === "tir"
                ? "24000"
                : "26000",
      capacity_m3:
        type === "kamyonet"
          ? "20"
          : type === "kamyon_1"
            ? "30"
            : type === "kamyon_2"
              ? "45"
              : type === "tir"
                ? "80"
                : "90",
      cost_per_km:
        type === "kamyonet"
          ? "1.80"
          : type === "kamyon_1"
            ? "2.20"
            : type === "kamyon_2"
              ? "2.80"
              : type === "tir"
                ? "3.50"
                : "4.00",
      fixed_daily_cost:
        type === "kamyonet"
          ? "300"
          : type === "kamyon_1"
            ? "450"
            : type === "kamyon_2"
              ? "550"
              : type === "tir"
                ? "750"
                : "850",
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        plate: form.plate,
        depot_id: form.depot_id,
        vehicle_type: form.vehicle_type,
        capacity_pallets: Number.parseInt(form.capacity_pallets),
        capacity_kg: Number.parseFloat(form.capacity_kg),
        capacity_m3: Number.parseFloat(form.capacity_m3),
        cost_per_km: Number.parseFloat(form.cost_per_km),
        fuel_consumption_per_100km: Number.parseFloat(form.fuel_consumption_per_100km),
        fixed_daily_cost: Number.parseFloat(form.fixed_daily_cost),
        avg_speed_kmh: Number.parseInt(form.avg_speed_kmh),
        max_work_hours: Number.parseInt(form.max_work_hours),
        mandatory_break_min: Number.parseInt(form.mandatory_break_min),
        status: form.status,
      }

      if (vehicle) {
        await fetch(`/api/vehicles?id=${vehicle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else {
        await fetch("/api/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save vehicle:", error)
    } finally {
      setLoading(false)
    }
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
              <Select
                value={form.vehicle_type}
                onValueChange={(v) => handleTypeChange(v as "kamyonet" | "kamyon_1" | "kamyon_2" | "tir" | "romork")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kamyonet">Kamyonet (10 palet - 15L/100km)</SelectItem>
                  <SelectItem value="kamyon_1">Kamyon Tip 1 (14 palet - 20L/100km)</SelectItem>
                  <SelectItem value="kamyon_2">Kamyon Tip 2 (18 palet - 30L/100km)</SelectItem>
                  <SelectItem value="tir">TIR (32 palet - 35L/100km)</SelectItem>
                  <SelectItem value="romork">Kamyon Romork (36 palet - 40L/100km)</SelectItem>
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
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_kg">Ağırlık (kg)</Label>
              <Input
                id="capacity_kg"
                type="number"
                value={form.capacity_kg}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_m3">Hacim (m³)</Label>
              <Input
                id="capacity_m3"
                type="number"
                step="0.1"
                value={form.capacity_m3}
                readOnly
                className="bg-muted cursor-not-allowed"
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
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixed_cost">Sabit Maliyet/gün</Label>
              <Input
                id="fixed_cost"
                type="number"
                value={form.fixed_daily_cost}
                readOnly
                className="bg-muted cursor-not-allowed"
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
