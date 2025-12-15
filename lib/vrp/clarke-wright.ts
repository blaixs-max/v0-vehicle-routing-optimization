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
  totalM3: number
  totalDistance: number
  totalDuration: number
  earliestStart: number // dakika cinsinden (örn: 08:00 = 480)
  latestEnd: number // dakika cinsinden (örn: 18:00 = 1080)
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
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
    const serviceDuration = customer.serviceDuration || 15 // varsayılan 15 dakika

    const earliestStart = customer.timeWindowStart ? timeToMinutes(customer.timeWindowStart) : 0
    const latestEnd = customer.timeWindowEnd ? timeToMinutes(customer.timeWindowEnd) : 24 * 60

    routes.push({
      customers: [customer.id],
      totalLoad: customer.demand,
      totalKg: customer.demandKg || 0,
      totalM3: customer.demandM3 || 0,
      totalDistance: distToDepot * 2, // round trip
      totalDuration: durToDepot * 2 + serviceDuration,
      earliestStart,
      latestEnd,
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

    const mergedLoad = route1.totalLoad + route2.totalLoad
    const mergedKg = route1.totalKg + route2.totalKg
    const mergedM3 = route1.totalM3 + route2.totalM3

    const mergedEarliestStart = Math.min(route1.earliestStart, route2.earliestStart)
    const mergedLatestEnd = Math.max(route1.latestEnd, route2.latestEnd)

    const ci = customers.find((c) => c.id === i)
    const cj = customers.find((c) => c.id === j)
    const allCustomersInMerged = [...route1.customers, ...route2.customers]
      .map((id) => customers.find((c) => c.id === id))
      .filter(Boolean)

    // Müşterilerin gerektirdiği araç tipleri
    const requiredVehicleTypes = new Set<string>()
    for (const customer of allCustomersInMerged) {
      if (customer?.requiredVehicleTypes && customer.requiredVehicleTypes.length > 0) {
        customer.requiredVehicleTypes.forEach((type) => requiredVehicleTypes.add(type))
      }
    }

    const availableVehicle = vehicles.find((v) => {
      const capacityOk =
        (v.capacityPallets || v.capacityPallet || 0) >= mergedLoad &&
        (v.capacityKg || 0) >= mergedKg &&
        (v.capacityM3 || 999) >= mergedM3

      const vehicleTypeOk = requiredVehicleTypes.size === 0 || requiredVehicleTypes.has(v.vehicleType || "")

      return capacityOk && vehicleTypeOk
    })

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

    // Calculate new distance and duration
    let newDistance = getDistance(distanceMatrix, depot.id, newCustomers[0])
    let newDuration = getDuration(distanceMatrix, depot.id, newCustomers[0])

    for (let k = 0; k < newCustomers.length - 1; k++) {
      newDistance += getDistance(distanceMatrix, newCustomers[k], newCustomers[k + 1])
      newDuration += getDuration(distanceMatrix, newCustomers[k], newCustomers[k + 1])
    }

    newDistance += getDistance(distanceMatrix, newCustomers[newCustomers.length - 1], depot.id)
    newDuration += getDuration(distanceMatrix, newCustomers[newCustomers.length - 1], depot.id)

    for (const customerId of newCustomers) {
      const customer = customers.find((c) => c.id === customerId)
      if (customer) {
        newDuration += customer.serviceDuration || 15
      }
    }

    const driverMaxWorkMinutes = (availableVehicle.driverMaxWorkHours || 11) * 60
    if (newDuration > driverMaxWorkMinutes) {
      continue // Sürücü çalışma saati aşıldı
    }

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
    route1.totalM3 = mergedM3
    route1.totalDistance = newDistance
    route1.totalDuration = newDuration
    route1.earliestStart = mergedEarliestStart
    route1.latestEnd = mergedLatestEnd

    // Clear route2
    route2.customers = []
    route2.totalLoad = 0
    route2.totalKg = 0
    route2.totalM3 = 0
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
    const routeCustomers = route.customers.map((id) => customers.find((c) => c.id === id)).filter(Boolean)
    const requiredVehicleTypes = new Set<string>()
    for (const customer of routeCustomers) {
      if (customer?.requiredVehicleTypes && customer.requiredVehicleTypes.length > 0) {
        customer.requiredVehicleTypes.forEach((type) => requiredVehicleTypes.add(type))
      }
    }

    // Find best available vehicle
    const vehicle = vehicles.find(
      (v) =>
        !usedVehicles.has(v.id) &&
        (v.capacityPallets || v.capacityPallet || 0) >= route.totalLoad &&
        (v.capacityKg || 0) >= route.totalKg &&
        (v.capacityM3 || 999) >= route.totalM3 &&
        (requiredVehicleTypes.size === 0 || requiredVehicleTypes.has(v.vehicleType || "")),
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
