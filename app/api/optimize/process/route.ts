import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    await sql`
      UPDATE optimization_jobs
      SET status = 'processing', started_at = NOW()
      WHERE id = ${jobId}
    `

    const jobResult = await sql`
      SELECT request_data FROM optimization_jobs WHERE id = ${jobId}
    `

    if (jobResult.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const requestData = jobResult[0].request_data
    const startTime = Date.now()

    console.log("[v0] Processing job with data:", {
      depots: requestData.depots?.length,
      vehicles: requestData.vehicles?.length,
      customers: requestData.customers?.length,
      orders: requestData.orders?.length,
    })

    try {
      if (!requestData.depots || requestData.depots.length === 0) {
        throw new Error("No depots provided")
      }
      if (!requestData.vehicles || requestData.vehicles.length === 0) {
        throw new Error("No vehicles provided")
      }
      if (!requestData.orders || requestData.orders.length === 0) {
        throw new Error("No orders provided")
      }

      const customerIds = requestData.orders.map((o: any) => o.customerId)
      const customersResult = await sql`
        SELECT id, name, lat, lng, service_duration_min, has_time_constraint, 
               constraint_start_time, constraint_end_time, required_vehicle_type
        FROM customers
        WHERE id = ANY(${customerIds})
      `

      const railwayRequest = {
        depots: requestData.depots.map((d: any) => ({
          id: d.id,
          name: d.name,
          location: {
            lat: Number.parseFloat(d.lat),
            lng: Number.parseFloat(d.lng),
          },
        })),
        vehicles: requestData.vehicles.map((v: any) => ({
          id: v.id,
          depot_id: v.depot_id,
          type:
            v.vehicle_type === "kamyonet"
              ? 0
              : v.vehicle_type === "kamyon_1" || v.vehicle_type === "kamyon_2"
                ? 1
                : v.vehicle_type === "tir"
                  ? 2
                  : 3,
          capacity_pallets: v.capacity_pallets,
          fuel_consumption: v.fuel_consumption_per_100km,
        })),
        customers: customersResult.map((c: any) => {
          const order = requestData.orders.find((o: any) => o.customerId === c.id)
          return {
            id: c.id,
            name: c.name,
            location: {
              lat: Number.parseFloat(c.lat),
              lng: Number.parseFloat(c.lng),
            },
            demand_pallets: order?.pallets || 0,
            business_type: "retail",
            service_duration: c.service_duration_min || 15,
            priority: order?.priority || 3,
            time_constraints:
              c.has_time_constraint && c.constraint_start_time && c.constraint_end_time
                ? { start: c.constraint_start_time, end: c.constraint_end_time }
                : null,
            required_vehicle_type: c.required_vehicle_type || null,
          }
        }),
        algorithm: "ortools",
        fuel_price_per_liter: 47.5,
        max_route_distance_km: 500,
        max_route_time_min: 600,
      }

      console.log("[v0] Railway request summary:", {
        depots: railwayRequest.depots.length,
        vehicles: railwayRequest.vehicles.length,
        customers: railwayRequest.customers.length,
        sampleDepot: railwayRequest.depots[0],
        sampleCustomer: railwayRequest.customers[0],
        sampleVehicle: railwayRequest.vehicles[0],
      })

      const optimizeResponse = await fetch(`${process.env.RAILWAY_API_URL}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(railwayRequest),
      })

      if (!optimizeResponse.ok) {
        const errorText = await optimizeResponse.text()
        console.error("[v0] Railway error response:", errorText)
        throw new Error(`Railway error: ${errorText}`)
      }

      const result = await optimizeResponse.json()
      const processingTime = Math.round((Date.now() - startTime) / 1000)

      await sql`
        UPDATE optimization_jobs
        SET status = 'completed',
            result_data = ${JSON.stringify(result)},
            completed_at = NOW(),
            processing_time_seconds = ${processingTime}
        WHERE id = ${jobId}
      `

      return NextResponse.json({ success: true })
    } catch (error: any) {
      const processingTime = Math.round((Date.now() - startTime) / 1000)

      await sql`
        UPDATE optimization_jobs
        SET status = 'failed',
            error_message = ${error.message},
            completed_at = NOW(),
            processing_time_seconds = ${processingTime}
        WHERE id = ${jobId}
      `

      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] Process job failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
