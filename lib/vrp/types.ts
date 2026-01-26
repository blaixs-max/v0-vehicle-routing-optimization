export interface Point {
  id: string
  lat: number
  lng: number
  demand: number // palet cinsinden
  demandKg: number
  demandM3: number // Hacim talebi
  serviceDurationMin: number // Servis süresi
  timeWindowStart: string | null // Teslimat başlangıç
  timeWindowEnd: string | null // Teslimat bitiş
  requiredVehicleType: "any" | "kamyon" | "tir" // Araç tipi kısıtı
  priority: number
  name?: string
  businessType?: "MCD" | "IKEA" | "CHL" | "OPT" | "OTHER"
}

export interface DepotPoint extends Point {
  capacity: number
}

export interface VehicleConfig {
  id: string
  depotId: string
  plate: string
  vehicleType: "kamyonet" | "kamyon_1" | "kamyon_2" | "tir" | "romork"
  capacityPallets: number
  capacityKg: number // Kullanılmayacak
  capacityM3: number // Kullanılmayacak
  costPerKm: number // Kapsam dışı
  fuelConsumptionPer100km: number
  fixedDailyCost: number // Kapsam dışı
  avgSpeedKmh: number
  maxWorkHours: number // 9 saat
  mandatoryBreakMin: number // 45 dakika
  breakAfterHours: number // 4.5 saat
}

export interface RouteResult {
  vehicleId: string
  depotId: string
  stops: string[] // customer IDs in order
  stopTimes: {
    customerId: string
    arrivalTime: string // HH:mm formatında
    departureTime: string // Servis sonrası çıkış
  }[]
  totalDistance: number // km
  totalDuration: number // minutes (sürüş + servis + molalar)
  totalDrivingTime: number // Sadece sürüş süresi
  totalServiceTime: number // Toplam servis süresi
  totalBreakTime: number // Toplam mola süresi
  totalLoad: number // pallets
  totalKg: number
  totalM3: number // Toplam hacim
  totalCost: number // Yakıt + Geçiş
  fuelCost: number
  fixedCost?: number // Sabit günlük maliyet
  distanceCost?: number // Mesafe bazlı maliyet
  tollCost: number // Köprü/otoyol
  feasible: boolean // Rotanın fizibilitesi
  violations: string[] // Kısıt ihlalleri listesi
}

export interface OptimizationResult {
  routes: RouteResult[]
  totalDistance: number
  totalCost: number
  totalVehiclesUsed: number
  unassignedCustomers: string[]
  computationTimeMs: number
  algorithm: string
}

export interface DistanceMatrix {
  [fromId: string]: {
    [toId: string]: {
      distance: number // km
      duration: number // minutes
    }
  }
}

export interface OptimizationParams {
  fuelPricePerLiter: number
  maxRouteDistance?: number // km
  maxRouteTime?: number // minutes
  useRealDistances: boolean
}
