import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { optimizeWithVroom } from "@/lib/vroom/optimizer"

// N8N Webhook for dynamic re-optimization
// Use case: New urgent order, vehicle breakdown, traffic update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const webhookSecret = request.headers.get("x-webhook-secret")
    if (process.env.N8N_WEBHOOK_SECRET && webhookSecret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      reason, // "new_order", "vehicle_breakdown", "traffic_update"
      affectedVehicleId,
      newCustomerId,
      fuelPricePerLiter = 47.5,
    } = body

    const supabase = await createClient()

    // Handle different re-optimization scenarios
    switch (reason) {
      case "new_order": {
        // Add new customer to pending and re-optimize affected depot
        if (!newCustomerId) {
          return NextResponse.json({ error: "newCustomerId required" }, { status: 400 })
        }

        const customerRes = await supabase.from("customers").select("*").eq("id", newCustomerId).single()

        if (customerRes.error || !customerRes.data) {
          return NextResponse.json({ error: "Customer not found" }, { status: 404 })
        }

        const customer = customerRes.data
        const depotId = customer.assigned_depot_id

        // Re-optimize for that depot
        const [depotsRes, vehiclesRes, customersRes] = await Promise.all([
          supabase.from("depots").select("*").eq("status", "active"),
          supabase.from("vehicles").select("*").eq("status", "available").eq("depot_id", depotId),
          supabase.from("customers").select("*").eq("status", "pending").eq("assigned_depot_id", depotId),
        ])

        const result = await optimizeWithVroom(depotsRes.data || [], vehiclesRes.data || [], customersRes.data || [], {
          depotId,
          fuelPricePerLiter,
          includeGeometry: true,
        })

        return NextResponse.json({
          success: result.success,
          reason: "new_order",
          affectedDepot: depotId,
          result: result.summary,
          routes: result.routes,
        })
      }

      case "vehicle_breakdown": {
        // Remove vehicle from available pool and re-optimize
        if (!affectedVehicleId) {
          return NextResponse.json({ error: "affectedVehicleId required" }, { status: 400 })
        }

        // Mark vehicle as maintenance
        await supabase.from("vehicles").update({ status: "maintenance" }).eq("id", affectedVehicleId)

        // Get vehicle's depot
        const vehicleRes = await supabase.from("vehicles").select("depot_id").eq("id", affectedVehicleId).single()

        const depotId = vehicleRes.data?.depot_id

        // Cancel routes assigned to this vehicle
        await supabase
          .from("routes")
          .update({ status: "cancelled" })
          .eq("vehicle_id", affectedVehicleId)
          .eq("status", "planned")

        // Re-optimize for depot
        const [depotsRes, vehiclesRes, customersRes] = await Promise.all([
          supabase.from("depots").select("*").eq("status", "active"),
          supabase.from("vehicles").select("*").eq("status", "available").eq("depot_id", depotId),
          supabase.from("customers").select("*").eq("status", "pending").eq("assigned_depot_id", depotId),
        ])

        const result = await optimizeWithVroom(depotsRes.data || [], vehiclesRes.data || [], customersRes.data || [], {
          depotId,
          fuelPricePerLiter,
          includeGeometry: true,
        })

        return NextResponse.json({
          success: result.success,
          reason: "vehicle_breakdown",
          affectedVehicle: affectedVehicleId,
          affectedDepot: depotId,
          result: result.summary,
          routes: result.routes,
        })
      }

      default:
        return NextResponse.json({ error: "Unknown reason" }, { status: 400 })
    }
  } catch (error) {
    console.error("N8N Re-optimization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
