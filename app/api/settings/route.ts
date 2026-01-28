import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET() {
  try {
    // Fetch all settings from key-value table
    const rows = await sql`
      SELECT key, value, description, category 
      FROM settings
      ORDER BY category, key
    `

    // Convert key-value pairs to object
    const settings: Record<string, any> = {}
    rows.forEach((row) => {
      settings[row.key] = row.value
    })

    // Convert numeric strings to numbers for known numeric fields
    const numericFields = [
      'fuel_price_per_liter',
      'driver_cost_per_hour',
      'vehicle_maintenance_cost',
      'max_route_duration',
      'max_stops_per_route',
      'service_time_per_stop',
      'break_duration',
      'break_after_hours',
    ]
    
    numericFields.forEach((field) => {
      if (settings[field]) {
        settings[field] = parseFloat(settings[field])
      }
    })

    // Add default values for missing settings
    const defaults = {
      fuel_price_per_liter: 35.0,
      driver_cost_per_hour: 150.0,
      vehicle_fixed_cost: 500.0,
      max_route_duration_hours: 8.0,
      max_distance_per_route_km: 300.0,
      service_duration_minutes: 45,
      routing_engine: 'ors',
      ors_api_url: 'https://api.openrouteservice.org',
      osrm_api_url: '',
      n8n_webhook_url: '',
    }

    return NextResponse.json({ ...defaults, ...settings })
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
    const keyMapping: Record<string, { key: string; category: string; description: string }> = {
      fuel_price_per_liter: { key: 'fuel_price_per_liter', category: 'cost', description: 'Yakıt fiyatı (TL/litre)' },
      driver_cost_per_hour: { key: 'driver_cost_per_hour', category: 'cost', description: 'Sürücü maliyeti (TL/saat)' },
      vehicle_fixed_cost: { key: 'vehicle_maintenance_cost', category: 'cost', description: 'Araç bakım maliyeti (TL/km)' },
      max_route_duration_hours: { key: 'max_route_duration', category: 'routing', description: 'Maksimum rota süresi (dakika)' },
      max_distance_per_route_km: { key: 'max_stops_per_route', category: 'routing', description: 'Rota başına maksimum durak' },
      service_duration_minutes: { key: 'service_time_per_stop', category: 'time', description: 'Durak başına servis süresi (dakika)' },
      routing_engine: { key: 'routing_engine', category: 'integration', description: 'Routing engine' },
      ors_api_url: { key: 'ors_api_url', category: 'integration', description: 'ORS API URL' },
      osrm_api_url: { key: 'osrm_url', category: 'integration', description: 'OSRM sunucu URL' },
      n8n_webhook_url: { key: 'n8n_webhook_url', category: 'integration', description: 'N8N webhook URL' },
    }

    // Update each setting individually using key-value structure
    const updates = []
    for (const [frontendKey, value] of Object.entries(body)) {
      const mapping = keyMapping[frontendKey]
      if (mapping && value !== undefined) {
        updates.push(
          sql`
            INSERT INTO settings (key, value, description, category, updated_at)
            VALUES (
              ${mapping.key},
              ${String(value)},
              ${mapping.description},
              ${mapping.category},
              NOW()
            )
            ON CONFLICT (key)
            DO UPDATE SET
              value = EXCLUDED.value,
              updated_at = EXCLUDED.updated_at
          `
        )
      }
    }

    // Execute all updates
    await Promise.all(updates)

    console.log("[v0] Settings saved successfully")
    
    // Return updated settings
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Settings save error:", error)
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
