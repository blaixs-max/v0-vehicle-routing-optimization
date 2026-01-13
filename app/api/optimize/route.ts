import { type NextRequest, NextResponse } from "next/server"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { ORSClient } from "@/lib/ors-client"
import { decodePolyline } from "@/lib/polyline"
import { calculateTollCosts } from "@/lib/toll-calculator"

const ORS_API_KEY = process.env.ORS_API_KEY
const RAILWAY_API_URL = process.env.RAILWAY_API_URL

console.log("[v0] ORS_API_KEY exists:", !!ORS_API_KEY)
console.log("[v0] RAILWAY_API_URL:", RAILWAY_API_URL)

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

async function optimizeWithRailway(
  selectedDepots: Depot[],
  selectedVehicles: Vehicle[],
  selectedCustomers: Customer[],
  options: any,
) {
  console.log("[v0] === Railway OR-Tools Optimization ===")
  console.log("[v0] Railway URL:", RAILWAY_API_URL)
  console.log("[v0] Request data:", {
    depots: selectedDepots.length,
    vehicles: selectedVehicles.length,
    customers: selectedCustomers.length,
  })

  if (!selectedDepots || selectedDepots.length === 0) {
    throw new Error("En az bir depo gereklidir")
  }

  const primaryDepot = selectedDepots[0]
  if (!primaryDepot || !primaryDepot.lat || !primaryDepot.lng || primaryDepot.lat === 0 || primaryDepot.lng === 0) {
    throw new Error("Geçerli koordinatlara sahip depo bulunamadı")
  }

  console.log("[v0] Primary depot:", primaryDepot.id, "at", primaryDepot.lat, primaryDepot.lng)

  const validCustomers = selectedCustomers.filter((c) => {
    const hasValidCoords = c.lat && c.lng && c.lat !== 0 && c.lng !== 0
    if (!hasValidCoords) {
      console.warn(`[v0] Invalid coordinates for customer ${c.id}: lat=${c.lat}, lng=${c.lng}`)
    }
    return hasValidCoords
  })

  if (validCustomers.length === 0) {
    throw new Error("Geçerli koordinatlara sahip müşteri bulunamadı")
  }

  console.log("[v0] Valid customers:", validCustomers.length, "/ Total:", selectedCustomers.length)

  const customersToOptimize =
    options?.customersToOptimize && options.customersToOptimize.length > 0
      ? validCustomers.filter((c) => options.customersToOptimize.includes(c.id))
      : validCustomers

  console.log("[v0] Customers to optimize after filter:", customersToOptimize.length)

  if (customersToOptimize.length === 0) {
    throw new Error("Optimize edilecek müşteri bulunamadı")
  }

  // Business type mapping
  const getBusinessType = (customer: any): string => {
    const business = customer.business_type || customer.business || ""
    if (business.toUpperCase().includes("MCD") || business.toUpperCase().includes("MCDONALD")) return "MCD"
    if (business.toUpperCase().includes("IKEA")) return "IKEA"
    if (business.toUpperCase().includes("CHOCO") || business.toUpperCase().includes("CHL")) return "CHL"
    if (business.toUpperCase().includes("OPET") || business.toUpperCase().includes("OPT")) return "OPT"
    return "OTHER"
  }

  // Service duration mapping (minutes)
  const getServiceDuration = (businessType: string): number => {
    switch (businessType) {
      case "MCD":
        return 60
      case "IKEA":
        return 45
      case "CHL":
        return 30
      case "OPT":
        return 30
      default:
        return 30
    }
  }

  // Railway API request format
  const railwayRequest = {
    customers: customersToOptimize.map((c: any) => ({
      id: c.id,
      name: c.name,
      location: {
        lat: c.lat,
        lng: c.lng,
      },
      demand_pallets: c.demand_pallet || c.demand_pallets || c.demand || 1,
      business_type: getBusinessType(c),
      service_duration: getServiceDuration(getBusinessType(c)),
      time_constraints: c.special_constraint || c.time_constraints || null,
      required_vehicle_types: c.required_vehicle_type ? [c.required_vehicle_type] : null,
    })),
    vehicles: selectedVehicles.map((v: any) => ({
      id: v.id,
      type: v.vehicle_type || 1,
      capacity_pallets: v.capacity_pallet || v.capacity_pallets || 10,
      fuel_consumption: v.fuel_consumption_per_100km || 25,
    })),
    depot: {
      id: primaryDepot.id,
      location: {
        lat: primaryDepot.lat,
        lng: primaryDepot.lng,
      },
    },
    fuel_price: options?.fuelPricePerLiter || 47.5,
  }

  console.log("[v0] Calling Railway API:", `${RAILWAY_API_URL}/optimize`)
  console.log("[v0] Sending customers count:", railwayRequest.customers.length)
  console.log("[v0] Sending depot:", railwayRequest.depot)

  try {
    const railwayResponse = await fetch(`${RAILWAY_API_URL}/optimize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(railwayRequest),
      signal: AbortSignal.timeout(60000),
    })

    console.log("[v0] Railway response status:", railwayResponse.status)

    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text()
      console.error("[v0] Railway API error:", errorText)
      return NextResponse.json(
        { error: `Railway API error (${railwayResponse.status}): ${errorText}` },
        { status: 500 },
      )
    }

    const railwayResult = await railwayResponse.json()
    console.log("[v0] Railway optimization successful")
    console.log("[v0] Routes found:", railwayResult.routes?.length)

    // Geometry and cost calculation for each route
    const client = new ORSClient(ORS_API_KEY!)
    for (const route of railwayResult.routes) {
      if (!route.stops || route.stops.length === 0) continue

      // Rota noktaları: depot -> stops -> depot
      const depot = selectedDepots.find((d) => d.id === route.depotId)
      if (!depot) continue

      const routePoints = [
        { lat: depot.lat, lng: depot.lng },
        ...route.stops.map((s: any) => ({ lat: s.lat, lng: s.lng })),
        { lat: depot.lat, lng: depot.lng },
      ]

      try {
        // ORS Directions API ile gerçek yol geometrisi al
        const geometryPoints = await client.getRouteGeometry(routePoints, "driving-hgv")
        route.geometryPoints = geometryPoints

        // Köprü/otoyol maliyet hesaplama
        const vehicleType = route.vehicleType || "truck"
        const tollCalculation = calculateTollCosts(geometryPoints, vehicleType, route.totalDistance || 0)

        route.tollCost = tollCalculation.totalTollCost
        route.tollCrossings = tollCalculation.crossings
        route.highwayUsage = tollCalculation.highwayUsage

        // Toplam maliyeti güncelle
        route.totalCost = (route.fuelCost || 0) + (route.fixedCost || 0) + (route.distanceCost || 0) + route.tollCost
      } catch (geoError) {
        console.error("[v0] Failed to get geometry for route:", route.vehicleId, geoError)
        // Geometri alınamazsa basit polyline kullan
        route.geometryPoints = routePoints
      }
    }

    return NextResponse.json({
      success: true,
      routes: railwayResult.routes,
      summary: railwayResult.summary,
      algorithm: "ortools",
    })
  } catch (fetchError: any) {
    console.error("[v0] Railway fetch error:", fetchError)

    if (fetchError instanceof Error && fetchError.name === "AbortError") {
      throw new Error("Railway API timeout (60 saniye)")
    }

    throw new Error(
      `Railway API connection failed: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { depots, vehicles, customers, algorithm = "ortools", options } = body

    console.log("[v0] === POST /api/optimize ===")
    console.log("[v0] Algorithm:", algorithm)
    console.log("[v0] Selected depots:", depots)
    console.log("[v0] Selected customers:", customers)
    console.log("[v0] Options:", options)

    if (!depots || depots.length === 0) {
      return NextResponse.json({ error: "En az bir depo gereklidir" }, { status: 400 })
    }

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: "En az bir araç gereklidir" }, { status: 400 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: "En az bir müşteri gereklidir" }, { status: 400 })
    }

    if (!RAILWAY_API_URL) {
      return NextResponse.json(
        {
          error: "OR-Tools servisi yapılandırılmamış",
          details: "RAILWAY_API_URL environment variable tanımlı değil",
        },
        { status: 503 },
      )
    }

    console.log("[v0] Starting optimization")

    let result
    if (algorithm === "ors") {
      result = await optimizeWithORS(depots, vehicles, customers, options)
    } else if (algorithm === "ortools") {
      result = await optimizeWithRailway(depots, vehicles, customers, options)
    } else {
      return NextResponse.json({ error: "Desteklenmeyen optimizasyon algoritması" }, { status: 400 })
    }

    console.log("[v0] Optimization completed successfully")
    console.log("[v0] Summary:", result.summary)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] === Optimization Error ===")
    console.error("[v0]", error)

    return NextResponse.json(
      {
        error: error.message || "Bilinmeyen hata",
        details: error.stack || undefined,
      },
      { status: 500 },
    )
  }
}
