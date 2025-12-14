import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// N8N Webhook endpoint for AI analysis
// This endpoint provides data for AI to analyze and suggest optimizations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const webhookSecret = request.headers.get("x-webhook-secret")
    if (process.env.N8N_WEBHOOK_SECRET && webhookSecret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { analysisType = "full" } = body

    const supabase = await createClient()

    // Fetch current state
    const [depotsRes, vehiclesRes, customersRes, routesRes, historyRes] = await Promise.all([
      supabase.from("depots").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("customers").select("*"),
      supabase
        .from("routes")
        .select("*, vehicle:vehicles(*), depot:depots(*), stops:route_stops(*, customer:customers(*))")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("optimization_history").select("*").order("created_at", { ascending: false }).limit(30),
    ])

    const depots = depotsRes.data || []
    const vehicles = vehiclesRes.data || []
    const customers = customersRes.data || []
    const routes = routesRes.data || []
    const history = historyRes.data || []

    // Calculate metrics
    const pendingCustomers = customers.filter((c) => c.status === "pending")
    const activeVehicles = vehicles.filter((v) => v.status === "available")
    const inUseVehicles = vehicles.filter((v) => v.status === "in_use")

    // Depot-level metrics
    const depotMetrics = depots.map((depot) => {
      const depotVehicles = vehicles.filter((v) => v.depot_id === depot.id)
      const depotCustomers = customers.filter((c) => c.assigned_depot_id === depot.id)
      const depotRoutes = routes.filter((r) => r.depot_id === depot.id)

      const totalCapacity = depotVehicles.reduce((sum, v) => sum + (v.capacity_pallet || 0), 0)
      const totalDemand = depotCustomers.reduce((sum, c) => sum + (c.demand_pallet || c.demand_pallets || 0), 0)

      return {
        depotId: depot.id,
        depotName: depot.name,
        city: depot.city,
        vehicleCount: depotVehicles.length,
        customerCount: depotCustomers.length,
        totalCapacity,
        totalDemand,
        utilizationRate: totalCapacity > 0 ? (totalDemand / totalCapacity) * 100 : 0,
        avgRouteDistance:
          depotRoutes.length > 0
            ? depotRoutes.reduce((sum, r) => sum + r.total_distance_km, 0) / depotRoutes.length
            : 0,
        avgRouteCost:
          depotRoutes.length > 0 ? depotRoutes.reduce((sum, r) => sum + r.total_cost, 0) / depotRoutes.length : 0,
      }
    })

    // Historical trends
    const historicalTrends = {
      avgCostLast7Days: calculateAverage(history.slice(0, 7), "total_cost"),
      avgCostLast30Days: calculateAverage(history, "total_cost"),
      avgDistanceLast7Days: calculateAverage(history.slice(0, 7), "total_distance_km"),
      avgDistanceLast30Days: calculateAverage(history, "total_distance_km"),
      optimizationCount: history.length,
    }

    // Anomalies detection (simple threshold-based)
    const anomalies: string[] = []

    for (const metric of depotMetrics) {
      if (metric.utilizationRate > 100) {
        anomalies.push(
          `${metric.depotName} deposunda kapasite asimi: Talep %${(metric.utilizationRate - 100).toFixed(1)} fazla`,
        )
      }
      if (metric.avgRouteDistance > 200) {
        anomalies.push(
          `${metric.depotName} deposunda ortalama rota mesafesi yuksek: ${metric.avgRouteDistance.toFixed(1)} km`,
        )
      }
    }

    // AI prompt context (for N8N to send to OpenAI)
    const aiContext = {
      currentState: {
        totalDepots: depots.length,
        totalVehicles: vehicles.length,
        availableVehicles: activeVehicles.length,
        totalCustomers: customers.length,
        pendingDeliveries: pendingCustomers.length,
      },
      depotMetrics,
      historicalTrends,
      anomalies,
      recentOptimizations: history.slice(0, 5).map((h) => ({
        algorithm: h.algorithm,
        totalRoutes: h.total_routes,
        totalCost: h.total_cost,
        totalDistance: h.total_distance_km,
        date: h.created_at,
      })),
    }

    return NextResponse.json({
      success: true,
      analysisType,
      data: aiContext,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("N8N Analysis error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function calculateAverage(data: any[], field: string): number {
  if (data.length === 0) return 0
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0)
  return Math.round((sum / data.length) * 100) / 100
}
