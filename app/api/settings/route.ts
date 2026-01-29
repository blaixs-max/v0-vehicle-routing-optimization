import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"

export async function GET() {
  try {
    const rows = await sql`SELECT key, value FROM settings`

    // Convert key-value pairs to object
    const settings: Record<string, any> = {}
    rows.forEach((row: any) => {
      settings[row.key] = row.value
    })

    // Return settings with proper structure for frontend
    return NextResponse.json({
      fuel_price_per_liter: parseFloat(settings.fuel_price_per_liter || '35.0'),
      driver_cost_per_hour: parseFloat(settings.driver_cost_per_hour || '150.0'),
      vehicle_maintenance_cost: parseFloat(settings.vehicle_maintenance_cost || '500.0'),
      max_route_duration: parseFloat(settings.max_route_duration || '8.0'),
      max_stops_per_route: parseInt(settings.max_stops_per_route || '300'),
      service_duration_minutes: parseInt(settings.service_duration_minutes || '45'),
      service_time_per_stop: parseInt(settings.service_time_per_stop || '45'),
      routing_engine: settings.routing_engine || 'ors',
      ors_api_url: settings.ors_api_url || 'https://api.openrouteservice.org',
      osrm_url: settings.osrm_url || 'https://router.project-osrm.org',
      vroom_url: settings.vroom_url || '',
      n8n_webhook_url: settings.n8n_webhook_url || '',
      depot_start_time: settings.depot_start_time || '08:00',
      depot_end_time: settings.depot_end_time || '18:00',
      break_duration: parseInt(settings.break_duration || '30'),
      break_after_hours: parseInt(settings.break_after_hours || '4'),
    })
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

    // Map of frontend keys to database keys
    const keyMap: Record<string, string> = {
      fuel_price_per_liter: 'fuel_price_per_liter',
      driver_cost_per_hour: 'driver_cost_per_hour',
      vehicle_maintenance_cost: 'vehicle_maintenance_cost',
      max_route_duration: 'max_route_duration',
      max_stops_per_route: 'max_stops_per_route',
      service_duration_minutes: 'service_duration_minutes',
      service_time_per_stop: 'service_time_per_stop',
      routing_engine: 'routing_engine',
      ors_api_url: 'ors_api_url',
      osrm_url: 'osrm_url',
      vroom_url: 'vroom_url',
      n8n_webhook_url: 'n8n_webhook_url',
      depot_start_time: 'depot_start_time',
      depot_end_time: 'depot_end_time',
      break_duration: 'break_duration',
      break_after_hours: 'break_after_hours',
    }

    // Update each setting individually
    for (const [frontendKey, dbKey] of Object.entries(keyMap)) {
      if (body[frontendKey] !== undefined) {
        const value = String(body[frontendKey])
        await sql`
          INSERT INTO settings (key, value, updated_at)
          VALUES (${dbKey}, ${value}, NOW())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `
      }
    }

    console.log("[v0] Settings saved successfully")
    return NextResponse.json({ success: true, message: "Settings saved successfully" })
  } catch (error) {
    console.error("[v0] Settings save error:", error)
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
