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
}

export interface DepotPoint extends Point {
  capacity: number
}

export interface VehicleConfig {
  id: string
  depotId: string
  plate: string
  vehicleType: "kamyon" | "tir" // Araç tipi
  capacityPallets: number
  capacityKg: number
  capacityM3: number // Hacim kapasitesi
  costPerKm: number
  fuelConsumptionPer100km: number
  fixedDailyCost: number
  avgSpeedKmh: number
  maxWorkHours: number // Maksimum çalışma saati
  mandatoryBreakMin: number // Zorunlu mola
}

export interface RouteResult {
  vehicleId: string
  depotId: string
  stops: string[] // customer IDs in order
  stopTimes: {
    // Her durağın varış zamanı
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
  totalCost: number
  fuelCost: number
  distanceCost: number
  fixedCost: number
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
