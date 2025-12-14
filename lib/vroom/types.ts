// VROOM API Input/Output Types
// Ref: https://github.com/VROOM-Project/vroom/blob/master/docs/API.md

export interface VroomLocation {
  lat: number
  lng: number
}

export interface VroomJob {
  id: number
  description?: string
  location: [number, number] // [lng, lat] - VROOM uses lng,lat order
  service?: number // Service time in seconds
  delivery?: number[] // Delivery amounts
  pickup?: number[] // Pickup amounts
  skills?: number[] // Required skills
  priority?: number // 0-100, higher = more important
  time_windows?: [number, number][] // Unix timestamps
}

export interface VroomShipment {
  pickup: VroomShipmentStep
  delivery: VroomShipmentStep
}

export interface VroomShipmentStep {
  id: number
  location: [number, number]
  service?: number
  time_windows?: [number, number][]
}

export interface VroomVehicle {
  id: number
  profile?: string // "car", "truck", etc.
  description?: string
  start: [number, number] // Start location [lng, lat]
  end?: [number, number] // End location (defaults to start)
  capacity?: number[] // Capacity for each dimension
  skills?: number[] // Available skills
  time_window?: [number, number] // Working hours
  max_tasks?: number // Max number of jobs
  max_travel_time?: number // Max travel time in seconds
  max_distance?: number // Max travel distance in meters
  speed_factor?: number // Multiplier for travel times
  costs?: {
    fixed?: number
    per_hour?: number
    per_km?: number
  }
}

export interface VroomRequest {
  jobs: VroomJob[]
  vehicles: VroomVehicle[]
  shipments?: VroomShipment[]
  options?: {
    g?: boolean // Geometry
    c?: boolean // Custom matrix
  }
}

export interface VroomStep {
  type: "start" | "job" | "pickup" | "delivery" | "break" | "end"
  location: [number, number]
  id?: number
  service?: number
  waiting_time?: number
  job?: number
  arrival: number
  duration: number
  distance?: number
  load?: number[]
}

export interface VroomRoute {
  vehicle: number
  cost: number
  service: number
  duration: number
  waiting_time: number
  priority: number
  distance: number
  steps: VroomStep[]
  geometry?: string // Encoded polyline
  delivery?: number[]
  pickup?: number[]
}

export interface VroomUnassigned {
  id: number
  type: "job" | "shipment"
  location?: [number, number]
}

export interface VroomSummary {
  cost: number
  routes: number
  unassigned: number
  setup: number
  service: number
  duration: number
  waiting_time: number
  priority: number
  distance: number
  computing_times?: {
    loading: number
    solving: number
    routing: number
  }
}

export interface VroomResponse {
  code: number // 0 = success, 1 = internal error, 2 = input error, 3 = routing error
  error?: string
  summary: VroomSummary
  routes: VroomRoute[]
  unassigned: VroomUnassigned[]
}

// Our application types
export interface VroomOptimizationRequest {
  depotId?: string // Optional: optimize for specific depot
  useAllVehicles?: boolean
  fuelPricePerLiter: number
  maxRouteDistanceKm?: number
  maxRouteTimeMin?: number
  includeGeometry?: boolean
}

export interface VroomOptimizationResult {
  success: boolean
  error?: string
  summary: {
    totalRoutes: number
    totalDistance: number // km
    totalDuration: number // minutes
    totalCost: number // TL
    fuelCost: number
    fixedCost: number
    distanceCost: number
    unassignedCount: number
    computationTimeMs: number
  }
  routes: VroomRouteResult[]
  unassigned: string[] // Customer IDs
}

export interface VroomRouteResult {
  vehicleId: string
  vehiclePlate: string
  depotId: string
  depotName: string
  stops: VroomStopResult[]
  distance: number // km
  duration: number // minutes
  cost: number
  fuelCost: number
  fixedCost: number
  distanceCost: number
  load: number // pallets
  geometry?: string
}

export interface VroomStopResult {
  customerId: string
  customerName: string
  address: string
  lat: number
  lng: number
  arrivalTime: number // minutes from start
  serviceTime: number // minutes
  distanceFromPrev: number // km
  load: number // cumulative pallets
}
