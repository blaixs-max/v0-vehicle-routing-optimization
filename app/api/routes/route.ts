import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"
import { saveRoutesSchema } from "@/lib/validations"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const depotId = searchParams.get("depot_id")
    
    const routes = depotId
      ? await sql`
          SELECT 
            r.*,
            d.name as depot_name,
            d.city as depot_city,
            v.plate as vehicle_plate,
            v.vehicle_type,
            COUNT(rs.id) as stop_count
          FROM routes r
          LEFT JOIN depots d ON r.depot_id = d.id
          LEFT JOIN vehicles v ON r.vehicle_id = v.id
          LEFT JOIN route_stops rs ON r.id = rs.route_id
          WHERE r.depot_id = ${depotId}
          GROUP BY r.id, d.name, d.city, v.plate, v.vehicle_type
          ORDER BY r.created_at DESC
        `
      : await sql`
          SELECT 
            r.*,
            d.name as depot_name,
            d.city as depot_city,
            v.plate as vehicle_plate,
            v.vehicle_type,
            COUNT(rs.id) as stop_count
          FROM routes r
          LEFT JOIN depots d ON r.depot_id = d.id
          LEFT JOIN vehicles v ON r.vehicle_id = v.id
          LEFT JOIN route_stops rs ON r.id = rs.route_id
          GROUP BY r.id, d.name, d.city, v.plate, v.vehicle_type
          ORDER BY r.created_at DESC
        `

    // Fetch ALL route_stops in a single query to avoid rate limits
    const routeIds = routes.map((r: any) => r.id)
    const allStops = routeIds.length > 0 
      ? await sql`
          SELECT 
            rs.*,
            c.name as customer_name,
            c.lat,
            c.lng,
            c.city,
            c.district,
            c.service_duration_minutes,
            o.demand_pallet as demand
          FROM route_stops rs
          LEFT JOIN customers c ON rs.customer_id = c.id
          LEFT JOIN orders o ON rs.order_id = o.id
          WHERE rs.route_id = ANY(${routeIds})
          ORDER BY rs.route_id, rs.stop_order ASC
        `
      : []

    // Group stops by route_id
    const stopsByRouteId = new Map<string, any[]>()
    allStops.forEach((stop: any) => {
      if (!stopsByRouteId.has(stop.route_id)) {
        stopsByRouteId.set(stop.route_id, [])
      }
      stopsByRouteId.get(stop.route_id)!.push(stop)
    })

    // Attach stops to routes
    const routesWithStops = routes.map((route: any) => ({
      ...route,
      stops: stopsByRouteId.get(route.id) || []
    }))

    return NextResponse.json(routesWithStops)
  } catch (error) {
    console.error("[v0] Failed to fetch routes:", error)
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 })
  }
}

// Helper function to fetch route geometry from ORS API
async function fetchRouteGeometry(depotLat: number, depotLng: number, stops: any[]): Promise<string | null> {
  try {
    if (!process.env.ORS_API_KEY) {
      console.log("[v0] ORS_API_KEY not found, skipping geometry fetch")
      return null
    }

    // Build coordinates array: depot -> stops -> depot
    const stopCoordinates = stops
      .map((s: any) => {
        const lng = parseFloat(s.location?.lng || s.lng)
        const lat = parseFloat(s.location?.lat || s.lat)
        
        // Validate coordinates - must be valid numbers and not 0
        if (isNaN(lng) || isNaN(lat) || lng === 0 || lat === 0) {
          console.error("[v0] Invalid stop coordinates:", { stop: s.customer_id, lat, lng })
          return null
        }
        
        return [lng, lat]
      })
      .filter((coord): coord is [number, number] => coord !== null)

    if (stopCoordinates.length === 0) {
      console.error("[v0] No valid stop coordinates found")
      return null
    }

    const coordinates = [
      [depotLng, depotLat], // Start at depot
      ...stopCoordinates,
      [depotLng, depotLat] // Return to depot
    ]

    console.log("[v0] ORS request coordinates:", JSON.stringify(coordinates))

    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        "Authorization": process.env.ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates }),
    })

    if (!response.ok) {
      console.error("[v0] ORS API error:", response.status)
      return null
    }

    const data = await response.json()
    const geometry = data.features?.[0]?.geometry?.coordinates

    if (geometry && Array.isArray(geometry)) {
      // Convert coordinates to polyline string format
      return JSON.stringify(geometry)
    }

    return null
  } catch (error) {
    console.error("[v0] Failed to fetch route geometry:", error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = saveRoutesSchema.safeParse(body)
    if (!validation.success) {
      console.error("[v0] Validation failed:", validation.error.errors)
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.errors },
        { status: 400 }
      )
    }

    const { routes: routeData, optimization_id } = validation.data

    console.log("[v0] Saving routes:", routeData.length)

    for (const route of routeData) {
      let geometry = route.geometry || null
      
      // If no geometry provided and we have stops, fetch it from ORS
      if (!geometry && route.stops && route.stops.length > 0) {
        console.log("[v0] Fetching geometry for route:", route.id)
        
        // Get depot coordinates
        const depotResult = await sql`SELECT lat, lng FROM depots WHERE id = ${route.depotId}`
        if (depotResult.length > 0) {
          const depot = depotResult[0]
          geometry = await fetchRouteGeometry(
            parseFloat(depot.lat),
            parseFloat(depot.lng),
            route.stops
          )
          
          if (geometry) {
            console.log("[v0] Geometry fetched successfully for route:", route.id)
          }
        }
      }
      
      const [savedRoute] = await sql`
        INSERT INTO routes (
          id, vehicle_id, depot_id, route_date, status,
          total_distance_km, total_duration_min, total_pallets,
          total_cost, fuel_cost, distance_cost, fixed_cost,
          toll_cost, toll_crossings_count, highway_usage_count,
          geometry, optimized_at
        ) VALUES (
          ${route.id},
          ${route.vehicleId},
          ${route.depotId},
          ${route.routeDate || new Date().toISOString().split("T")[0]},
          'pending',
          ${route.totalDistance},
          ${route.totalDuration},
          ${route.totalPallets},
          ${route.totalCost},
          ${route.fuelCost},
          ${route.distanceCost},
          ${route.fixedCost},
          ${route.tollCost || 0},
          ${route.tollCrossings?.length || 0},
          ${route.highwayUsage?.length || 0},
          ${geometry},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          total_distance_km = EXCLUDED.total_distance_km,
          total_duration_min = EXCLUDED.total_duration_min,
          total_pallets = EXCLUDED.total_pallets,
          total_cost = EXCLUDED.total_cost,
          fuel_cost = EXCLUDED.fuel_cost,
          distance_cost = EXCLUDED.distance_cost,
          fixed_cost = EXCLUDED.fixed_cost,
          toll_cost = EXCLUDED.toll_cost,
          geometry = EXCLUDED.geometry,
          optimized_at = NOW()
        RETURNING id
      `

      // Delete existing stops for this route (in case of re-save)
      await sql`DELETE FROM route_stops WHERE route_id = ${route.id}`

      for (const stop of route.stops) {
        const stopLat = stop.lat || stop.location?.lat || null
        const stopLng = stop.lng || stop.location?.lng || null
        
        // Find pending order for this customer
        const [customerOrder] = await sql`
          SELECT id FROM orders 
          WHERE customer_id = ${stop.customerId} 
          AND status IN ('pending', 'approved')
          ORDER BY order_date DESC
          LIMIT 1
        `
        
        await sql`
          INSERT INTO route_stops (
            route_id, customer_id, stop_order,
            distance_from_prev_km, duration_from_prev_min,
            cumulative_distance_km, cumulative_load_pallets,
            arrival_time, lat, lng, status, order_id
          ) VALUES (
            ${savedRoute.id},
            ${stop.customerId},
            ${stop.stopOrder},
            ${stop.distanceFromPrev || 0},
            ${stop.durationFromPrev || 0},
            ${stop.cumulativeDistance || 0},
            ${stop.cumulativeLoad || 0},
            ${stop.arrivalTime || null},
            ${stopLat},
            ${stopLng},
            'pending',
            ${customerOrder?.id || null}
          )
        `
        
        // Update order with route_id (if order found)
        if (customerOrder) {
          await sql`UPDATE orders SET route_id = ${savedRoute.id} WHERE id = ${customerOrder.id}`
        }
      }
    }

    return NextResponse.json({ success: true, count: routeData.length })
  } catch (error) {
    console.error("[v0] Failed to save routes:", error)
    return NextResponse.json({ error: "Failed to save routes" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const routeId = searchParams.get("id")

    if (!routeId) {
      return NextResponse.json({ error: "Route ID required" }, { status: 400 })
    }

    console.log("[v0] Deleting route:", routeId)

    // Delete route stops first (foreign key constraint)
    await sql`DELETE FROM route_stops WHERE route_id = ${routeId}`

    // Delete route
    const result = await sql`DELETE FROM routes WHERE id = ${routeId} RETURNING id`

    if (result.length === 0) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 })
    }

    console.log("[v0] Route deleted successfully:", routeId)
    return NextResponse.json({ message: "Route deleted successfully", routeId })
  } catch (error) {
    console.error("[v0] Route delete error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete route",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: "Route ID and status required" }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'in_transit', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    console.log("[v0] Updating route status:", id, status)

    const [route] = await sql`
      UPDATE routes 
      SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 })
    }

    console.log("[v0] Route status updated:", id)
    return NextResponse.json(route)
  } catch (error) {
    console.error("[v0] Route update error:", error)
    return NextResponse.json(
      {
        error: "Failed to update route",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
