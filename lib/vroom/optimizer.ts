import { VroomClient } from "./client"
import type { OptimizationResult, OptimizationParams } from "./client"
import type { VroomOptimizationRequest, VroomOptimizationResult } from "./types"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { DEFAULTS } from "@/lib/constants"

function convertToOptimizationParams(options: VroomOptimizationRequest): OptimizationParams {
  return {
    fuelPricePerLiter: options.fuelPricePerLiter || DEFAULTS.fuelPricePerLiter,
    maxRouteDistanceKm: options.maxRouteDistanceKm,
    maxRouteTimeMin: options.maxRouteTimeMin,
    vehicleCapacityUtilization: DEFAULTS.vehicleCapacityUtilization,
    includeGeometry: options.includeGeometry ?? true,
  }
}

function convertToVroomResult(result: OptimizationResult): VroomOptimizationResult {
  return {
    success: result.success,
    error: result.error,
    summary: {
      totalRoutes: result.summary.totalRoutes,
      totalDistance: result.summary.totalDistance,
      totalDuration: result.summary.totalDuration,
      totalCost: result.summary.totalCost,
      fuelCost: result.summary.fuelCost,
      fixedCost: result.summary.fixedCost,
      distanceCost: result.summary.distanceCost,
      unassignedCount: result.summary.unassignedCount,
      computationTimeMs: result.summary.computationTimeMs,
    },
    routes: result.routes.map((route) => ({
      vehicleId: route.vehicleId,
      vehiclePlate: route.vehiclePlate,
      depotId: route.depotId,
      depotName: route.depotName,
      stops: route.stops.map((stop) => ({
        customerId: stop.customerId,
        customerName: stop.customerName,
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng,
        arrivalTime: stop.arrivalTime,
        serviceTime: stop.serviceTime,
        distanceFromPrev: stop.distanceFromPrev,
        load: stop.cumulativeLoad,
      })),
      distance: route.totalDistance,
      duration: route.totalDuration,
      cost: route.totalCost,
      fuelCost: route.fuelCost,
      fixedCost: route.fixedCost,
      distanceCost: route.distanceCost,
      load: route.totalLoad,
      geometry: route.geometry,
    })),
    unassigned: result.unassigned,
  }
}

export async function optimizeWithVroom(
  depots: Depot[],
  vehicles: Vehicle[],
  customers: Customer[],
  options: VroomOptimizationRequest,
): Promise<VroomOptimizationResult> {
  const startTime = performance.now()

  try {
    const client = new VroomClient()

    // Belirli depo istendiyse filtrele
    let filteredVehicles = vehicles.filter((v) => v.status === "active" || v.status === "available")
    let filteredCustomers = customers.filter((c) => c.status !== "completed")

    if (options.depotId) {
      filteredVehicles = filteredVehicles.filter((v) => v.depot_id === options.depotId)
      filteredCustomers = filteredCustomers.filter((c) => c.assigned_depot_id === options.depotId)
    }

    if (filteredVehicles.length === 0) {
      return {
        success: false,
        error: "Kullanılabilir araç bulunamadı",
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
        },
        routes: [],
        unassigned: customers.map((c) => c.id),
      }
    }

    if (filteredCustomers.length === 0) {
      return {
        success: false,
        error: "Teslim edilecek müşteri bulunamadı",
        summary: {
          totalRoutes: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalCost: 0,
          fuelCost: 0,
          fixedCost: 0,
          distanceCost: 0,
          unassignedCount: 0,
          computationTimeMs: 0,
        },
        routes: [],
        unassigned: [],
      }
    }

    // Optimizasyon parametrelerini donustur
    const params = convertToOptimizationParams(options)

    // VROOM optimizasyonunu calistir
    const result = await client.runOptimization(depots, filteredVehicles, filteredCustomers, params)

    const endTime = performance.now()

    // Sonucu donustur
    const vroomResult = convertToVroomResult(result)
    vroomResult.summary.computationTimeMs = Math.round(endTime - startTime)

    return vroomResult
  } catch (error) {
    const endTime = performance.now()
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
        computationTimeMs: Math.round(endTime - startTime),
      },
      routes: [],
      unassigned: customers.map((c) => c.id),
    }
  }
}

// Tek depo icin optimizasyon
export async function optimizeForDepot(
  depot: Depot,
  vehicles: Vehicle[],
  customers: Customer[],
  options: Omit<VroomOptimizationRequest, "depotId">,
): Promise<VroomOptimizationResult> {
  return optimizeWithVroom([depot], vehicles, customers, {
    ...options,
    depotId: depot.id,
  })
}

// Tum depolar icin paralel optimizasyon
export async function optimizeAllDepots(
  depots: Depot[],
  vehicles: Vehicle[],
  customers: Customer[],
  options: Omit<VroomOptimizationRequest, "depotId">,
): Promise<Map<string, VroomOptimizationResult>> {
  const results = new Map<string, VroomOptimizationResult>()

  const promises = depots.map(async (depot) => {
    const depotVehicles = vehicles.filter((v) => v.depot_id === depot.id)
    const depotCustomers = customers.filter((c) => c.assigned_depot_id === depot.id)

    const result = await optimizeForDepot(depot, depotVehicles, depotCustomers, options)
    results.set(depot.id, result)
  })

  await Promise.all(promises)
  return results
}
