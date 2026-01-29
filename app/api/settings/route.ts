import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"

export async function GET() {
  try {
    const [settings] = await sql`
      SELECT * FROM settings 
      WHERE id = 1
    `

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        id: 1,
        fuel_price_per_liter: 35.0,
        driver_cost_per_hour: 150.0,
        vehicle_fixed_cost: 500.0,
        max_route_duration_hours: 8.0,
        max_distance_per_route_km: 300.0,
        service_time_per_stop_minutes: 15,
        routing_engine: 'ors',
        ors_api_url: 'https://api.openrouteservice.org',
        osrm_api_url: '',
        vroom_api_url: '',
        n8n_webhook_url: '',
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("[v0] Settings fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    console.log("[v0] Saving settings:", body)

    // Upsert settings (insert or update)
    const [settings] = await sql`
      INSERT INTO settings (
        id, fuel_price_per_liter, driver_cost_per_hour, vehicle_fixed_cost,
        max_route_duration_hours, max_distance_per_route_km, service_duration_minutes,
        routing_engine, ors_api_url, osrm_api_url, vroom_api_url, n8n_webhook_url,
        updated_at
      ) VALUES (
        1,
        ${body.fuel_price_per_liter || 35.0},
        ${body.driver_cost_per_hour || 150.0},
        ${body.vehicle_fixed_cost || 500.0},
        ${body.max_route_duration_hours || 8.0},
        ${body.max_distance_per_route_km || 300.0},
        ${body.service_duration_minutes || 45},
        ${body.routing_engine || 'ors'},
        ${body.ors_api_url || 'https://api.openrouteservice.org'},
        ${body.osrm_api_url || ''},
        ${body.vroom_api_url || ''},
        ${body.n8n_webhook_url || ''},
        NOW()
      )
      ON CONFLICT (id) 
      DO UPDATE SET
        fuel_price_per_liter = EXCLUDED.fuel_price_per_liter,
        driver_cost_per_hour = EXCLUDED.driver_cost_per_hour,
        vehicle_fixed_cost = EXCLUDED.vehicle_fixed_cost,
        max_route_duration_hours = EXCLUDED.max_route_duration_hours,
        max_distance_per_route_km = EXCLUDED.max_distance_per_route_km,
        service_duration_minutes = EXCLUDED.service_duration_minutes,
        routing_engine = EXCLUDED.routing_engine,
        ors_api_url = EXCLUDED.ors_api_url,
        osrm_api_url = EXCLUDED.osrm_api_url,
        vroom_api_url = EXCLUDED.vroom_api_url,
        n8n_webhook_url = EXCLUDED.n8n_webhook_url,
        updated_at = NOW()
      RETURNING *
    `

    console.log("[v0] Settings saved successfully")
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[v0] Settings save error:", error)
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
