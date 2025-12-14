export interface Point {
  id: string
  lat: number
  lng: number
  demand: number // palet cinsinden
  demandKg: number
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
  capacityPallets: number
  capacityKg: number
  costPerKm: number
  fuelConsumptionPer100km: number
  fixedDailyCost: number
  avgSpeedKmh: number
}

export interface RouteResult {
  vehicleId: string
  depotId: string
  stops: string[] // customer IDs in order
  totalDistance: number // km
  totalDuration: number // minutes
  totalLoad: number // pallets
  totalKg: number
  totalCost: number
  fuelCost: number
  distanceCost: number
  fixedCost: number
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
