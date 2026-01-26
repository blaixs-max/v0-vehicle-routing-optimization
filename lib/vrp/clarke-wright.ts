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
      // Check single vehicle type requirement
      if (customer?.requiredVehicleType) {
        requiredVehicleTypes.add(customer.requiredVehicleType)
      }
      // Also check array format for backward compatibility
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
      // Check single vehicle type requirement
      if (customer?.requiredVehicleType) {
        requiredVehicleTypes.add(customer.requiredVehicleType)
      }
      // Also check array format for backward compatibility
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

export function clarkeWrightOptimize(
  depots: any[],
  vehicles: any[],
  customers: any[],
  options: {
    fuelPricePerLiter: number
    maxRouteDistanceKm?: number
    maxRouteTimeMin?: number
    vehicleCapacityUtilization?: number
  },
) {
  const startTime = Date.now()

  // Type dönüşümü
  const depot: DepotPoint = {
    id: depots[0].id,
    lat: depots[0].lat,
    lng: depots[0].lng,
    name: depots[0].name,
  }

  const points: Point[] = customers.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    demand: c.demand_pallets || c.demand_pallet || 1,
    demandKg: c.demand_kg || 0,
    demandM3: c.demand_m3 || 0,
    serviceDuration: c.service_duration || 15,
    timeWindowStart: c.time_window_start,
    timeWindowEnd: c.time_window_end,
    requiredVehicleTypes: c.required_vehicle_types || [],
    requiredVehicleType: c.required_vehicle_type || null,
  }))

  const vehicleConfigs: VehicleConfig[] = vehicles.map((v) => ({
    id: v.id,
    capacityPallets: v.capacity_pallet || v.capacity_pallets || 12,
    capacityKg: v.capacity_kg || 5000,
    capacityM3: v.capacity_m3 || 25,
    fuelConsumptionPer100km: v.fuel_consumption_per_100km || 25,
    costPerKm: v.cost_per_km || 2,
    fixedDailyCost: v.fixed_daily_cost || 500,
    vehicleType: v.vehicle_type || "truck",
    driverMaxWorkHours: v.driver_max_work_hours || 11,
  }))

  const params: OptimizationParams = {
    fuelPricePerLiter: options.fuelPricePerLiter,
    maxRouteDistance: options.maxRouteDistanceKm,
    maxRouteTime: options.maxRouteTimeMin,
  }

  // Mesafe matrisini oluştur (Haversine ile)
  const distanceMatrix: DistanceMatrix = {
    distances: {},
    durations: {},
  }

  const allPoints = [depot, ...points]
  for (const p1 of allPoints) {
    for (const p2 of allPoints) {
      if (p1.id === p2.id) continue
      const key = `${p1.id}-${p2.id}`
      const R = 6371
      const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
      const dLng = ((p2.lng - p1.lng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.lat * Math.PI) / 180) *
          Math.cos((p2.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c
      const duration = (distance / 50) * 60 // 50 km/h ortalama hız

      distanceMatrix.distances[key] = distance
      distanceMatrix.durations[key] = duration
    }
  }

  const cwResults = clarkeWrightSavings(depot, points, vehicleConfigs, distanceMatrix, params)

  // API format'ına dönüştür
  const routes = cwResults.map((r) => {
    const vehicle = vehicles.find((v) => v.id === r.vehicleId)
    const stops = r.stops.map((stopId, index) => {
      const customer = customers.find((c) => c.id === stopId)
      return {
        customerId: stopId,
        customerName: customer?.name || "Bilinmeyen",
        address: customer?.address || "",
        lat: customer?.lat || 0,
        lng: customer?.lng || 0,
        stopOrder: index + 1,
        arrivalTime: 0,
        serviceTime: customer?.service_duration || 15,
        distanceFromPrev: 0,
        demand: customer?.demand_pallets || customer?.demand_pallet || 1,
        cumulativeLoad: 0,
      }
    })

    return {
      vehicleId: r.vehicleId,
      vehiclePlate: vehicle?.plate || "Bilinmeyen",
      vehicleType: vehicle?.vehicle_type || "truck",
      depotId: r.depotId,
      depotName: depots[0].name,
      stops,
      totalDistance: r.totalDistance,
      totalDuration: r.totalDuration,
      totalCost: r.totalCost,
      fuelCost: r.fuelCost,
      fixedCost: r.fixedCost,
      distanceCost: r.distanceCost,
      tollCost: 0,
      tollCrossings: [],
      highwayUsage: [],
      totalLoad: r.totalLoad,
      capacityUtilization: Math.round((r.totalLoad / (vehicle?.capacity_pallet || 12)) * 100),
      geometry: null,
    }
  })

  const assignedCustomerIds = new Set(cwResults.flatMap((r) => r.stops))
  const unassigned = customers.filter((c) => !assignedCustomerIds.has(c.id)).map((c) => c.id)

  const computationTime = Date.now() - startTime
  const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0)
  const totalDuration = routes.reduce((sum, r) => sum + r.totalDuration, 0)
  const totalCost = routes.reduce((sum, r) => sum + r.totalCost, 0)
  const totalFuelCost = routes.reduce((sum, r) => sum + r.fuelCost, 0)
  const totalFixedCost = routes.reduce((sum, r) => sum + r.fixedCost, 0)
  const totalDistanceCost = routes.reduce((sum, r) => sum + r.distanceCost, 0)

  return {
    success: true,
    provider: "clarke-wright",
    summary: {
      totalRoutes: routes.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost * 100) / 100,
      fuelCost: Math.round(totalFuelCost * 100) / 100,
      fixedCost: Math.round(totalFixedCost * 100) / 100,
      distanceCost: Math.round(totalDistanceCost * 100) / 100,
      tollCost: 0,
      unassignedCount: unassigned.length,
      computationTimeMs: computationTime,
      avgCapacityUtilization:
        routes.length > 0 ? routes.reduce((sum, r) => sum + r.capacityUtilization, 0) / routes.length : 0,
    },
    routes,
    unassigned,
  }
}
