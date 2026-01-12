import { NextResponse } from "next/server"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { ORSClient } from "@/lib/ors/client"
import { calculateTollCosts } from "@/lib/toll-costs"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execAsync = promisify(exec)
const ORS_API_KEY = process.env.ORS_API_KEY

// Debug log ekle - ORS API key durumunu göster
console.log("[v0] ORS_API_KEY exists:", !!ORS_API_KEY, "Length:", ORS_API_KEY?.length || 0)

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

// OR-Tools optimization via Python script
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
  const startTime = Date.now()

  // Prepare input data for OR-Tools
  const inputData = {
    depots: depots.map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lng: d.lng,
    })),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      vehicle_type: v.vehicle_type,
      capacity_pallets: v.capacity_pallet || v.capacity_pallets || 12,
      fuel_consumption: v.fuel_consumption_per_100km || 25,
      depot_id: v.depot_id,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      demand_pallets: c.demand_pallets || c.demand_pallet || 1,
      business_type: c.business_type || "DEFAULT",
      time_window_start: c.time_window_start,
      time_window_end: c.time_window_end,
      special_constraint: c.special_constraint,
      required_vehicle_types: c.required_vehicle_types,
    })),
    options: {
      fuel_price_per_liter: options.fuelPricePerLiter,
      max_route_distance_km: options.maxRouteDistanceKm,
      max_route_time_min: options.maxRouteTimeMin,
      capacity_utilization: options.vehicleCapacityUtilization || 0.9,
    },
  }

  // Write input to temp file
  const inputPath = path.join(process.cwd(), "scripts", "ortools_input.json")
  const outputPath = path.join(process.cwd(), "scripts", "ortools_output.json")

  const fs = require("fs")
  fs.writeFileSync(inputPath, JSON.stringify(inputData, null, 2))

  // Execute Python script
  const scriptPath = path.join(process.cwd(), "scripts", "ortools_optimizer.py")
  const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${inputPath}" "${outputPath}"`)

  if (stderr) {
    console.error("[v0] OR-Tools stderr:", stderr)
  }

  // Read output
  const output = JSON.parse(fs.readFileSync(outputPath, "utf-8"))

  if (!output.success) {
    throw new Error(output.error || "OR-Tools optimization failed")
  }

  // Enhance routes with ORS geometry and toll costs
  const client = new ORSClient(ORS_API_KEY!)
  for (const route of output.routes) {
    const routePoints = [
      { lat: route.depot_lat, lng: route.depot_lng },
      ...route.stops.map((s: any) => ({ lat: s.lat, lng: s.lng })),
      { lat: route.depot_lat, lng: route.depot_lng },
    ]

    try {
      const geometryPoints = await client.getRouteGeometry(routePoints, "driving-hgv")
      const tollCalculation = calculateTollCosts(geometryPoints, route.vehicle_type, route.total_distance)

      route.geometry = geometryPoints
      route.tollCost = tollCalculation.totalTollCost
      route.tollCrossings = tollCalculation.crossings
      route.highwayUsage = tollCalculation.highwayUsage
      route.totalCost = route.fuelCost + route.fixedCost + route.distanceCost + tollCalculation.totalTollCost
    } catch (e) {
      console.warn("[v0] Failed to get geometry/toll for route:", route.vehicle_plate)
    }
  }

  const computationTime = Date.now() - startTime

  return {
    success: true,
    provider: "ortools",
    summary: {
      ...output.summary,
      computationTimeMs: computationTime,
    },
    routes: output.routes,
    unassigned: output.unassigned || [],
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      depots,
      vehicles,
      customers,
      algorithm = "ortools", // Default to OR-Tools
      fuelPricePerLiter = 47.5,
      maxRouteDistanceKm,
      maxRouteTimeMin,
      vehicleCapacityUtilization = 0.9,
    } = body

    console.log("[v0] Optimize request:", {
      algorithm,
      depots: depots?.length,
      vehicles: vehicles?.length,
      customers: customers?.length,
    })

    if (!Array.isArray(depots) || depots.length === 0) {
      return NextResponse.json({ error: "En az bir depo gereklidir" }, { status: 400 })
    }

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json({ error: "En az bir araç gereklidir" }, { status: 400 })
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "En az bir müşteri gereklidir" }, { status: 400 })
    }

    if (algorithm === "ortools") {
      try {
        console.log("[v0] Attempting OR-Tools optimization...")
        const ortoolsResult = await optimizeWithORTools(depots, vehicles, customers, {
          fuelPricePerLiter,
          maxRouteDistanceKm,
          maxRouteTimeMin,
          vehicleCapacityUtilization,
        })

        console.log("[v0] OR-Tools succeeded:", ortoolsResult.summary)
        return NextResponse.json(ortoolsResult)
      } catch (ortoolsError) {
        console.error("[v0] OR-Tools failed, falling back to ORS:", ortoolsError)
        // Fall through to ORS
      }
    }

    if (ORS_API_KEY && (algorithm === "ors" || algorithm === "ortools")) {
      console.log("[v0] Using ORS optimization...")
      const orsResult = await optimizeWithORS(depots, vehicles, customers, {
        fuelPricePerLiter,
        maxRouteDistanceKm,
        maxRouteTimeMin,
        vehicleCapacityUtilization,
      })
      return NextResponse.json(orsResult)
    }

    // Final fallback: Local algorithm
    console.log("[v0] Using local optimization (Clarke-Wright)...")
    const localResult = localOptimize(depots, vehicles, customers, {
      fuelPricePerLiter,
      maxRouteDistanceKm,
      maxRouteTimeMin,
      vehicleCapacityUtilization,
    })
    return NextResponse.json(localResult)
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
