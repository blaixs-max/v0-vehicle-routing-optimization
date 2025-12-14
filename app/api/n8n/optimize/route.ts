import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { optimizeWithVroom } from "@/lib/vroom/optimizer"
import type { VroomOptimizationRequest } from "@/lib/vroom/types"
import { DEFAULTS } from "@/lib/constants"

// N8N Webhook endpoint for VRP optimization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate webhook secret (optional security)
    const webhookSecret = request.headers.get("x-webhook-secret")
    if (process.env.N8N_WEBHOOK_SECRET && webhookSecret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract parameters from N8N
    const {
      depotId,
      fuelPricePerLiter = DEFAULTS.fuelPricePerLiter,
      maxRouteDistanceKm,
      maxRouteTimeMin,
      includeGeometry = true,
      aiSuggestions, // AI tarafından önerilen parametreler
      saveRoutes = false,
    } = body

    // If AI suggestions provided, merge them
    const options: VroomOptimizationRequest = {
      depotId,
      fuelPricePerLiter: aiSuggestions?.fuelPrice || fuelPricePerLiter,
      maxRouteDistanceKm: aiSuggestions?.maxDistance || maxRouteDistanceKm,
      maxRouteTimeMin: aiSuggestions?.maxTime || maxRouteTimeMin,
      includeGeometry,
    }

    // Fetch data from Supabase
    const supabase = await createClient()

    const [depotsRes, vehiclesRes, customersRes] = await Promise.all([
      supabase.from("depots").select("*").eq("status", "active"),
      supabase.from("vehicles").select("*").in("status", ["available", "active"]),
      supabase.from("customers").select("*").in("status", ["pending", "active"]),
    ])

    if (depotsRes.error) throw new Error(`Depots error: ${depotsRes.error.message}`)
    if (vehiclesRes.error) throw new Error(`Vehicles error: ${vehiclesRes.error.message}`)
    if (customersRes.error) throw new Error(`Customers error: ${customersRes.error.message}`)

    const depots = depotsRes.data || []
    const vehicles = vehiclesRes.data || []
    const customers = customersRes.data || []

    // Run VROOM optimization
    const result = await optimizeWithVroom(depots, vehicles, customers, options)

    // Save optimization history
    if (result.success) {
      await supabase.from("optimization_history").insert({
        algorithm: "VROOM",
        depot_id: depotId || null,
        parameters: {
          ...options,
          aiSuggestions: aiSuggestions || null,
          source: "n8n_webhook",
        },
        total_routes: result.summary.totalRoutes,
        total_vehicles_used: result.summary.totalRoutes,
        total_distance_km: result.summary.totalDistance,
        total_cost: result.summary.totalCost,
        computation_time_ms: result.summary.computationTimeMs,
      })

      // Optionally save routes to database
      if (saveRoutes) {
        for (const route of result.routes) {
          const routeInsert = await supabase
            .from("routes")
            .insert({
              vehicle_id: route.vehicleId,
              depot_id: route.depotId,
              total_distance_km: route.distance,
              total_duration_min: route.duration,
              total_cost: route.cost,
              fixed_cost: route.fixedCost,
              distance_cost: route.distanceCost,
              fuel_cost: route.fuelCost,
              status: "planned",
            })
            .select()
            .single()

          if (routeInsert.data) {
            // Insert route stops
            const stops = route.stops.map((stop, index) => ({
              route_id: routeInsert.data.id,
              customer_id: stop.customerId,
              stop_order: index + 1,
              distance_from_prev: stop.distanceFromPrev,
              duration_from_prev: stop.arrivalTime,
              cumulative_load: stop.load,
            }))

            await supabase.from("route_stops").insert(stops)
          }
        }

        // Update customer statuses
        const assignedCustomerIds = result.routes.flatMap((r) => r.stops.map((s) => s.customerId))
        if (assignedCustomerIds.length > 0) {
          await supabase.from("customers").update({ status: "active" }).in("id", assignedCustomerIds)
        }
      }
    }

    return NextResponse.json({
      success: result.success,
      error: result.error,
      summary: result.summary,
      routes: result.routes,
      unassigned: result.unassigned,
      meta: {
        timestamp: new Date().toISOString(),
        source: "n8n_webhook",
        depotsCount: depots.length,
        vehiclesCount: vehicles.length,
        customersCount: customers.length,
      },
    })
  } catch (error) {
    console.error("N8N Optimization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// GET endpoint for checking API status
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "VRP Optimization API",
    version: "2.0.0",
    engine: "VROOM + OSRM",
    endpoints: {
      optimize: "POST /api/n8n/optimize",
      analyze: "POST /api/n8n/analyze",
      reoptimize: "POST /api/n8n/reoptimize",
    },
  })
}
