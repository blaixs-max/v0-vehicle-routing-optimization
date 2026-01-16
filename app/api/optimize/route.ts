import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function optimizeWithRailway(
  depots: any[],
  vehicles: any[],
  customers: any[],
  orders: any[],
  options: any,
): Promise<any> {
  if (!process.env.RAILWAY_API_URL) {
    throw new Error("Railway API URL not configured")
  }

  // Map orders to customers to get actual demand
  const customerDemandMap = new Map<string, number>()
  orders.forEach((order: any) => {
    const currentDemand = customerDemandMap.get(order.customerId) || 0
    customerDemandMap.set(order.customerId, currentDemand + (order.pallets || 0))
  })

  const totalDemand = Array.from(customerDemandMap.values()).reduce((sum, d) => sum + d, 0)
  console.log("[optimize] Orders processed:", orders.length, "Total demand:", totalDemand, "pallets")

  const railwayRequest: any = {
    depots: depots.map((d) => ({
      id: d.id,
      name: d.name,
      location: { lat: d.lat, lng: d.lng },
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      location: { lat: c.lat, lng: c.lng },
      demand_pallets: customerDemandMap.get(c.id) || c.demand_pallets || 1,
      business_type: c.business_type || "restaurant",
      service_duration: c.service_duration || 30,
      has_time_constraint: c.has_time_constraint || false,
      constraint_start_time: c.constraint_start_time || null,
      constraint_end_time: c.constraint_end_time || null,
      required_vehicle_types: c.required_vehicle_types || null,
    })),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      type: v.vehicle_type === 'tir' ? 3 : (v.vehicle_type === 'kamyon' ? 1 : 2),
      capacity_pallets: v.capacity_pallets || 12,
      fuel_consumption: v.fuel_consumption_per_100km || 25,
      plate: v.plate || v.license_plate || `Araç ${v.id}`,
    })),
    fuel_price: options.fuelPricePerLiter || 47.5,
  }

  // OR-Tools config parametrelerini ekle
  if (options.ortoolsConfig) {
    railwayRequest.time_limit_seconds = options.ortoolsConfig.time_limit_seconds
    railwayRequest.search_strategy = options.ortoolsConfig.search_strategy
    railwayRequest.use_local_search = options.ortoolsConfig.use_local_search
    railwayRequest.enable_time_windows = options.ortoolsConfig.enable_time_windows
    console.log("[optimize] Sending OR-Tools config to Railway:", options.ortoolsConfig)
  }

  const railwayResponse = await fetch(`${process.env.RAILWAY_API_URL}/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(railwayRequest),
    signal: AbortSignal.timeout(60000),
  })

  if (!railwayResponse.ok) {
    throw new Error(`Railway API error: ${railwayResponse.status}`)
  }

  const railwayResult = await railwayResponse.json()

  const formattedRoutes = (railwayResult.routes || []).map((route: any, index: number) => ({
    id: `route-${index + 1}`,
    vehicleId: route.vehicle_id || `v-${index + 1}`,
    vehiclePlate: route.plate || route.license_plate || `Araç ${index + 1}`,
    totalDistance: route.distance_km || route.total_distance_km || 0,
    totalDuration: route.duration_minutes || (route.distance_km ? Math.round((route.distance_km / 60) * 60) : 0),
    totalCost: route.total_cost || 0,
    totalLoad: route.total_pallets || 0,
    fuelCost: route.fuel_cost || 0,
    maintenanceCost: route.maintenance_cost || 0,
    driverCost: route.driver_cost || 0,
    otherCosts: route.other_costs || 0,
    stops: (route.stops || []).map((stop: any) => ({
      id: stop.customer_id || stop.id,
      customerId: stop.customer_id,
      customerName: stop.customer_name || stop.name,
      location: stop.location || { lat: 0, lng: 0 },
      arrivalTime: stop.arrival_time,
      departureTime: stop.departure_time,
      pallets: stop.pallets || stop.load || 0,
      distanceFromPrev: stop.distanceFromPrev || stop.distance_from_prev_km || 0,
      durationFromPrev: stop.durationFromPrev || stop.duration_from_prev_min || 0,
      cumulativeDistance: stop.cumulativeDistance || stop.cumulative_distance_km || 0,
      cumulativeLoad: stop.cumulativeLoad || stop.cumulative_load || 0,
    })),
    geometry: route.geometry || null,
  }))

  const summary = {
    totalCost: formattedRoutes.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0),
    totalDistance: formattedRoutes.reduce((sum: number, r: any) => sum + (r.totalDistance || 0), 0),
    totalDuration: formattedRoutes.reduce((sum: number, r: any) => sum + (r.totalDuration || 0), 0),
    fuelCost: formattedRoutes.reduce((sum: number, r: any) => sum + (r.fuelCost || 0), 0),
    maintenanceCost: formattedRoutes.reduce((sum: number, r: any) => sum + (r.maintenanceCost || 0), 0),
    driverCost: formattedRoutes.reduce((sum: number, r: any) => sum + (r.driverCost || 0), 0),
    otherCosts: formattedRoutes.reduce((sum: number, r: any) => sum + (r.otherCosts || 0), 0),
  }

  return {
    success: true,
    algorithm: "ortools",
    provider: "ortools-railway",
    routes: formattedRoutes,
    summary,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { depots, algorithm = "ortools" } = body
    const { vehicles, customers, orders = [] } = body
    const { fuelPricePerLiter = 47.5, ortoolsConfig } = body

    if (!depots || !vehicles || !customers) {
      return NextResponse.json({ success: false, error: "Missing required data" }, { status: 400 })
    }

    const availableVehicles = vehicles.filter((v: any) => v.status === "available")

    const result = await optimizeWithRailway(depots, availableVehicles, customers, orders, {
      fuelPricePerLiter,
      ortoolsConfig,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Optimization error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export const maxDuration = 60
