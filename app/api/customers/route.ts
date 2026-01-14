import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"

export async function GET() {
  try {
    console.log("[v0] Fetching customers from Neon...")
    console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL)

    const customers = await sql`
      SELECT c.*, d.name as depot_name
      FROM customers c
      LEFT JOIN depots d ON c.assigned_depot_id = d.id
      ORDER BY c.name
    `

    console.log("[v0] Customers fetched successfully:", customers.length)
    return NextResponse.json(customers)
  } catch (error) {
    console.error("[v0] Customers fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch customers",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
