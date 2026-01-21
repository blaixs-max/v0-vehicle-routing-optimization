import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"
import type { NextRequest } from "next/server"
import { vehicleSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const depotId = searchParams.get("depot_id")
    
    console.log("[v0] Fetching vehicles from Neon...")
    console.log("[v0] Depot filter:", depotId || "all")
    console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL)

    const vehicles = depotId
      ? await sql`
          SELECT v.*, d.name as depot_name, d.city as depot_city
          FROM vehicles v
          LEFT JOIN depots d ON v.depot_id = d.id
          WHERE v.status IN ('available', 'in_route') AND v.depot_id = ${depotId}
          ORDER BY v.plate
        `
      : await sql`
          SELECT v.*, d.name as depot_name, d.city as depot_city
          FROM vehicles v
          LEFT JOIN depots d ON v.depot_id = d.id
          WHERE v.status IN ('available', 'in_route')
          ORDER BY v.plate
        `

    console.log("[v0] Vehicles fetched successfully:", vehicles.length)
    return NextResponse.json(vehicles)
  } catch (error) {
    console.error("[v0] Vehicles fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch vehicles",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = vehicleSchema.safeParse(body)
    if (!validation.success) {
      console.error("[v0] Vehicle validation failed:", validation.error.errors)
      return NextResponse.json(
        { error: "Invalid vehicle data", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    const [vehicle] = await sql`
      INSERT INTO vehicles (
        id, plate, vehicle_type, capacity_pallet, depot_id, status
      ) VALUES (
        ${data.id || `v-${Date.now()}`},
        ${data.plate},
        ${data.vehicle_type},
        ${data.capacity_pallet},
        ${data.depot_id},
        'available'
      )
      RETURNING *
    `

    console.log("[v0] Vehicle created:", vehicle.id)
    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error("[v0] Vehicle create error:", error)
    return NextResponse.json(
      {
        error: "Failed to create vehicle",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = vehicleSchema.safeParse(body)
    if (!validation.success) {
      console.error("[v0] Vehicle validation failed:", validation.error.errors)
      return NextResponse.json(
        { error: "Invalid vehicle data", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    if (!data.id) {
      return NextResponse.json({ error: "Vehicle ID required for update" }, { status: 400 })
    }

    const [vehicle] = await sql`
      UPDATE vehicles SET
        plate = ${data.plate},
        vehicle_type = ${data.vehicle_type},
        capacity_pallet = ${data.capacity_pallet},
        depot_id = ${data.depot_id}
      WHERE id = ${data.id}
      RETURNING *
    `

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    console.log("[v0] Vehicle updated:", vehicle.id)
    return NextResponse.json(vehicle)
  } catch (error) {
    console.error("[v0] Vehicle update error:", error)
    return NextResponse.json(
      {
        error: "Failed to update vehicle",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
