import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: Request) {
  try {
    console.log("[v0] GET /api/orders called")

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const all = searchParams.get("all") === "true"
    const status = searchParams.get("status") // Filtreleme için: pending, completed, vb.

    if (all) {
      // Optimizasyon için tüm siparişleri getir (sadece pending olanlar)
      const orders = await sql`
        SELECT
          o.id,
          o.customer_id,
          c.name as customer_name,
          c.city,
          c.district,
          o.order_date,
          o.pallets,
          o.status,
          o.delivery_date,
          o.notes,
          o.created_at
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.status = ${status || "pending"}
        ORDER BY o.order_date DESC, o.created_at DESC
      `
      console.log("[v0] All orders fetched:", orders.length)
      return NextResponse.json(orders)
    }

    // Sayfalama ile getir
    const offset = (page - 1) * limit
    let orders
    if (status) {
      orders = await sql`
        SELECT
          o.id,
          o.customer_id,
          c.name as customer_name,
          c.city,
          c.district,
          o.order_date,
          o.pallets,
          o.status,
          o.delivery_date,
          o.notes,
          o.created_at
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.status = ${status}
        ORDER BY o.order_date DESC, o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      orders = await sql`
        SELECT
          o.id,
          o.customer_id,
          c.name as customer_name,
          c.city,
          c.district,
          o.order_date,
          o.pallets,
          o.status,
          o.delivery_date,
          o.notes,
          o.created_at
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY o.order_date DESC, o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Toplam sayı
    const countQuery = status
      ? sql`SELECT COUNT(*) as count FROM orders WHERE status = ${status}`
      : sql`SELECT COUNT(*) as count FROM orders`
    const [{ count }] = await countQuery

    console.log("[v0] Orders fetched (paginated):", orders.length, "of", count)

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    })
  } catch (error: any) {
    console.error("[v0] Failed to fetch orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders", details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customer_id, pallets, order_date, notes } = body

    const [order] = await sql`
      INSERT INTO orders (customer_id, pallets, order_date, notes)
      VALUES (${customer_id}, ${pallets}, ${order_date || new Date().toISOString().split("T")[0]}, ${notes || null})
      RETURNING *
    `

    return NextResponse.json(order)
  } catch (error: any) {
    console.error("[v0] Failed to create order:", error)
    return NextResponse.json({ error: "Failed to create order", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    await sql`DELETE FROM orders WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Failed to delete order:", error)
    return NextResponse.json({ error: "Failed to delete order", details: error.message }, { status: 500 })
  }
}
