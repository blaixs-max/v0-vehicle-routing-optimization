import { VROOM_CONFIG } from "@/lib/constants"
import type { Depot, Vehicle, Customer } from "@/lib/types"

// VROOM API tipleri
export interface VroomJob {
  id: number
  description?: string
  location: [number, number] // [lng, lat]
  service?: number // saniye
  delivery?: number[]
  pickup?: number[]
  priority?: number
  time_windows?: [number, number][]
}

export interface VroomVehicle {
  id: number
  description?: string
  profile?: string
  start: [number, number]
  end?: [number, number]
  capacity?: number[]
  time_window?: [number, number]
  max_tasks?: number
  max_travel_time?: number
  max_distance?: number
  speed_factor?: number
  costs?: {
    fixed?: number
    per_hour?: number
    per_km?: number
  }
}

export interface VroomRequest {
  jobs: VroomJob[]
  vehicles: VroomVehicle[]
  options?: {
    g?: boolean // geometry
    c?: boolean // csv output
  }
}

export interface VroomStep {
  type: "start" | "job" | "pickup" | "delivery" | "break" | "end"
  location?: [number, number]
  job?: number
  service?: number
  arrival?: number
  duration?: number
  distance?: number
  waiting_time?: number
  load?: number[]
}

export interface VroomRouteResult {
  vehicle: number
  steps: VroomStep[]
  cost: number
  service: number
  duration: number
  waiting_time: number
  priority: number
  delivery?: number[]
  pickup?: number[]
  distance: number
  geometry?: string
}

export interface VroomUnassigned {
  id: number
  type: string
  location?: [number, number]
  description?: string
}

export interface VroomSummary {
  cost: number
  routes: number
  unassigned: number
  service: number
  duration: number
  waiting_time: number
  priority: number
  delivery?: number[]
  pickup?: number[]
  distance: number
  computing_times?: {
    loading: number
    solving: number
    routing: number
  }
}

export interface VroomResponse {
  code: number
  error?: string
  summary: VroomSummary
  routes: VroomRouteResult[]
  unassigned: VroomUnassigned[]
}

// Optimizasyon parametreleri
export interface OptimizationParams {
  fuelPricePerLiter: number
  maxRouteDistanceKm?: number
  maxRouteTimeMin?: number
  vehicleCapacityUtilization?: number // 0-1 arasi
  includeGeometry?: boolean
}

// Sonuc formati
export interface OptimizedRoute {
  vehicleId: string
  vehiclePlate: string
  vehicleType: string
  depotId: string
  depotName: string
  stops: {
    customerId: string
    customerName: string
    address: string
    lat: number
    lng: number
    stopOrder: number
    arrivalTime: number
    serviceTime: number
    distanceFromPrev: number
    demand: number
    cumulativeLoad: number
  }[]
  totalDistance: number
  totalDuration: number
  totalCost: number
  fuelCost: number
  fixedCost: number
  distanceCost: number
  totalLoad: number
  capacityUtilization: number
  geometry?: string
}

export interface OptimizationResult {
  success: boolean
  error?: string
  summary: {
    totalRoutes: number
    totalDistance: number
    totalDuration: number
    totalCost: number
    fuelCost: number
    fixedCost: number
    distanceCost: number
    unassignedCount: number
    computationTimeMs: number
    avgCapacityUtilization: number
  }
  routes: OptimizedRoute[]
  unassigned: string[]
}

// VROOM Client
export class VroomClient {
  private endpoint: string

  constructor(endpoint?: string) {
    this.endpoint = endpoint || VROOM_CONFIG.url
  }

  // Veriyi VROOM formatina cevir
  buildRequest(depots: Depot[], vehicles: Vehicle[], customers: Customer[], options: OptimizationParams): VroomRequest {
    // Joblar (musteri teslimat noktalari)
    const jobs: VroomJob[] = customers.map((customer, index) => ({
      id: index + 1,
      description: customer.id,
      location: [customer.lng, customer.lat],
      service: 15 * 60, // 15 dakika servis suresi
      delivery: [customer.demand_pallets || customer.demand_pallet || 1],
      priority: Math.min(100, (6 - (customer.priority || 3)) * 20), // 1-5 -> 100-20
    }))

    // Araclar
    const vroomVehicles: VroomVehicle[] = vehicles
      .filter((v) => v.status === "active" || v.status === "available")
      .map((vehicle, index) => {
        const depot = depots.find((d) => d.id === vehicle.depot_id)
        if (!depot) {
          console.warn(`Depot bulunamadi: ${vehicle.depot_id}, varsayilan depo kullaniliyor`)
          // Varsayilan olarak ilk depoyu kullan
          const defaultDepot = depots[0]
          if (!defaultDepot) {
            throw new Error("Hic depo bulunamadi")
          }
          return createVroomVehicle(vehicle, defaultDepot, index, options)
        }
        return createVroomVehicle(vehicle, depot, index, options)
      })

    if (vroomVehicles.length === 0) {
      throw new Error("Kullanilabilir arac bulunamadi. Arac statusu 'active' veya 'available' olmali.")
    }

    if (jobs.length === 0) {
      throw new Error("Atanacak musteri bulunamadi.")
    }

    return {
      jobs,
      vehicles: vroomVehicles,
      options: {
        g: options.includeGeometry ?? true,
      },
    }
  }

  // VROOM API cagir
  async optimize(request: VroomRequest): Promise<VroomResponse> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`VROOM API hatasi: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  // Sonucu parse et
  parseResponse(
    response: VroomResponse,
    depots: Depot[],
    vehicles: Vehicle[],
    customers: Customer[],
    options: OptimizationParams,
  ): OptimizationResult {
    if (response.code !== 0) {
      return {
        success: false,
        error: response.error || "Bilinmeyen VROOM hatasi",
        summary: {
          totalRoutes: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalCost: 0,
          fuelCost: 0,
          fixedCost: 0,
          distanceCost: 0,
          unassignedCount: response.unassigned?.length || 0,
          computationTimeMs: 0,
          avgCapacityUtilization: 0,
        },
        routes: [],
        unassigned: [],
      }
    }

    // Lookup mapleri
    const customerMap = new Map<number, Customer>()
    customers.forEach((c, i) => customerMap.set(i + 1, c))

    const vehicleMap = new Map<number, Vehicle>()
    vehicles
      .filter((v) => v.status === "active" || v.status === "available")
      .forEach((v, i) => vehicleMap.set(i + 1, v))

    // Rotalari parse et
    const routes: OptimizedRoute[] = response.routes.map((route) => {
      const vehicle = vehicleMap.get(route.vehicle)!
      const depot = depots.find((d) => d.id === vehicle.depot_id)!

      // Maliyet hesapla
      const distanceKm = route.distance / 1000
      const fuelConsumption = (distanceKm / 100) * (vehicle.fuel_consumption_per_100km || 20)
      const fuelCost = fuelConsumption * options.fuelPricePerLiter
      const distanceCost = distanceKm * (vehicle.cost_per_km || 2)
      const fixedCost = vehicle.fixed_daily_cost || 500
      const totalCost = fuelCost + distanceCost + fixedCost

      // Duraklari parse et
      const stops: OptimizedRoute["stops"] = []
      let prevLat = depot.lat
      let prevLng = depot.lng
      let cumulativeLoad = 0
      let stopOrder = 0

      for (const step of route.steps) {
        if (step.type === "job" && step.job !== undefined) {
          const customer = customerMap.get(step.job)
          if (customer) {
            stopOrder++
            const demand = customer.demand_pallets || customer.demand_pallet || 1
            cumulativeLoad += demand

            // Onceki noktadan mesafe (basit haversine)
            const distFromPrev = haversineDistance(prevLat, prevLng, customer.lat, customer.lng)

            stops.push({
              customerId: customer.id,
              customerName: customer.name,
              address: customer.address,
              lat: customer.lat,
              lng: customer.lng,
              stopOrder,
              arrivalTime: Math.round((step.arrival || 0) / 60),
              serviceTime: Math.round((step.service || 0) / 60),
              distanceFromPrev: Math.round(distFromPrev * 100) / 100,
              demand,
              cumulativeLoad,
            })

            prevLat = customer.lat
            prevLng = customer.lng
          }
        }
      }

      // Kapasite kullanim orani
      const vehicleCapacity = vehicle.capacity_pallet || vehicle.capacity_pallets || 12
      const capacityUtilization = cumulativeLoad / vehicleCapacity

      return {
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        vehicleType: vehicle.vehicle_type,
        depotId: depot.id,
        depotName: depot.name,
        stops,
        totalDistance: Math.round(distanceKm * 100) / 100,
        totalDuration: Math.round(route.duration / 60),
        totalCost: Math.round(totalCost * 100) / 100,
        fuelCost: Math.round(fuelCost * 100) / 100,
        fixedCost: Math.round(fixedCost * 100) / 100,
        distanceCost: Math.round(distanceCost * 100) / 100,
        totalLoad: cumulativeLoad,
        capacityUtilization: Math.round(capacityUtilization * 100),
        geometry: route.geometry,
      }
    })

    // Atanamayanlar
    const unassigned = response.unassigned.map((u) => {
      const customer = customerMap.get(u.id)
      return customer?.id || `unknown-${u.id}`
    })

    // Toplamlar
    const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0)
    const totalDuration = routes.reduce((sum, r) => sum + r.totalDuration, 0)
    const totalFuelCost = routes.reduce((sum, r) => sum + r.fuelCost, 0)
    const totalFixedCost = routes.reduce((sum, r) => sum + r.fixedCost, 0)
    const totalDistanceCost = routes.reduce((sum, r) => sum + r.distanceCost, 0)
    const totalCost = totalFuelCost + totalFixedCost + totalDistanceCost
    const avgCapacityUtilization =
      routes.length > 0 ? routes.reduce((sum, r) => sum + r.capacityUtilization, 0) / routes.length : 0

    return {
      success: true,
      summary: {
        totalRoutes: routes.length,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDuration: Math.round(totalDuration),
        totalCost: Math.round(totalCost * 100) / 100,
        fuelCost: Math.round(totalFuelCost * 100) / 100,
        fixedCost: Math.round(totalFixedCost * 100) / 100,
        distanceCost: Math.round(totalDistanceCost * 100) / 100,
        unassignedCount: unassigned.length,
        computationTimeMs: response.summary.computing_times
          ? response.summary.computing_times.loading +
            response.summary.computing_times.solving +
            response.summary.computing_times.routing
          : 0,
        avgCapacityUtilization: Math.round(avgCapacityUtilization),
      },
      routes,
      unassigned,
    }
  }

  // Tam optimizasyon akisi
  async runOptimization(
    depots: Depot[],
    vehicles: Vehicle[],
    customers: Customer[],
    options: OptimizationParams,
  ): Promise<OptimizationResult> {
    try {
      if (!depots.length) {
        throw new Error("Depo bulunamadi")
      }
      if (!vehicles.length) {
        throw new Error("Arac bulunamadi")
      }
      if (!customers.length) {
        throw new Error("Musteri bulunamadi")
      }

      const request = this.buildRequest(depots, vehicles, customers, options)
      console.log("[v0] VROOM Request:", JSON.stringify(request, null, 2))

      const response = await this.optimize(request)
      console.log("[v0] VROOM Response:", JSON.stringify(response, null, 2))

      return this.parseResponse(response, depots, vehicles, customers, options)
    } catch (error) {
      console.error("[v0] VROOM Error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
        summary: {
          totalRoutes: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalCost: 0,
          fuelCost: 0,
          fixedCost: 0,
          distanceCost: 0,
          unassignedCount: customers.length,
          computationTimeMs: 0,
          avgCapacityUtilization: 0,
        },
        routes: [],
        unassigned: customers.map((c) => c.id),
      }
    }
  }
}

function createVroomVehicle(vehicle: Vehicle, depot: Depot, index: number, options: OptimizationParams): VroomVehicle {
  // Kapasite kullanim oranina gore efektif kapasite
  const effectiveCapacity = Math.floor(
    (vehicle.capacity_pallet || vehicle.capacity_pallets || 12) * (options.vehicleCapacityUtilization || 0.9),
  )

  const vroomVehicle: VroomVehicle = {
    id: index + 1,
    description: vehicle.id,
    profile: "car", // VROOM public demo sadece "car" destekliyor
    start: [depot.lng, depot.lat],
    end: [depot.lng, depot.lat], // Depoya don
    capacity: [effectiveCapacity],
    speed_factor: 1, // Varsayilan hiz
    costs: {
      fixed: Math.round((vehicle.fixed_daily_cost || 500) * 100),
      per_km: Math.round((vehicle.cost_per_km || 2) * 100),
    },
  }

  // Kisitlamalar
  if (options.maxRouteDistanceKm) {
    vroomVehicle.max_distance = options.maxRouteDistanceKm * 1000
  }
  if (options.maxRouteTimeMin) {
    vroomVehicle.max_travel_time = options.maxRouteTimeMin * 60
  }

  return vroomVehicle
}

// Haversine mesafe hesaplama
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Singleton instance
let vroomClient: VroomClient | null = null

export function getVroomClient(): VroomClient {
  if (!vroomClient) {
    vroomClient = new VroomClient()
  }
  return vroomClient
}
