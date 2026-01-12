import { NextResponse } from "next/server"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { ORSClient } from "@/lib/ors/client"
import { calculateTollCosts } from "@/lib/toll-costs"

const ORS_API_KEY = process.env.ORS_API_KEY
const RAILWAY_API_URL = process.env.RAILWAY_API_URL

console.log("[v0] ORS_API_KEY exists:", !!ORS_API_KEY, "Length:", ORS_API_KEY?.length || 0)
console.log("[v0] RAILWAY_API_URL exists:", !!RAILWAY_API_URL)

// Haversine mesafe hesaplama (fallback için)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    })
  }

  return points
}

// ORS Optimization API ile rota optimizasyonu
async function optimizeWithORS(
  depots: Depot[],
  vehicles: Vehicle[],
  customers: Customer[],
  options: {
    fuelPricePerLiter: number
    maxRouteDistanceKm?: number
    maxRouteTimeMin?: number
    vehicleCapacityUtilization?: number
  },
) {
  const startTime = Date.now()
  const client = new ORSClient(ORS_API_KEY!)

  // Kullanılabilir araçları filtrele
  const availableVehicles = vehicles.filter((v) => v.status === "active" || v.status === "available" || !v.status)

  if (availableVehicles.length === 0) {
    throw new Error("Kullanılabilir araç bulunamadı")
  }

  // Müşterileri depolara göre grupla
  const customersByDepot = new Map<string, Customer[]>()
  for (const depot of depots) {
    customersByDepot.set(depot.id, [])
  }

  for (const customer of customers) {
    if (customer.assigned_depot_id && customersByDepot.has(customer.assigned_depot_id)) {
      customersByDepot.get(customer.assigned_depot_id)!.push(customer)
    } else {
      // En yakın depoya ata
      let minDist = Number.POSITIVE_INFINITY
      let closestDepot = depots[0]
      for (const depot of depots) {
        const dist = haversineDistance(customer.lat, customer.lng, depot.lat, depot.lng)
        if (dist < minDist) {
          minDist = dist
          closestDepot = depot
        }
      }
      customersByDepot.get(closestDepot.id)!.push(customer)
    }
  }

  const allRoutes: any[] = []
  const allUnassigned: string[] = []

  // Her depo için ayrı optimizasyon yap
  for (const depot of depots) {
    const depotCustomers = customersByDepot.get(depot.id) || []
    if (depotCustomers.length === 0) continue

    // Bu depoya ait araçları al
    let depotVehicles = availableVehicles.filter((v) => v.depot_id === depot.id)
    if (depotVehicles.length === 0) {
      depotVehicles = availableVehicles.filter((v) => !allRoutes.some((r) => r.vehicleId === v.id)).slice(0, 3)
    }

    if (depotVehicles.length === 0) {
      allUnassigned.push(...depotCustomers.map((c) => c.id))
      continue
    }

    // Araçları 3'erli gruplara böl (ORS limiti)
    const vehicleBatches: Vehicle[][] = []
    for (let i = 0; i < depotVehicles.length; i += 3) {
      vehicleBatches.push(depotVehicles.slice(i, i + 3))
    }

    let remainingCustomers = [...depotCustomers]

    // Her batch için ORS çağır
    for (const vehicleBatch of vehicleBatches) {
      if (remainingCustomers.length === 0) break

      const batchCapacity = vehicleBatch.reduce((sum, v) => {
        const cap = (v.capacity_pallet || v.capacity_pallets || 12) * (options.vehicleCapacityUtilization || 0.9)
        return sum + Math.floor(cap)
      }, 0)

      const batchCustomers = remainingCustomers.slice(0, Math.min(remainingCustomers.length, batchCapacity + 5))

      if (batchCustomers.length === 0) continue

      const jobs = batchCustomers.map((customer, index) => ({
        id: index + 1,
        location: [customer.lng, customer.lat] as [number, number],
        service: 900,
        amount: [customer.demand_pallets || customer.demand_pallet || 1],
      }))

      const orsVehicles = vehicleBatch.map((vehicle, index) => {
        const capacity = Math.floor(
          (vehicle.capacity_pallet || vehicle.capacity_pallets || 12) * (options.vehicleCapacityUtilization || 0.9),
        )

        return {
          id: index + 1,
          profile: "driving-hgv" as const,
          start: [depot.lng, depot.lat] as [number, number],
          end: [depot.lng, depot.lat] as [number, number],
          capacity: [capacity],
          time_window: options.maxRouteTimeMin ? ([0, options.maxRouteTimeMin * 60] as [number, number]) : undefined,
        }
      })

      try {
        const response = await client.optimize({
          jobs,
          vehicles: orsVehicles,
          geometry: true,
        })

        const assignedCustomerIndices = new Set<number>()

        for (const route of response.routes || []) {
          const vehicleIndex = route.vehicle - 1
          const vehicle = vehicleBatch[vehicleIndex]

          const routeDistanceKm = (route.distance || 0) / 1000
          const routeDurationMin = (route.duration || 0) / 60

          const stops = (route.steps || [])
            .filter((step) => step.type === "job")
            .map((step, stopIndex) => {
              const customerIndex = (step.id || step.job || 1) - 1
              assignedCustomerIndices.add(customerIndex)
              const customer = batchCustomers[customerIndex]
              return {
                customerId: customer?.id || `unknown-${stopIndex}`,
                customerName: customer?.name || "Bilinmeyen",
                address: customer?.address || "",
                lat: step.location?.[1] || customer?.lat || 0,
                lng: step.location?.[0] || customer?.lng || 0,
                stopOrder: stopIndex + 1,
                arrivalTime: Math.round((step.arrival || 0) / 60),
                serviceTime: Math.round((step.service || 900) / 60),
                distanceFromPrev: Math.round(((step.distance || 0) / 1000) * 100) / 100,
                demand: customer?.demand_pallets || customer?.demand_pallet || 1,
                cumulativeLoad: step.load?.[0] || 0,
              }
            })

          if (stops.length === 0) continue

          let totalDistance = routeDistanceKm
          let totalDuration = routeDurationMin
          let distanceSource = "ors" // Debug için kaynak takibi

          // ORS mesafe dönmezse Haversine fallback
          if (totalDistance === 0 && stops.length > 0) {
            distanceSource = "haversine" // Fallback kullaniliyor
            totalDistance = haversineDistance(depot.lat, depot.lng, stops[0].lat, stops[0].lng)
            for (let i = 1; i < stops.length; i++) {
              totalDistance += haversineDistance(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng)
            }
            totalDistance += haversineDistance(
              stops[stops.length - 1].lat,
              stops[stops.length - 1].lng,
              depot.lat,
              depot.lng,
            )
            totalDuration = (totalDistance / 50) * 60 + stops.length * 15
          }

          const routePoints = [
            { lat: depot.lat, lng: depot.lng },
            ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
            { lat: depot.lat, lng: depot.lng },
          ]
          const vehicleType = vehicle?.vehicle_type || "truck"

          let geometryPoints: { lat: number; lng: number }[] = routePoints

          if (route.geometry && typeof route.geometry === "string" && route.geometry.length > 10) {
            // Encoded polyline decode
            try {
              geometryPoints = decodePolyline(route.geometry)
            } catch (e) {
              // Decode hatasi - routePoints kullan
            }
          } else {
            // ORS Directions API ile gerçek rota geometrisi al
            try {
              geometryPoints = await client.getRouteGeometry(routePoints, "driving-hgv")
            } catch (e) {
              // Directions API hatasi - routePoints kullan
            }
          }

          const tollCalculation = calculateTollCosts(geometryPoints, vehicleType, totalDistance)

          const fuelConsumption = (totalDistance / 100) * (vehicle?.fuel_consumption_per_100km || 25)
          const fuelCost = fuelConsumption * options.fuelPricePerLiter
          const distanceCost = totalDistance * (vehicle?.cost_per_km || 2)
          const fixedCost = vehicle?.fixed_daily_cost || 500
          const tollCost = tollCalculation.totalTollCost
          const totalCost = fuelCost + distanceCost + fixedCost + tollCost

          const vehicleCapacity = vehicle?.capacity_pallet || vehicle?.capacity_pallets || 12
          const totalLoad = stops.reduce((sum, s) => sum + s.demand, 0)

          allRoutes.push({
            vehicleId: vehicle?.id || `vehicle-${route.vehicle}`,
            vehiclePlate: vehicle?.plate || `Araç ${route.vehicle}`,
            vehicleType: vehicle?.vehicle_type || "truck",
            depotId: depot.id,
            depotName: depot.name,
            stops,
            totalDistance: Math.round(totalDistance * 100) / 100,
            totalDuration: Math.round(totalDuration),
            totalCost: Math.round(totalCost * 100) / 100,
            fuelCost: Math.round(fuelCost * 100) / 100,
            fixedCost: Math.round(fixedCost * 100) / 100,
            distanceCost: Math.round(distanceCost * 100) / 100,
            tollCost: Math.round(tollCost * 100) / 100,
            tollCrossings: tollCalculation.crossings,
            highwayUsage: tollCalculation.highwayUsage,
            totalLoad,
            capacityUtilization: Math.round((totalLoad / vehicleCapacity) * 100),
            geometry: route.geometry || null,
          })
        }

        const assignedCustomers = Array.from(assignedCustomerIndices).map((i) => batchCustomers[i])
        remainingCustomers = remainingCustomers.filter((c) => !assignedCustomers.some((ac) => ac?.id === c.id))

        for (const u of response.unassigned || []) {
          const customerIndex = u.id - 1
          if (!assignedCustomerIndices.has(customerIndex)) {
            const customer = batchCustomers[customerIndex]
            if (customer) {
              allUnassigned.push(customer.id)
            }
          }
        }
      } catch (batchError) {
        console.error("ORS batch hatası:", batchError)
        allUnassigned.push(...batchCustomers.map((c) => c.id))
        remainingCustomers = remainingCustomers.filter((c) => !batchCustomers.some((bc) => bc.id === c.id))
      }
    }

    allUnassigned.push(...remainingCustomers.map((c) => c.id))
  }

  const computationTime = Date.now() - startTime
  const totalDistance = allRoutes.reduce((sum, r) => sum + (r.totalDistance || 0), 0)
  const totalDuration = allRoutes.reduce((sum, r) => sum + (r.totalDuration || 0), 0)
  const totalFuelCost = allRoutes.reduce((sum, r) => sum + (r.fuelCost || 0), 0)
  const totalFixedCost = allRoutes.reduce((sum, r) => sum + (r.fixedCost || 0), 0)
  const totalDistanceCost = allRoutes.reduce((sum, r) => sum + (r.distanceCost || 0), 0)
  const totalTollCost = allRoutes.reduce((sum, r) => sum + (r.tollCost || 0), 0)
  const totalCost = totalFuelCost + totalFixedCost + totalDistanceCost + totalTollCost
  const avgCapacityUtilization =
    allRoutes.length > 0 ? allRoutes.reduce((sum, r) => sum + (r.capacityUtilization || 0), 0) / allRoutes.length : 0

  return {
    success: true,
    provider: "openrouteservice",
    summary: {
      totalRoutes: allRoutes.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost * 100) / 100,
      fuelCost: Math.round(totalFuelCost * 100) / 100,
      fixedCost: Math.round(totalFixedCost * 100) / 100,
      distanceCost: Math.round(totalDistanceCost * 100) / 100,
      tollCost: Math.round(totalTollCost * 100) / 100,
      unassignedCount: allUnassigned.length,
      computationTimeMs: computationTime,
      avgCapacityUtilization: Math.round(avgCapacityUtilization),
    },
    routes: allRoutes,
    unassigned: [...new Set(allUnassigned)],
  }
}

async function optimizeWithORTools(
  depots: Depot[],
  vehicles: Vehicle[],
  customers: Customer[],
  options: {
    fuelPricePerLiter: number
    maxRouteDistanceKm?: number
    maxRouteTimeMin?: number
    vehicleCapacityUtilization?: number
  },
) {
  if (!RAILWAY_API_URL) {
    throw new Error("RAILWAY_API_URL environment variable bulunamadı")
  }

  const startTime = Date.now()

  // Railway API formatına dönüştür
  const payload = {
    depots: depots.map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lng: d.lng,
    })),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      depot_id: v.depot_id,
      vehicle_type: v.vehicle_type,
      capacity_pallet: v.capacity_pallet || v.capacity_pallets || 12,
      fuel_consumption_per_100km: v.fuel_consumption_per_100km || 25,
      cost_per_km: v.cost_per_km || 0,
      fixed_daily_cost: v.fixed_daily_cost || 0,
      driver_max_work_hours: v.driver_max_work_hours || 9,
      driver_break_duration: v.driver_break_duration || 45,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      assigned_depot_id: c.assigned_depot_id,
      demand_pallet: c.demand_pallet || c.demand_pallets || 1,
      service_duration: c.service_duration || 15,
      business: c.business || "DEFAULT",
      time_window_start: c.time_window_start,
      time_window_end: c.time_window_end,
      required_vehicle_types: c.required_vehicle_types || [],
      special_constraints: c.special_constraints,
    })),
    options: {
      fuel_price_per_liter: options.fuelPricePerLiter,
      max_route_distance_km: options.maxRouteDistanceKm,
      max_route_time_min: options.maxRouteTimeMin,
      vehicle_capacity_utilization: options.vehicleCapacityUtilization || 0.8,
    },
  }

  try {
    // Railway OR-Tools API çağrısı
    const response = await fetch(`${RAILWAY_API_URL}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Railway API error: ${response.status} - ${error}`)
    }

    const ortoolsResult = await response.json()

    // OR-Tools sonuçlarını işle ve ORS ile geometri ekle
    const routesWithGeometry = await Promise.all(
      ortoolsResult.routes.map(async (route: any) => {
        const routePoints = [
          { lat: route.depot_lat, lng: route.depot_lng },
          ...route.stops.map((s: any) => ({ lat: s.lat, lng: s.lng })),
          { lat: route.depot_lat, lng: route.depot_lng },
        ]

        let geometryPoints = routePoints
        const geometry = null

        // ORS ile gerçek rota geometrisi al
        if (ORS_API_KEY) {
          try {
            const client = new ORSClient(ORS_API_KEY)
            geometryPoints = await client.getRouteGeometry(routePoints, "driving-hgv")
            // Geometry string encode edilebilir (isteğe bağlı)
          } catch (e) {
            console.warn("[v0] ORS geometry hatası, route points kullanılıyor:", e)
          }
        }

        // Köprü/otoyol maliyetlerini hesapla
        const vehicleType = route.vehicle_type || "truck"
        const tollCalculation = calculateTollCosts(geometryPoints, vehicleType, route.total_distance)

        // Maliyetleri güncelle (OR-Tools yakıt + mesafe + sabit maliyetleri hesaplamış)
        const fuelCost = route.fuel_cost || 0
        const distanceCost = route.distance_cost || 0
        const fixedCost = route.fixed_cost || 0
        const tollCost = tollCalculation.totalTollCost
        const totalCost = fuelCost + distanceCost + fixedCost + tollCost

        return {
          vehicleId: route.vehicle_id,
          vehiclePlate: route.vehicle_plate,
          vehicleType: route.vehicle_type,
          depotId: route.depot_id,
          depotName: route.depot_name,
          stops: route.stops,
          totalDistance: route.total_distance,
          totalDuration: route.total_duration,
          totalCost: Math.round(totalCost * 100) / 100,
          fuelCost: Math.round(fuelCost * 100) / 100,
          fixedCost: Math.round(fixedCost * 100) / 100,
          distanceCost: Math.round(distanceCost * 100) / 100,
          tollCost: Math.round(tollCost * 100) / 100,
          tollCrossings: tollCalculation.crossings,
          highwayUsage: tollCalculation.highwayUsage,
          totalLoad: route.total_load,
          capacityUtilization: route.capacity_utilization,
          geometry,
          constraintViolations: route.constraint_violations || [],
        }
      }),
    )

    const computationTime = Date.now() - startTime

    return {
      success: true,
      provider: "ortools",
      summary: {
        totalRoutes: ortoolsResult.summary.total_routes,
        totalDistance: ortoolsResult.summary.total_distance,
        totalDuration: ortoolsResult.summary.total_duration,
        totalCost: routesWithGeometry.reduce((sum, r) => sum + r.totalCost, 0),
        fuelCost: routesWithGeometry.reduce((sum, r) => sum + r.fuelCost, 0),
        fixedCost: routesWithGeometry.reduce((sum, r) => sum + r.fixedCost, 0),
        distanceCost: routesWithGeometry.reduce((sum, r) => sum + r.distanceCost, 0),
        tollCost: routesWithGeometry.reduce((sum, r) => sum + r.tollCost, 0),
        unassignedCount: ortoolsResult.summary.unassigned_count,
        computationTimeMs: computationTime,
        avgCapacityUtilization: ortoolsResult.summary.avg_capacity_utilization,
      },
      routes: routesWithGeometry,
      unassigned: ortoolsResult.unassigned || [],
    }
  } catch (error) {
    console.error("[v0] Railway OR-Tools hatası:", error)
    throw error
  }
}

// Yerel Nearest Neighbor optimizer (fallback)
function localOptimize(
  depots: Depot[],
  vehicles: Vehicle[],
  customers: Customer[],
  options: {
    fuelPricePerLiter: number
    maxRouteDistanceKm?: number
    maxRouteTimeMin?: number
    vehicleCapacityUtilization?: number
  },
) {
  const startTime = Date.now()

  const availableVehicles = vehicles.filter((v) => v.status === "active" || v.status === "available" || !v.status)

  if (availableVehicles.length === 0) {
    throw new Error("Kullanılabilir araç bulunamadı")
  }

  const depotCustomers = new Map<string, Customer[]>()
  for (const depot of depots) {
    depotCustomers.set(depot.id, [])
  }

  for (const customer of customers) {
    if (customer.assigned_depot_id && depotCustomers.has(customer.assigned_depot_id)) {
      depotCustomers.get(customer.assigned_depot_id)!.push(customer)
    } else {
      let minDist = Number.POSITIVE_INFINITY
      let closestDepot = depots[0]
      for (const depot of depots) {
        const dist = haversineDistance(customer.lat, customer.lng, depot.lat, depot.lng)
        if (dist < minDist) {
          minDist = dist
          closestDepot = depot
        }
      }
      depotCustomers.get(closestDepot.id)!.push(customer)
    }
  }

  const routes: any[] = []
  const unassigned: string[] = []

  for (const depot of depots) {
    let depotVehicles = availableVehicles.filter((v) => v.depot_id === depot.id)
    if (depotVehicles.length === 0) {
      depotVehicles = availableVehicles.slice(0, 3)
    }

    const depotCusts = depotCustomers.get(depot.id) || []
    if (depotCusts.length === 0) continue

    const remainingCustomers = [...depotCusts]
    let vehicleIndex = 0

    while (remainingCustomers.length > 0 && vehicleIndex < depotVehicles.length) {
      const vehicle = depotVehicles[vehicleIndex]
      const capacityLimit = Math.floor(
        (vehicle.capacity_pallet || vehicle.capacity_pallets || 12) * (options.vehicleCapacityUtilization || 0.9),
      )

      const routeStops: any[] = []
      let currentLat = depot.lat
      let currentLng = depot.lng
      let currentLoad = 0
      let totalDistance = 0
      let stopOrder = 0

      while (remainingCustomers.length > 0) {
        let nearestIdx = -1
        let nearestDist = Number.POSITIVE_INFINITY

        for (let i = 0; i < remainingCustomers.length; i++) {
          const cust = remainingCustomers[i]
          const demand = cust.demand_pallets || cust.demand_pallet || 1
          if (currentLoad + demand > capacityLimit) continue
          const dist = haversineDistance(currentLat, currentLng, cust.lat, cust.lng)
          if (dist < nearestDist) {
            nearestDist = dist
            nearestIdx = i
          }
        }

        if (nearestIdx === -1) break

        const customer = remainingCustomers[nearestIdx]
        const demand = customer.demand_pallets || customer.demand_pallet || 1
        const distanceToCustomer = nearestDist
        const distanceBackToDepot = haversineDistance(customer.lat, customer.lng, depot.lat, depot.lng)

        if (
          options.maxRouteDistanceKm &&
          totalDistance + distanceToCustomer + distanceBackToDepot > options.maxRouteDistanceKm
        ) {
          break
        }

        stopOrder++
        currentLoad += demand
        totalDistance += distanceToCustomer

        routeStops.push({
          customerId: customer.id,
          customerName: customer.name,
          address: customer.address,
          lat: customer.lat,
          lng: customer.lng,
          stopOrder,
          arrivalTime: Math.round((totalDistance / 50) * 60),
          serviceTime: 15,
          distanceFromPrev: Math.round(distanceToCustomer * 100) / 100,
          demand,
          cumulativeLoad: currentLoad,
        })

        currentLat = customer.lat
        currentLng = customer.lng
        remainingCustomers.splice(nearestIdx, 1)
      }

      if (routeStops.length > 0) {
        const returnDistance = haversineDistance(currentLat, currentLng, depot.lat, depot.lng)
        totalDistance += returnDistance
        const distanceSource = "local" // Debug için kaynak takibi

        const routePoints = [
          { lat: depot.lat, lng: depot.lng },
          ...routeStops.map((s) => ({ lat: s.lat, lng: s.lng })),
          { lat: depot.lat, lng: depot.lng },
        ]
        const vehicleType = vehicle.vehicle_type || "truck"

        const tollCalculation = calculateTollCosts(routePoints, vehicleType, totalDistance)

        const fuelConsumption = (totalDistance / 100) * (vehicle.fuel_consumption_per_100km || 20)
        const fuelCost = fuelConsumption * options.fuelPricePerLiter
        const distanceCost = totalDistance * (vehicle.cost_per_km || 2)
        const fixedCost = vehicle.fixed_daily_cost || 500
        const tollCost = tollCalculation.totalTollCost
        const totalCost = fuelCost + distanceCost + fixedCost + tollCost
        const vehicleCapacity = vehicle.capacity_pallet || vehicle.capacity_pallets || 12

        routes.push({
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
          vehicleType: vehicle.vehicle_type,
          depotId: depot.id,
          depotName: depot.name,
          stops: routeStops,
          totalDistance: Math.round(totalDistance * 100) / 100,
          totalDuration: Math.round((totalDistance / 50) * 60 + routeStops.length * 15),
          totalCost: Math.round(totalCost * 100) / 100,
          fuelCost: Math.round(fuelCost * 100) / 100,
          fixedCost: Math.round(fixedCost * 100) / 100,
          distanceCost: Math.round(distanceCost * 100) / 100,
          tollCost: Math.round(tollCost * 100) / 100,
          tollCrossings: tollCalculation.crossings,
          highwayUsage: tollCalculation.highwayUsage,
          totalLoad: currentLoad,
          capacityUtilization: Math.round((currentLoad / vehicleCapacity) * 100),
          geometry: null,
        })
      }

      vehicleIndex++
    }

    for (const cust of remainingCustomers) {
      unassigned.push(cust.id)
    }
  }

  const computationTime = Date.now() - startTime
  const totalDistance = routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0)
  const totalDuration = routes.reduce((sum, r) => sum + (r.totalDuration || 0), 0)
  const totalFuelCost = routes.reduce((sum, r) => sum + (r.fuelCost || 0), 0)
  const totalFixedCost = routes.reduce((sum, r) => sum + (r.fixedCost || 0), 0)
  const totalDistanceCost = routes.reduce((sum, r) => sum + (r.distanceCost || 0), 0)
  const totalTollCost = routes.reduce((sum, r) => sum + (r.tollCost || 0), 0)
  const totalCost = totalFuelCost + totalFixedCost + totalDistanceCost + totalTollCost
  const avgCapacityUtilization =
    routes.length > 0 ? routes.reduce((sum, r) => sum + (r.capacityUtilization || 0), 0) / routes.length : 0

  return {
    success: true,
    provider: "local",
    summary: {
      totalRoutes: routes.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost * 100) / 100,
      fuelCost: Math.round(totalFuelCost * 100) / 100,
      fixedCost: Math.round(totalFixedCost * 100) / 100,
      distanceCost: Math.round(totalDistanceCost * 100) / 100,
      tollCost: Math.round(totalTollCost * 100) / 100,
      unassignedCount: unassigned.length,
      computationTimeMs: computationTime,
      avgCapacityUtilization: Math.round(avgCapacityUtilization),
    },
    routes,
    unassigned: [...new Set(unassigned)],
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { depots, vehicles, customers, options = {} } = body

    console.log("[v0] Optimization request:", {
      customers: customers?.length,
      vehicles: vehicles?.length,
      depots: depots?.length,
    })

    let result

    if (RAILWAY_API_URL) {
      console.log("[v0] Using OR-Tools (Railway)")
      try {
        result = await optimizeWithORTools(depots, vehicles, customers, {
          fuelPricePerLiter: options.fuelPricePerLiter || 47.5,
          maxRouteDistanceKm: options.maxRouteDistanceKm,
          maxRouteTimeMin: options.maxRouteTimeMin,
          vehicleCapacityUtilization: options.vehicleCapacityUtilization || 0.8,
        })
      } catch (ortoolsError) {
        console.error("[v0] OR-Tools failed, falling back to ORS:", ortoolsError)
        result = ORS_API_KEY
          ? await optimizeWithORS(depots, vehicles, customers, {
              fuelPricePerLiter: options.fuelPricePerLiter || 47.5,
              maxRouteDistanceKm: options.maxRouteDistanceKm,
              maxRouteTimeMin: options.maxRouteTimeMin,
              vehicleCapacityUtilization: options.vehicleCapacityUtilization || 0.8,
            })
          : localOptimize(depots, vehicles, customers, {
              fuelPricePerLiter: options.fuelPricePerLiter || 47.5,
              maxRouteDistanceKm: options.maxRouteDistanceKm,
              maxRouteTimeMin: options.maxRouteTimeMin,
              vehicleCapacityUtilization: options.vehicleCapacityUtilization || 0.8,
            })
      }
    } else if (ORS_API_KEY) {
      console.log("[v0] Using ORS (RAILWAY_API_URL not set)")
      result = await optimizeWithORS(depots, vehicles, customers, {
        fuelPricePerLiter: options.fuelPricePerLiter || 47.5,
        maxRouteDistanceKm: options.maxRouteDistanceKm,
        maxRouteTimeMin: options.maxRouteTimeMin,
        vehicleCapacityUtilization: options.vehicleCapacityUtilization || 0.8,
      })
    } else {
      console.log("[v0] Using local optimizer (fallback)")
      result = localOptimize(depots, vehicles, customers, {
        fuelPricePerLiter: options.fuelPricePerLiter || 47.5,
        maxRouteDistanceKm: options.maxRouteDistanceKm,
        maxRouteTimeMin: options.maxRouteTimeMin,
        vehicleCapacityUtilization: options.vehicleCapacityUtilization || 0.8,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Optimizasyon hatası:", error)
    return NextResponse.json(
      {
        error: "Optimizasyon sırasında bir hata oluştu",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
