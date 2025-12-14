import type { Point, DepotPoint, VehicleConfig, OptimizationResult, OptimizationParams, DistanceMatrix } from "./types"
import { calculateEuclideanMatrix, fetchOSRMDistances, getDistance, getDuration } from "./distance"
import { clarkeWrightSavings } from "./clarke-wright"
import { twoOpt } from "./two-opt"

export async function optimizeRoutes(
  depots: DepotPoint[],
  customers: Point[],
  vehicles: VehicleConfig[],
  params: OptimizationParams,
): Promise<OptimizationResult> {
  const startTime = performance.now()

  // Step 1: Assign customers to nearest depot
  const customersByDepot = new Map<string, Point[]>()
  const vehiclesByDepot = new Map<string, VehicleConfig[]>()

  for (const depot of depots) {
    customersByDepot.set(depot.id, [])
    vehiclesByDepot.set(
      depot.id,
      vehicles.filter((v) => v.depotId === depot.id),
    )
  }

  for (const customer of customers) {
    let nearestDepot = depots[0]
    let minDistance = Number.POSITIVE_INFINITY

    for (const depot of depots) {
      const dist = Math.sqrt(Math.pow(customer.lat - depot.lat, 2) + Math.pow(customer.lng - depot.lng, 2))
      if (dist < minDistance) {
        minDistance = dist
        nearestDepot = depot
      }
    }

    customersByDepot.get(nearestDepot.id)?.push(customer)
  }

  // Step 2: Calculate distance matrix
  const allPoints: Point[] = [...depots, ...customers]
  let distanceMatrix: DistanceMatrix

  if (params.useRealDistances) {
    try {
      distanceMatrix = await fetchOSRMDistances(allPoints)
    } catch {
      console.warn("OSRM failed, falling back to Euclidean distances")
      distanceMatrix = calculateEuclideanMatrix(allPoints)
    }
  } else {
    distanceMatrix = calculateEuclideanMatrix(allPoints)
  }

  // Step 3: Run Clarke-Wright for each depot
  const allRoutes: OptimizationResult["routes"] = []
  const unassignedCustomers: string[] = []

  for (const depot of depots) {
    const depotCustomers = customersByDepot.get(depot.id) || []
    const depotVehicles = vehiclesByDepot.get(depot.id) || []

    if (depotCustomers.length === 0 || depotVehicles.length === 0) {
      continue
    }

    // Run Clarke-Wright
    const routes = clarkeWrightSavings(depot, depotCustomers, depotVehicles, distanceMatrix, params)

    // Apply 2-opt improvement
    for (const route of routes) {
      const improvedStops = twoOpt(route.stops, depot.id, distanceMatrix)

      // Recalculate distance after 2-opt
      let newDistance = getDistance(distanceMatrix, depot.id, improvedStops[0])
      let newDuration = getDuration(distanceMatrix, depot.id, improvedStops[0])

      for (let i = 0; i < improvedStops.length - 1; i++) {
        newDistance += getDistance(distanceMatrix, improvedStops[i], improvedStops[i + 1])
        newDuration += getDuration(distanceMatrix, improvedStops[i], improvedStops[i + 1])
      }

      newDistance += getDistance(distanceMatrix, improvedStops[improvedStops.length - 1], depot.id)
      newDuration += getDuration(distanceMatrix, improvedStops[improvedStops.length - 1], depot.id)

      // Find vehicle to recalculate costs
      const vehicle = depotVehicles.find((v) => v.id === route.vehicleId)
      if (vehicle) {
        const fuelCost = (newDistance / 100) * vehicle.fuelConsumptionPer100km * params.fuelPricePerLiter
        const distanceCost = newDistance * vehicle.costPerKm

        route.stops = improvedStops
        route.totalDistance = Math.round(newDistance * 100) / 100
        route.totalDuration = Math.round(newDuration)
        route.fuelCost = Math.round(fuelCost * 100) / 100
        route.distanceCost = Math.round(distanceCost * 100) / 100
        route.totalCost = Math.round((fuelCost + distanceCost + route.fixedCost) * 100) / 100
      }

      allRoutes.push(route)
    }

    // Track unassigned customers
    const assignedCustomers = new Set(routes.flatMap((r) => r.stops))
    for (const customer of depotCustomers) {
      if (!assignedCustomers.has(customer.id)) {
        unassignedCustomers.push(customer.id)
      }
    }
  }

  const endTime = performance.now()

  return {
    routes: allRoutes,
    totalDistance: allRoutes.reduce((sum, r) => sum + r.totalDistance, 0),
    totalCost: allRoutes.reduce((sum, r) => sum + r.totalCost, 0),
    totalVehiclesUsed: allRoutes.length,
    unassignedCustomers,
    computationTimeMs: Math.round(endTime - startTime),
    algorithm: "Clarke-Wright Savings + 2-opt",
  }
}
