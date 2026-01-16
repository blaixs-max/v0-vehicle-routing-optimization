import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const all = searchParams.get("all") === "true"

    if (all) {
      // Tüm rotaları getir
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
    }

    // Sayfalama ile getir
    const offset = (page - 1) * limit
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
      LIMIT ${limit} OFFSET ${offset}
    `

    // Toplam sayı
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM routes`

    return NextResponse.json({
      data: routes,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Failed to fetch routes:", error)
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { routes: routeData, optimization_id } = await request.json()

    console.log("[v0] Saving routes:", routeData.length)

    // Batch insert için route ve stop verilerini hazırla
    const routeValues: any[] = []
    const stopValues: any[] = []

    for (const route of routeData) {
      routeValues.push({
        id: route.id,
        vehicleId: route.vehicleId,
        depotId: route.depotId,
        routeDate: route.routeDate || new Date().toISOString().split("T")[0],
        totalDistance: route.totalDistance,
        totalDuration: route.totalDuration,
        totalPallets: route.totalPallets,
        totalCost: route.totalCost,
        fuelCost: route.fuelCost,
        distanceCost: route.distanceCost,
        fixedCost: route.fixedCost,
      })

      for (const stop of route.stops) {
        stopValues.push({
          routeId: route.id,
          customerId: stop.customerId,
          stopOrder: stop.stopOrder,
          distanceFromPrev: stop.distanceFromPrev || 0,
          durationFromPrev: stop.durationFromPrev || 0,
          cumulativeDistance: stop.cumulativeDistance || 0,
          cumulativeLoad: stop.cumulativeLoad || 0,
          arrivalTime: stop.arrivalTime || null,
        })
      }
    }

    // Batch insert routes - tek sorguda tüm rotaları ekle
    if (routeValues.length > 0) {
      const routePlaceholders = routeValues
        .map(
          (_, i) =>
            `($${i * 12 + 1}, $${i * 12 + 2}, $${i * 12 + 3}, $${i * 12 + 4}, 'planned', $${i * 12 + 5}, $${i * 12 + 6}, $${i * 12 + 7}, $${i * 12 + 8}, $${i * 12 + 9}, $${i * 12 + 10}, $${i * 12 + 11}, NOW())`,
        )
        .join(", ")

      const routeParams = routeValues.flatMap((r) => [
        r.id,
        r.vehicleId,
        r.depotId,
        r.routeDate,
        r.totalDistance,
        r.totalDuration,
        r.totalPallets,
        r.totalCost,
        r.fuelCost,
        r.distanceCost,
        r.fixedCost,
      ])

      await sql.unsafe(`
        INSERT INTO routes (
          id, vehicle_id, depot_id, route_date, status,
          total_distance_km, total_duration_min, total_pallets,
          total_cost, fuel_cost, distance_cost, fixed_cost,
          optimized_at
        ) VALUES ${routePlaceholders}
      `, routeParams)

      console.log("[v0] Batch inserted routes:", routeValues.length)
    }

    // Batch insert stops - tek sorguda tüm durakları ekle
    if (stopValues.length > 0) {
      const stopPlaceholders = stopValues
        .map(
          (_, i) =>
            `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, 'planned')`,
        )
        .join(", ")

      const stopParams = stopValues.flatMap((s) => [
        s.routeId,
        s.customerId,
        s.stopOrder,
        s.distanceFromPrev,
        s.durationFromPrev,
        s.cumulativeDistance,
        s.cumulativeLoad,
        s.arrivalTime,
      ])

      await sql.unsafe(`
        INSERT INTO route_stops (
          route_id, customer_id, stop_order,
          distance_from_prev_km, duration_from_prev_min,
          cumulative_distance_km, cumulative_load_pallets,
          arrival_time, status
        ) VALUES ${stopPlaceholders}
      `, stopParams)

      console.log("[v0] Batch inserted stops:", stopValues.length)
    }

    return NextResponse.json({ success: true, count: routeData.length })
  } catch (error) {
    console.error("[v0] Failed to save routes:", error)
    return NextResponse.json({ error: "Failed to save routes" }, { status: 500 })
  }
}
