import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET() {
  try {
    const routes = await sql`
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

    return NextResponse.json(routes)
  } catch (error) {
    console.error("[v0] Failed to fetch routes:", error)
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { routes: routeData, optimization_id } = await request.json()

    console.log("[v0] Saving routes:", routeData.length)

    for (const route of routeData) {
      const [savedRoute] = await sql`
        INSERT INTO routes (
          id, vehicle_id, depot_id, route_date, status,
          total_distance_km, total_duration_min, total_pallets,
          total_cost, fuel_cost, distance_cost, fixed_cost,
          optimized_at
        ) VALUES (
          ${route.id},
          ${route.vehicleId},
          ${route.depotId},
          ${route.routeDate || new Date().toISOString().split("T")[0]},
          'planned',
          ${route.totalDistance},
          ${route.totalDuration},
          ${route.totalPallets},
          ${route.totalCost},
          ${route.fuelCost},
          ${route.distanceCost},
          ${route.fixedCost},
          NOW()
        )
        RETURNING id
      `

      for (const stop of route.stops) {
        await sql`
          INSERT INTO route_stops (
            route_id, customer_id, stop_order,
            distance_from_prev_km, duration_from_prev_min,
            cumulative_distance_km, cumulative_load_pallets,
            arrival_time, status
          ) VALUES (
            ${savedRoute.id},
            ${stop.customerId},
            ${stop.stopOrder},
            ${stop.distanceFromPrev || 0},
            ${stop.durationFromPrev || 0},
            ${stop.cumulativeDistance || 0},
            ${stop.cumulativeLoad || 0},
            ${stop.arrivalTime || null},
            'planned'
          )
        `
      }
    }

    return NextResponse.json({ success: true, count: routeData.length })
  } catch (error) {
    console.error("[v0] Failed to save routes:", error)
    return NextResponse.json({ error: "Failed to save routes" }, { status: 500 })
  }
}
