import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"

export async function GET(request: Request) {
  try {
    console.log("[v0] Fetching customers from Neon...")
    console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const all = searchParams.get("all") === "true"

    if (all) {
      // Optimizasyon için tüm müşterileri getir
      const customers = await sql`
        SELECT c.*, d.name as depot_name
        FROM customers c
        LEFT JOIN depots d ON c.assigned_depot_id = d.id
        ORDER BY c.name
      `
      console.log("[v0] All customers fetched:", customers.length)
      return NextResponse.json(customers)
    }

    // Sayfalama ile getir
    const offset = (page - 1) * limit
    const customers = await sql`
      SELECT c.*, d.name as depot_name
      FROM customers c
      LEFT JOIN depots d ON c.assigned_depot_id = d.id
      ORDER BY c.name
      LIMIT ${limit} OFFSET ${offset}
    `

    // Toplam sayı
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM customers`

    console.log("[v0] Customers fetched (paginated):", customers.length, "of", count)
    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    })
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
