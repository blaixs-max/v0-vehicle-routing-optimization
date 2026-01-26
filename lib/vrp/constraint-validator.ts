// Rota kısıt doğrulama fonksiyonları

import type { Vehicle, Customer, Depot } from "@/types/database"
import { DRIVER_RULES } from "@/lib/constants"

export interface RouteConstraintViolation {
  type:
  | "time_window"
  | "capacity_weight"
  | "capacity_volume"
  | "capacity_pallet"
  | "work_hours"
  | "vehicle_type"
  | "driver_break"
  severity: "error" | "warning"
  message: string
  stopIndex?: number
}

export interface ValidatedRoute {
  isValid: boolean
  violations: RouteConstraintViolation[]
  stops: any[]
  vehicle: Vehicle
  depot: Depot
}

export function parseTimeRestrictions(restrictions: string | null): {
  beforeTime: string | null // "20:00 den önce verilemiyor" → "20:00"
  afterTime: string | null // "23:00 den sonra verilemiyor" → "23:00"
  prohibitedPeriods: { start: string; end: string }[] // "08:00-19:00 arası verilemiyor"
} {
  if (!restrictions) return { beforeTime: null, afterTime: null, prohibitedPeriods: [] }

  const result = {
    beforeTime: null as string | null,
    afterTime: null as string | null,
    prohibitedPeriods: [] as { start: string; end: string }[],
  }

  // "20:00 den önce verilemiyor" → 20:00'dan SONRA teslim edilmeli
  const beforeMatch = restrictions.match(/(\d{2}:\d{2})\s*den\s*önce\s*verilemiyor/i)
  if (beforeMatch) {
    result.beforeTime = beforeMatch[1]
  }

  // "23:00 den sonra verilemiyor" → 23:00'dan ÖNCE teslim edilmeli
  const afterMatch = restrictions.match(/(\d{2}:\d{2})\s*den\s*sonra\s*verilemiyor/i)
  if (afterMatch) {
    result.afterTime = afterMatch[1]
  }

  // "08:00-19:00 arası verilemiyor" → Bu saat aralığında yasak
  const periodMatch = restrictions.match(/(\d{2}:\d{2})-(\d{2}:\d{2})\s*arası\s*verilemiyor/i)
  if (periodMatch) {
    result.prohibitedPeriods.push({ start: periodMatch[1], end: periodMatch[2] })
  }

  return result
}

// Zaman penceresi kontrolü
export function validateTimeWindows(
  stops: any[],
  depot: Depot,
  vehicle: Vehicle,
  customers: Customer[],
): RouteConstraintViolation[] {
  const violations: RouteConstraintViolation[] = []
  let currentTime = 0 // Dakika cinsinden

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i]
    const customer = customers.find((c) => c.id === stop.customerId)

    if (!customer) continue

    // Müşterinin zaman penceresi var mı?
    if (customer.time_window_start && customer.time_window_end) {
      const [startHour, startMin] = customer.time_window_start.split(":").map(Number)
      const [endHour, endMin] = customer.time_window_end.split(":").map(Number)

      const windowStart = startHour * 60 + startMin
      const windowEnd = endHour * 60 + endMin

      // Varış zamanı
      const arrivalTime = stop.arrivalTime || currentTime

      if (arrivalTime < windowStart) {
        violations.push({
          type: "time_window",
          severity: "warning",
          message: `${customer.name} için erken varış (${Math.floor(arrivalTime / 60)}:${(arrivalTime % 60).toString().padStart(2, "0")}). Pencere: ${customer.time_window_start}-${customer.time_window_end}`,
          stopIndex: i,
        })
      } else if (arrivalTime > windowEnd) {
        violations.push({
          type: "time_window",
          severity: "error",
          message: `${customer.name} için geç varış (${Math.floor(arrivalTime / 60)}:${(arrivalTime % 60).toString().padStart(2, "0")}). Pencere: ${customer.time_window_start}-${customer.time_window_end}`,
          stopIndex: i,
        })
      }

      currentTime = Math.max(arrivalTime, windowStart) + (customer.service_duration_min || customer.service_duration || 15)
    } else {
      currentTime += stop.serviceTime || 15
    }
  }

  return violations
}

// Çok boyutlu kapasite kontrolü
export function validateCapacity(stops: any[], vehicle: Vehicle, customers: Customer[]): RouteConstraintViolation[] {
  const violations: RouteConstraintViolation[] = []

  let totalWeight = 0
  let totalVolume = 0
  let totalPallets = 0

  for (const stop of stops) {
    const customer = customers.find((c) => c.id === stop.customerId)
    if (!customer) continue

    totalWeight += customer.demand_kg || 0
    totalVolume += customer.demand_m3 || 0
    totalPallets += customer.demand_pallets || customer.demand_pallet || 1
  }

  // Ağırlık kontrolü
  if (vehicle.capacity_kg && totalWeight > vehicle.capacity_kg) {
    violations.push({
      type: "capacity_weight",
      severity: "error",
      message: `Ağırlık kapasitesi aşıldı: ${totalWeight}kg / ${vehicle.capacity_kg}kg`,
    })
  }

  // Hacim kontrolü
  if (vehicle.capacity_m3 && totalVolume > vehicle.capacity_m3) {
    violations.push({
      type: "capacity_volume",
      severity: "error",
      message: `Hacim kapasitesi aşıldı: ${totalVolume}m³ / ${vehicle.capacity_m3}m³`,
    })
  }

  // Palet kontrolü
  const palletCapacity = vehicle.capacity_pallets || 12
  if (totalPallets > palletCapacity) {
    violations.push({
      type: "capacity_pallet",
      severity: "error",
      message: `Palet kapasitesi aşıldı: ${totalPallets} / ${palletCapacity}`,
    })
  }

  return violations
}

// Sürücü çalışma saati kontrolü
export function validateWorkHours(totalDuration: number, vehicle: Vehicle): RouteConstraintViolation[] {
  const violations: RouteConstraintViolation[] = []

  const maxWorkHours = vehicle.driver_max_work_hours || 11
  const maxWorkMinutes = maxWorkHours * 60

  if (totalDuration > maxWorkMinutes) {
    violations.push({
      type: "work_hours",
      severity: "error",
      message: `Sürücü çalışma saati aşıldı: ${Math.round(totalDuration / 60)}sa / ${maxWorkHours}sa`,
    })
  }

  return violations
}

export function validateDriverBreak(drivingTimeMinutes: number, vehicle: Vehicle): RouteConstraintViolation[] {
  const violations: RouteConstraintViolation[] = []

  const maxDrivingBeforeBreak = (vehicle.driver_break_after_hours || DRIVER_RULES.break_after_hours) * 60
  const breakDuration = vehicle.driver_break_duration || DRIVER_RULES.break_duration

  if (drivingTimeMinutes > maxDrivingBeforeBreak) {
    // Mola gerekli
    const expectedBreaks = Math.floor(drivingTimeMinutes / maxDrivingBeforeBreak)
    violations.push({
      type: "driver_break",
      severity: "warning",
      message: `${expectedBreaks} mola gerekli (${maxDrivingBeforeBreak} dk başına ${breakDuration} dk mola)`,
    })
  }

  return violations
}

// Araç tipi uygunluk kontrolü
export function validateVehicleType(stops: any[], vehicle: Vehicle, customers: Customer[]): RouteConstraintViolation[] {
  const violations: RouteConstraintViolation[] = []

  for (const stop of stops) {
    const customer = customers.find((c) => c.id === stop.customerId)
    if (!customer || !customer.required_vehicle_types) continue

    const requiredTypes = customer.required_vehicle_types
    const vehicleType = vehicle.vehicle_type || vehicle.type

    if (requiredTypes.length > 0 && !requiredTypes.includes(vehicleType)) {
      violations.push({
        type: "vehicle_type",
        severity: "error",
        message: `${customer.name} için uygun araç tipi değil. Gerekli: ${requiredTypes.join(", ")}, Mevcut: ${vehicleType}`,
        stopIndex: stops.indexOf(stop),
      })
    }
  }

  return violations
}

// Tüm kısıtları kontrol et
export function validateRoute(route: any, vehicle: Vehicle, depot: Depot, customers: Customer[]): ValidatedRoute {
  const violations: RouteConstraintViolation[] = []

  // Zaman penceresi kontrolü
  violations.push(...validateTimeWindows(route.stops, depot, vehicle, customers))

  // Kapasite kontrolü
  violations.push(...validateCapacity(route.stops, vehicle, customers))

  // Çalışma saati kontrolü
  violations.push(...validateWorkHours(route.totalDuration || 0, vehicle))

  // Sürücü mola kontrolü
  violations.push(...validateDriverBreak(route.totalDuration || 0, vehicle))

  // Araç tipi kontrolü
  violations.push(...validateVehicleType(route.stops, vehicle, customers))

  const hasErrors = violations.some((v) => v.severity === "error")

  return {
    isValid: !hasErrors,
    violations,
    stops: route.stops,
    vehicle,
    depot,
  }
}
