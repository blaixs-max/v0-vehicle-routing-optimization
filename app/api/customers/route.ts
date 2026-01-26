import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"
import type { NextRequest } from "next/server"
import { customerSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const depotId = searchParams.get("depot_id")
    
    console.log("[v0] Fetching customers from Neon...")
    console.log("[v0] Depot filter:", depotId || "all")
    console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL)

    const customers = depotId
      ? await sql`
          SELECT c.*, d.name as depot_name
          FROM customers c
          LEFT JOIN depots d ON c.assigned_depot_id = d.id
          WHERE c.assigned_depot_id = ${depotId}
          ORDER BY c.name
        `
      : await sql`
          SELECT c.*, d.name as depot_name
          FROM customers c
          LEFT JOIN depots d ON c.assigned_depot_id = d.id
          ORDER BY c.name
        `

    console.log("[v0] Customers fetched successfully:", customers.length)
    return NextResponse.json(customers)
  } catch (error) {
    console.error("[v0] Customers fetch error:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      {
        error: "Failed to fetch customers",
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
    const validation = customerSchema.safeParse(body)
    if (!validation.success) {
      console.error("[v0] Customer validation failed:", validation.error.errors)
      return NextResponse.json(
        { error: "Invalid customer data", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    const [customer] = await sql`
      INSERT INTO customers (
        id, name, address, city, district, lat, lng,
        demand_pallet, assigned_depot_id, service_duration_minutes, required_vehicle_type, status
      ) VALUES (
        ${data.id || `c-${Date.now()}`},
        ${data.name},
        ${data.address},
        ${data.city || ''},
        ${data.district || ''},
        ${data.lat},
        ${data.lng},
        ${data.demand_pallet},
        ${data.assigned_depot_id || null},
        ${data.service_duration_min || data.service_duration_minutes || 45},
        ${data.required_vehicle_type || null},
        'active'
      )
      RETURNING *
    `

    console.log("[v0] Customer created:", customer.id)
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("[v0] Customer create error:", error)
    return NextResponse.json(
      {
        error: "Failed to create customer",
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
    const validation = customerSchema.safeParse(body)
    if (!validation.success) {
      console.error("[v0] Customer validation failed:", validation.error.errors)
      return NextResponse.json(
        { error: "Invalid customer data", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    if (!data.id) {
      return NextResponse.json({ error: "Customer ID required for update" }, { status: 400 })
    }

    const [customer] = await sql`
      UPDATE customers SET
        name = ${data.name},
        address = ${data.address},
        city = ${data.city || ''},
        district = ${data.district || ''},
        lat = ${data.lat},
        lng = ${data.lng},
        demand_pallet = ${data.demand_pallet},
        assigned_depot_id = ${data.assigned_depot_id || null},
        service_duration_minutes = ${data.service_duration_min || data.service_duration_minutes || 45},
        required_vehicle_type = ${data.required_vehicle_type || null}
      WHERE id = ${data.id}
      RETURNING *
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    console.log("[v0] Customer updated:", customer.id)
    return NextResponse.json(customer)
  } catch (error) {
    console.error("[v0] Customer update error:", error)
    return NextResponse.json(
      {
        error: "Failed to update customer",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
