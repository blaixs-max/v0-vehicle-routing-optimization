import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"
import { depotSchema } from "@/lib/validations"

export async function GET() {
  try {
    console.log("[v0] Fetching depots from Neon...")
    console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL)

    const depots = await sql`
      SELECT * FROM depots 
      WHERE status = 'active'
      ORDER BY name
    `

    console.log("[v0] Depots fetched successfully:", depots.length)
    return NextResponse.json(depots)
  } catch (error) {
    console.error("[v0] Depots fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch depots",
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
    const validation = depotSchema.safeParse(body)
    if (!validation.success) {
      console.error("[v0] Depot validation failed:", validation.error.errors)
      return NextResponse.json(
        { error: "Invalid depot data", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    const [depot] = await sql`
      INSERT INTO depots (
        id, name, address, city, district, lat, lng, capacity, status
      ) VALUES (
        ${data.id || `depot-${Date.now()}`},
        ${data.name},
        ${data.address},
        ${data.city || ''},
        ${data.district || ''},
        ${data.lat},
        ${data.lng},
        ${data.capacity || null},
        'active'
      )
      RETURNING *
    `

    console.log("[v0] Depot created:", depot.id)
    return NextResponse.json(depot, { status: 201 })
  } catch (error) {
    console.error("[v0] Depot create error:", error)
    return NextResponse.json(
      {
        error: "Failed to create depot",
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
    const validation = depotSchema.safeParse(body)
    if (!validation.success) {
      console.error("[v0] Depot validation failed:", validation.error.errors)
      return NextResponse.json(
        { error: "Invalid depot data", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    if (!data.id) {
      return NextResponse.json({ error: "Depot ID required for update" }, { status: 400 })
    }

    const [depot] = await sql`
      UPDATE depots SET
        name = ${data.name},
        address = ${data.address},
        city = ${data.city || ''},
        district = ${data.district || ''},
        lat = ${data.lat},
        lng = ${data.lng},
        capacity = ${data.capacity || null}
      WHERE id = ${data.id}
      RETURNING *
    `

    if (!depot) {
      return NextResponse.json({ error: "Depot not found" }, { status: 404 })
    }

    console.log("[v0] Depot updated:", depot.id)
    return NextResponse.json(depot)
  } catch (error) {
    console.error("[v0] Depot update error:", error)
    return NextResponse.json(
      {
        error: "Failed to update depot",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
