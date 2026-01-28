import { type NextRequest, NextResponse } from "next/server"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { ORSClient } from "@/lib/ors-client"
import { decodePolyline } from "@/lib/polyline"
import { calculateTollCosts } from "@/lib/toll-calculator"

console.log("[v0] ORS_API_KEY exists:", !!process.env.ORS_API_KEY)
console.log("[v0] RAILWAY_API_URL:", process.env.RAILWAY_API_URL)

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

function encodePolyline(coordinates: [number, number][]): string {
  if (!coordinates || coordinates.length === 0) return ""

  let output = ""
  let prevLat = 0
  let prevLng = 0

  for (const [lng, lat] of coordinates) {
    const latE5 = Math.round(lat * 1e5)
    const lngE5 = Math.round(lng * 1e5)

    const dLat = latE5 - prevLat
    const dLng = lngE5 - prevLng

    output += encodeValue(dLat)
    output += encodeValue(dLng)

    prevLat = latE5
    prevLng = lngE5
  }

  return output
}

function encodeValue(value: number): string {
  let encoded = ""
  let v = value < 0 ? ~(value << 1) : value << 1

  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
    v >>= 5
  }
  encoded += String.fromCharCode(v + 63)

  return encoded
}

async function getRouteGeometry(coordinates: [number, number][]): Promise<string> {
  if (coordinates.length < 2) return ""

  try {
    const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-hgv/geojson`, {
      method: "POST",
      headers: {
        Authorization: process.env.ORS_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: coordinates,
        instructions: false,
        elevation: false,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn("[v0] ORS geometry failed, falling back to straight lines")
      return encodePolyline(coordinates)
    }

    const data = await response.json()
    const orsCoordinates = data.features?.[0]?.geometry?.coordinates || []
    if (orsCoordinates.length > 0) {
      return encodePolyline(orsCoordinates)
    }
    return encodePolyline(coordinates)
  } catch (error) {
    console.warn("[v0] ORS geometry error:", error)
    return encodePolyline(coordinates)
  }
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
  const client = new ORSClient(process.env.ORS_API_KEY!)

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
          
          // Generate unique route ID: route-{timestamp}-{vehicleId}
          const routeId = `route-${Date.now()}-${vehicle?.id || `v-${route.vehicle}`}`

          allRoutes.push({
            id: routeId,
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

async function warmupRailway(): Promise<void> {
  if (!process.env.RAILWAY_API_URL) {
    console.warn("[v0] RAILWAY_API_URL not configured!")
    return
  }

  try {
    console.log("[v0] Warming up Railway at:", process.env.RAILWAY_API_URL)
    const response = await fetch(`${process.env.RAILWAY_API_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[v0] Railway warmed up successfully:", data)
    } else {
      console.warn("[v0] Railway health check failed:", response.status, response.statusText)
    }
  } catch (error) {
    console.error("[v0] Railway warmup failed:", error)
    throw new Error(`Railway servisi yanıt vermiyor. Lütfen RAILWAY_API_URL'yi kontrol edin veya VROOM algoritmasını kullanın. Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function optimizeWithRailway(
  depots: any[],
  vehicles: any[],
  customers: any[],
  orders: any[],
  options: any,
): Promise<any> {
  console.log("[v0] Starting Railway optimization with OR-Tools")
  console.log("[v0] DEBUG optimizeWithRailway: First customer:", JSON.stringify(customers[0], null, 2))

  if (!process.env.RAILWAY_API_URL) {
    throw new Error("RAILWAY_API_URL environment variable yapılandırılmamış. Lütfen Vercel'de RAILWAY_API_URL environment variable'ını ekleyin veya VROOM algoritmasını kullanın.")
  }
  
  console.log("[v0] Railway API URL:", process.env.RAILWAY_API_URL)

  const availableVehicles = vehicles.filter((v) => v.status !== "maintenance" && v.status !== "inactive")

  if (availableVehicles.length === 0) {
    throw new Error("Kullanılabilir araç bulunamadı - tüm araçlar bakımda veya aktif değil")
  }

  const validCustomers = customers.filter((c) => c.lat && c.lng && c.lat !== 0 && c.lng !== 0)

  if (validCustomers.length === 0) {
    throw new Error("Koordinatları olan müşteri bulunamadı")
  }

  // Map orders by customer_id (database uses underscore naming)
  const orderMap = new Map(orders.map((o) => [o.customer_id || o.customerId, o]))
  
  console.log("[v0] DEBUG: Order IDs in map:", Array.from(orderMap.keys()))
  console.log("[v0] DEBUG: Valid customer IDs:", validCustomers.map(c => c.id))

  const customersWithOrders = validCustomers.filter((c) => orderMap.has(c.id))
  
  console.log("[v0] DEBUG: First customer assigned_depot_id:", customersWithOrders[0]?.assigned_depot_id)

  if (customersWithOrders.length === 0) {
    throw new Error("Bekleyen siparişi olan müşteri bulunamadı")
  }

  const serviceDurationMinutes = 45 // Default fallback
  
  // Müşterilere depot_id ata - eğer yoksa en yakın depoyu bul
  const assignDepotToCustomer = (customer: any) => {
    if (customer.assigned_depot_id) {
      return customer.assigned_depot_id
    }
    
    // En yakın depoyu bul
    let nearestDepot = depots[0]
    let minDistance = Number.POSITIVE_INFINITY
    
    for (const depot of depots) {
      const dist = haversineDistance(customer.lat, customer.lng, depot.lat, depot.lng)
      if (dist < minDistance) {
        minDistance = dist
        nearestDepot = depot
      }
    }
    
    return nearestDepot.id
  }

  const railwayRequest = {
    depots: depots.map((d) => ({
      id: d.id,
      name: d.name,
      location: {
        lat: d.lat,
        lng: d.lng,
      },
    })),
    customers: customersWithOrders.map((c) => {
      const order = orderMap.get(c.id)!
      const depotId = assignDepotToCustomer(c)
      const demandRaw = order.demand_pallet || order.pallets || 10
      const demandParsed = parseInt(demandRaw, 10)
      console.log(`[v0] Customer ${c.id}: assigned_depot_id="${depotId}", demand_raw="${demandRaw}" (type: ${typeof demandRaw}), demand_parsed=${demandParsed}`)
      return {
        id: c.id,
        name: c.name || c.company_name || `Müşteri ${c.id}`,
        depot_id: depotId,  // Customer's assigned depot (guaranteed to have value)
        location: {
          lat: c.lat,
          lng: c.lng,
        },
        demand_pallets: demandParsed,
        priority: order.priority || 'normal',
        business_type: c.business_type || "retail",
        service_duration: c.service_duration_minutes || serviceDurationMinutes,
        time_constraints: c.has_time_constraint
          ? {
              start: c.constraint_start_time,
              end: c.constraint_end_time,
            }
          : null,
        // Vehicle type preference (logged by OR-Tools but not strictly enforced)
        required_vehicle_type: c.required_vehicle_type || null,
      }
    }),
    vehicles: availableVehicles.map((v) => {
      const vehicleType = mapVehicleTypeToInt(v.vehicle_type)
      return {
        id: v.id,
        type: vehicleType,
        capacity_pallets: parseInt(v.capacity_pallet || v.capacity_pallets || 12, 10),
        fuel_consumption: v.fuel_consumption || 25,
        vehicle_type_name: v.vehicle_type, // Send type name for matching
        plate: v.plate || v.license_plate || `${v.id}`, // Send plate to Railway
      }
    }),
    fuel_price: options.fuelPricePerLiter || 47.5,
  }

  console.log("[v0] Railway request prepared")
  console.log("[v0] Depots:", railwayRequest.depots.length)
  console.log("[v0] Customers to optimize:", customersWithOrders.length)
  console.log("[v0] DEBUG: First customer before mapping:", JSON.stringify(customers[0], null, 2))
  console.log("[v0] DEBUG: customersWithOrders[0].assigned_depot_id:", customersWithOrders[0]?.assigned_depot_id)
  console.log("[v0] Customer depot assignments:", railwayRequest.customers.map(c => ({ id: c.id, name: c.name, depot_id: c.depot_id })))
  console.log("[v0] Available vehicles:", availableVehicles.length)
  console.log("[v0] Vehicle details:", railwayRequest.vehicles.map(v => ({ 
    id: v.id, 
    type: v.type, 
    type_name: v.vehicle_type_name,
    capacity: v.capacity_pallets 
  })))
  console.log("[v0] Total demand:", railwayRequest.customers.reduce((sum, c) => sum + c.demand_pallets, 0))
  console.log("[v0] Total capacity:", railwayRequest.vehicles.reduce((sum, v) => sum + v.capacity_pallets, 0))

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 330000) // 5.5 min timeout for Railway (300s + 30s buffer)

    console.log("[v0] Calling Railway API:", process.env.RAILWAY_API_URL)
    console.log("[v0] Request body sample:", {
      depotCount: railwayRequest.depots.length,
      customersCount: railwayRequest.customers.length,
      vehiclesCount: railwayRequest.vehicles.length,
    })
    console.log("[v0] CRITICAL DEBUG - First customer being sent to Railway:", JSON.stringify(railwayRequest.customers[0]))

    // OSRM URL'yi environment variable'dan veya default değerden al
    const osrmUrl = process.env.OSRM_URL || process.env.NEXT_PUBLIC_OSRM_URL || 'https://router.project-osrm.org'
    
    // Railway request'e OSRM URL'yi ekle
    const railwayRequestWithOsrm = {
      ...railwayRequest,
      osrm_url: osrmUrl
    }
    
    console.log("[v0] OSRM URL being sent to Railway:", osrmUrl)
    
    const railwayResponse = await fetch(`${process.env.RAILWAY_API_URL}/optimize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(railwayRequestWithOsrm),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log("[v0] Railway response status:", railwayResponse.status)

    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text()
      console.error("[v0] Railway API error:", errorText)
      console.error("[v0] Railway response status:", railwayResponse.status)
      console.error("[v0] Railway response headers:", Object.fromEntries(railwayResponse.headers.entries()))
      
      if (railwayResponse.status === 502 || railwayResponse.status === 503) {
        throw new Error(`Railway OR-Tools servisi yanıt vermiyor (${railwayResponse.status}). Olası nedenler:\n1. Railway servisi çalışmıyor olabilir - Railway dashboard'u kontrol edin\n2. RAILWAY_API_URL yanlış olabilir: ${process.env.RAILWAY_API_URL}\n3. Railway servisi cold start yaşıyor olabilir - birkaç saniye bekleyip tekrar deneyin\n\nAlternatif: VROOM algoritmasını kullanabilirsiniz.`)
      }
      
      if (railwayResponse.status === 404) {
        throw new Error(`Railway API endpoint bulunamadı (404). RAILWAY_API_URL doğru mu? ${process.env.RAILWAY_API_URL}/optimize`)
      }
      
      throw new Error(`Railway API hatası (${railwayResponse.status}): ${errorText}`)
    }

    const railwayResult = await railwayResponse.json()
    console.log("[v0] Railway optimization successful")

    if (railwayResult.routes && railwayResult.routes.length > 0) {
      console.log("[v0] Railway first route keys:", Object.keys(railwayResult.routes[0]))
      console.log("[v0] Railway first route sample:", JSON.stringify(railwayResult.routes[0], null, 2))
    }

    if (!railwayResult || !railwayResult.routes || !Array.isArray(railwayResult.routes)) {
      throw new Error("Railway returned invalid response")
    }

    if (railwayResult.routes.length === 0) {
      console.warn("[v0] Railway returned no routes")
      return {
        success: true,
        algorithm: "ortools",
        provider: "ortools-railway",
        summary: {
          totalRoutes: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalCost: 0,
          unassignedCount: customersWithOrders.length,
        },
        routes: [],
        unassigned: customersWithOrders.map((c) => c.id),
      }
    }

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]))
    const customerMap = new Map(customers.map((c) => [c.id, c]))
    const depotMap = new Map(depots.map((d) => [d.id, d]))

    const formattedRoutes = railwayResult.routes.map((route: any, index: number) => {
      // Generate unique route ID: route-{timestamp}-{vehicleId}
      const vehicleId = route.vehicle_id || `vehicle-${index}`
      const routeId = `route-${Date.now()}-${vehicleId}`
      
      // Validate duration - should not exceed 1200 minutes (20 hours)
      const calculatedDuration = route.duration_minutes || Math.round(((route.distance_km || 0) / 60) * 60) || 0
      if (calculatedDuration > 1200) {
        console.warn(`[v0] WARNING: Route ${vehicleId} has duration ${calculatedDuration} min (>1200 min limit!)`)
        console.warn(`[v0] Route details: distance=${route.distance_km}km, stops=${route.stops?.length}`)
      }
      
      return {
        id: routeId,
        vehicleId: vehicleId,
        vehiclePlate: (() => {
          const plate = route.license_plate || route.plate || `Araç ${index + 1}`
          console.log(
            `[v0] Route ${index} plate from Railway: license_plate=${route.license_plate}, plate=${route.plate}, using=${plate}`,
          )
          return plate
        })(),
        vehicleType: route.vehicle_type || "Kamyon",
        depotId: route.depot_id,
        depotName: route.depot_name || depotMap.get(route.depot_id)?.name || "Depo",
        totalDistance: route.distance_km || route.total_distance_km || 0,
        distance: route.distance_km || route.total_distance_km || 0,
        totalDuration: calculatedDuration,
        duration: calculatedDuration,
        totalCost: route.total_cost || 0,
        totalLoad: route.total_pallets || route.total_load || 0,
        load: route.total_pallets || route.total_load || 0,
        totalPallets: route.total_pallets || route.total_load || 0,
        fuelCost: route.fuel_cost || 0,
        distanceCost: route.distance_cost || 0,
        fixedCost: route.fixed_cost || 0,
        tollCost: route.toll_cost || 0,
        stops: (route.stops || []).map((stop: any, stopIndex: number) => ({
          stopOrder: stopIndex + 1,
          customerId: stop.customer_id,
          customerName: stop.customer_name || customerMap.get(stop.customer_id)?.name || `Customer ${stopIndex + 1}`,
          address: stop.address || customerMap.get(stop.customer_id)?.address || "",
          lat: stop.location?.lat || stop.lat || 0,
          lng: stop.location?.lng || stop.lng || 0,
          latitude: stop.location?.lat || stop.lat || 0,
          longitude: stop.location?.lng || stop.lng || 0,
          demand: stop.demand || stop.pallets || 0,
          distanceFromPrev: stop.distanceFromPrev || stop.distance_from_prev_km || 0,
          durationFromPrev: stop.durationFromPrev || stop.duration_from_prev_min || 0,
          cumulativeDistance: stop.cumulativeDistance || stop.cumulative_distance_km || 0,
          cumulativeLoad: stop.cumulativeLoad || stop.cumulative_load || 0,
          arrivalTime: stop.arrival_time || null,
        })),
        geometry: route.geometry || [],
      }
    })

    const summary = {
      totalDistance: formattedRoutes.reduce((sum, r) => sum + (r.totalDistance || 0), 0),
      totalDuration: formattedRoutes.reduce((sum, r) => sum + (r.totalDuration || 0), 0),
      totalCost: formattedRoutes.reduce((sum, r) => sum + (r.totalCost || 0), 0),
      fuelCost: formattedRoutes.reduce((sum, r) => sum + (r.fuelCost || 0), 0),
      fixedCost: formattedRoutes.reduce((sum, r) => sum + (r.fixedCost || 0), 0),
      distanceCost: formattedRoutes.reduce((sum, r) => sum + (r.distanceCost || 0), 0),
      tollCost: formattedRoutes.reduce((sum, r) => sum + (r.tollCost || 0), 0),
      unassignedCount: 0,
      computationTimeMs: 0,
    }

    return {
      success: true,
      algorithm: "ortools",
      provider: "ortools-railway",
      summary,
      routes: formattedRoutes,
      unassigned: [],
    }
  } catch (error: any) {
    console.error("[v0] Railway optimization error:", error)

    if (error.name === "AbortError") {
      throw new Error("Railway API timeout - Lütfen tekrar deneyin")
    }

    throw error
  }
}

function mapVehicleTypeToInt(type: string | undefined): number {
  if (!type) return 3

  const typeStr = type.toLowerCase().trim()

  if (typeStr.includes("tır") || typeStr.includes("tir")) return 1
  if (typeStr.includes("kamyon")) return 2
  if (typeStr.includes("kamyonet")) return 3
  if (typeStr.includes("panelvan") || typeStr.includes("van")) return 4
  if (typeStr.includes("pikap")) return 5

  const typeNum = Number.parseInt(type)
  if (!Number.isNaN(typeNum) && typeNum >= 1 && typeNum <= 5) {
    return typeNum
  }

  return 3
}

function findNearestDepot(firstStop: any, depots: any[]): any {
  if (!firstStop || !depots || depots.length === 0) {
    return depots[0]
  }

  const stopLat = firstStop.location?.lat || firstStop.lat || 0
  const stopLng = firstStop.location?.lng || firstStop.lng || 0

  let nearestDepot = depots[0]
  let minDistance = Number.POSITIVE_INFINITY

  for (const depot of depots) {
    const distance = haversineDistance(stopLat, stopLng, depot.lat, depot.lng)
    if (distance < minDistance) {
      minDistance = distance
      nearestDepot = depot
    }
  }

  return nearestDepot
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[v0] POST /api/optimize called")
    console.log("[v0] DEBUG: Request body first customer:", JSON.stringify(body.customers?.[0], null, 2))

    // Fetch service duration from settings
    let serviceDurationMinutes = 45 // Default fallback
    try {
      const settingsResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/settings`)
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        serviceDurationMinutes = settingsData.service_duration_minutes || 45
        console.log("[v0] Service duration loaded from settings:", serviceDurationMinutes, "minutes")
      }
    } catch (error) {
      console.log("[v0] Failed to fetch settings, using default service duration:", serviceDurationMinutes)
    }

    const {
      depots: requestDepots, // Renamed to avoid confusion
      vehicles: requestVehicles,
      customers: requestCustomers,
      orders,
      algorithm = "ortools",
      fuelPrice = 47.5,
      maxRouteDistance,
      maxRouteTime = 1200,
    } = body
    
    console.log("[v0] DEBUG: requestCustomers[0]:", JSON.stringify(requestCustomers?.[0], null, 2))

    if (!requestDepots || !requestVehicles || !requestCustomers) {
      return NextResponse.json({ success: false, error: "Missing required data" }, { status: 400 })
    }

    const selectedDepots = requestDepots
    const availableVehicles = requestVehicles.filter((v: any) => v.status !== "maintenance" && v.status !== "inactive")
    const selectedCustomers = requestCustomers

    if (selectedDepots.length === 0 || selectedCustomers.length === 0 || availableVehicles.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Algorithm:", algorithm)
    console.log("[v0] Depots:", selectedDepots.length)
    console.log("[v0] Vehicles:", availableVehicles.length)
    console.log("[v0] Customers:", selectedCustomers.length)
    console.log("[v0] Orders:", orders?.length || 0)

    if (algorithm === "ortools") {
      await warmupRailway()
    }

    let optimization

    if (algorithm === "ortools") {
      optimization = await optimizeWithRailway(selectedDepots, availableVehicles, selectedCustomers, orders || [], {
        algorithm,
        fuelPricePerLiter: fuelPrice,
        maxRouteDistanceKm: maxRouteDistance,
        maxRouteTimeMin: maxRouteTime,
      })
    } else {
      optimization = await optimizeWithORS(selectedDepots, availableVehicles, selectedCustomers, {
        fuelPricePerLiter: fuelPrice,
        maxRouteDistanceKm: maxRouteDistance,
        maxRouteTimeMin: maxRouteTime,
      })
    }

    return NextResponse.json(optimization)
  } catch (error: any) {
    console.error("[v0] Optimization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Optimizasyon başarısız",
      },
      { status: 500 },
    )
  }
}

export const maxDuration = 60
