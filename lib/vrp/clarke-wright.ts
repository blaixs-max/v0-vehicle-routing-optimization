import type { Point, DepotPoint, VehicleConfig, RouteResult, DistanceMatrix, OptimizationParams } from "./types"
import { getDistance, getDuration } from "./distance"

interface Saving {
  i: string
  j: string
  saving: number
}

interface TempRoute {
  customers: string[]
  totalLoad: number
  totalKg: number
  totalDistance: number
  totalDuration: number
}

export function clarkeWrightSavings(
  depot: DepotPoint,
  customers: Point[],
  vehicles: VehicleConfig[],
  distanceMatrix: DistanceMatrix,
  params: OptimizationParams,
): RouteResult[] {
  if (customers.length === 0 || vehicles.length === 0) {
    return []
  }

  // Step 1: Calculate savings for all customer pairs
  const savings: Saving[] = []

  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const ci = customers[i]
      const cj = customers[j]

      // Saving = d(depot, i) + d(depot, j) - d(i, j)
      const saving =
        getDistance(distanceMatrix, depot.id, ci.id) +
        getDistance(distanceMatrix, depot.id, cj.id) -
        getDistance(distanceMatrix, ci.id, cj.id)

      if (saving > 0) {
        savings.push({ i: ci.id, j: cj.id, saving })
      }
    }
  }

  // Sort savings in descending order
  savings.sort((a, b) => b.saving - a.saving)

  // Step 2: Initialize routes (each customer in its own route)
  const customerRouteMap = new Map<string, number>() // customerId -> routeIndex
  const routes: TempRoute[] = []

  customers.forEach((customer, index) => {
    const distToDepot = getDistance(distanceMatrix, depot.id, customer.id)
    const durToDepot = getDuration(distanceMatrix, depot.id, customer.id)

    routes.push({
      customers: [customer.id],
      totalLoad: customer.demand,
      totalKg: customer.demandKg,
      totalDistance: distToDepot * 2, // round trip
      totalDuration: durToDepot * 2,
    })
    customerRouteMap.set(customer.id, index)
  })

  // Step 3: Merge routes based on savings
  for (const { i, j } of savings) {
    const routeI = customerRouteMap.get(i)
    const routeJ = customerRouteMap.get(j)

    // Skip if same route or routes already merged
    if (routeI === undefined || routeJ === undefined || routeI === routeJ) {
      continue
    }

    const route1 = routes[routeI]
    const route2 = routes[routeJ]

    // Skip if either route is empty (already merged)
    if (!route1 || !route2 || route1.customers.length === 0 || route2.customers.length === 0) {
      continue
    }

    // Check if i and j are at the ends of their routes
    const iAtEnd = route1.customers[0] === i || route1.customers[route1.customers.length - 1] === i
    const jAtEnd = route2.customers[0] === j || route2.customers[route2.customers.length - 1] === j

    if (!iAtEnd || !jAtEnd) {
      continue
    }

    // Find the best available vehicle for merged route
    const mergedLoad = route1.totalLoad + route2.totalLoad
    const mergedKg = route1.totalKg + route2.totalKg

    const availableVehicle = vehicles.find((v) => v.capacityPallets >= mergedLoad && v.capacityKg >= mergedKg)

    if (!availableVehicle) {
      continue // No vehicle can handle merged route
    }

    // Merge routes
    let newCustomers: string[]

    if (route1.customers[route1.customers.length - 1] === i && route2.customers[0] === j) {
      newCustomers = [...route1.customers, ...route2.customers]
    } else if (route2.customers[route2.customers.length - 1] === j && route1.customers[0] === i) {
      newCustomers = [...route2.customers, ...route1.customers]
    } else if (route1.customers[0] === i && route2.customers[0] === j) {
      newCustomers = [...route1.customers.reverse(), ...route2.customers]
    } else {
      newCustomers = [...route1.customers, ...route2.customers.reverse()]
    }

    // Calculate new distance
    let newDistance = getDistance(distanceMatrix, depot.id, newCustomers[0])
    let newDuration = getDuration(distanceMatrix, depot.id, newCustomers[0])

    for (let k = 0; k < newCustomers.length - 1; k++) {
      newDistance += getDistance(distanceMatrix, newCustomers[k], newCustomers[k + 1])
      newDuration += getDuration(distanceMatrix, newCustomers[k], newCustomers[k + 1])
    }

    newDistance += getDistance(distanceMatrix, newCustomers[newCustomers.length - 1], depot.id)
    newDuration += getDuration(distanceMatrix, newCustomers[newCustomers.length - 1], depot.id)

    // Check max constraints
    if (params.maxRouteDistance && newDistance > params.maxRouteDistance) {
      continue
    }
    if (params.maxRouteTime && newDuration > params.maxRouteTime) {
      continue
    }

    // Update route1 with merged data
    route1.customers = newCustomers
    route1.totalLoad = mergedLoad
    route1.totalKg = mergedKg
    route1.totalDistance = newDistance
    route1.totalDuration = newDuration

    // Clear route2
    route2.customers = []
    route2.totalLoad = 0
    route2.totalKg = 0
    route2.totalDistance = 0
    route2.totalDuration = 0

    // Update customer route map
    for (const customerId of newCustomers) {
      customerRouteMap.set(customerId, routeI)
    }
  }

  // Step 4: Assign vehicles to routes and calculate costs
  const results: RouteResult[] = []
  const usedVehicles = new Set<string>()

  // Filter non-empty routes and sort by load (largest first for better vehicle assignment)
  const nonEmptyRoutes = routes.filter((r) => r.customers.length > 0).sort((a, b) => b.totalLoad - a.totalLoad)

  for (const route of nonEmptyRoutes) {
    // Find best available vehicle
    const vehicle = vehicles.find(
      (v) => !usedVehicles.has(v.id) && v.capacityPallets >= route.totalLoad && v.capacityKg >= route.totalKg,
    )

    if (!vehicle) {
      continue // No available vehicle
    }

    usedVehicles.add(vehicle.id)

    // Calculate costs
    const fuelCost = (route.totalDistance / 100) * vehicle.fuelConsumptionPer100km * params.fuelPricePerLiter
    const distanceCost = route.totalDistance * vehicle.costPerKm
    const fixedCost = vehicle.fixedDailyCost
    const totalCost = fuelCost + distanceCost + fixedCost

    results.push({
      vehicleId: vehicle.id,
      depotId: depot.id,
      stops: route.customers,
      totalDistance: Math.round(route.totalDistance * 100) / 100,
      totalDuration: Math.round(route.totalDuration),
      totalLoad: route.totalLoad,
      totalKg: route.totalKg,
      totalCost: Math.round(totalCost * 100) / 100,
      fuelCost: Math.round(fuelCost * 100) / 100,
      distanceCost: Math.round(distanceCost * 100) / 100,
      fixedCost,
    })
  }

  return results
}
