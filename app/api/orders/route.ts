import { NextResponse } from "next/server"
import { sql } from "@/lib/neon"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const depotId = searchParams.get("depot_id")
    const status = searchParams.get("status")
    
    console.log("[v0] GET /api/orders called")
    console.log("[v0] Depot filter:", depotId || "all", "Status filter:", status || "all")
    
    let orders
    
    // Handle different filter combinations with tagged template syntax
    if (status && status !== "all") {
      const statuses = status.split(",").map(s => s.trim())
      
      if (depotId) {
        // Both depot and status filters
        orders = await sql`
          SELECT 
            o.id, o.order_number, o.customer_id,
            c.name as customer_name, c.city, c.district,
            c.lat as customer_lat, c.lng as customer_lng,
            o.order_date, o.delivery_date, o.demand_pallet,
            o.status, o.priority, o.notes, o.route_id,
            o.created_at, o.updated_at
          FROM orders o
          LEFT JOIN customers c ON o.customer_id = c.id
          WHERE c.assigned_depot_id = ${depotId}
          AND o.status = ANY(${statuses})
          ORDER BY o.order_date DESC, o.created_at DESC
        `
      } else {
        // Only status filter
        orders = await sql`
          SELECT 
            o.id, o.order_number, o.customer_id,
            c.name as customer_name, c.city, c.district,
            c.lat as customer_lat, c.lng as customer_lng,
            o.order_date, o.delivery_date, o.demand_pallet,
            o.status, o.priority, o.notes, o.route_id,
            o.created_at, o.updated_at
          FROM orders o
          LEFT JOIN customers c ON o.customer_id = c.id
          WHERE o.status = ANY(${statuses})
          ORDER BY o.order_date DESC, o.created_at DESC
        `
      }
    } else if (depotId) {
      // Only depot filter
      orders = await sql`
        SELECT 
          o.id, o.order_number, o.customer_id,
          c.name as customer_name, c.city, c.district,
          c.lat as customer_lat, c.lng as customer_lng,
          o.order_date, o.delivery_date, o.demand_pallet,
          o.status, o.priority, o.notes, o.route_id,
          o.created_at, o.updated_at
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE c.assigned_depot_id = ${depotId}
        ORDER BY o.order_date DESC, o.created_at DESC
      `
    } else {
      // No filters
      orders = await sql`
        SELECT 
          o.id, o.order_number, o.customer_id,
          c.name as customer_name, c.city, c.district,
          c.lat as customer_lat, c.lng as customer_lng,
          o.order_date, o.delivery_date, o.demand_pallet,
          o.status, o.priority, o.notes, o.route_id,
          o.created_at, o.updated_at
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY o.order_date DESC, o.created_at DESC
      `
    }

    console.log("[v0] Orders fetched from DB:", orders.length)

    return NextResponse.json(orders)
  } catch (error: any) {
    console.error("[v0] Failed to fetch orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders", details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customer_id, order_number, order_date, delivery_date, quantity, weight_kg, volume_m3, notes, priority } = body

    if (!customer_id || !order_date) {
      return NextResponse.json({ error: "customer_id and order_date are required" }, { status: 400 })
    }

    const [order] = await sql`
      INSERT INTO orders (
        order_number, customer_id, order_date, delivery_date,
        quantity, weight_kg, volume_m3, notes, priority, status
      ) VALUES (
        ${order_number || `ORD-${Date.now()}`},
        ${customer_id},
        ${order_date},
        ${delivery_date || null},
        ${quantity || 1},
        ${weight_kg || 0},
        ${volume_m3 || 0},
        ${notes || ""},
        ${priority || "normal"},
        'pending'
      )
      RETURNING *
    `

    console.log("[v0] Order created:", order.id)
    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Failed to create order:", error)
    return NextResponse.json({ error: "Failed to create order", details: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, order_number, delivery_date, quantity, weight_kg, volume_m3, notes, priority } = body

    if (!id) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    const [order] = await sql`
      UPDATE orders SET
        order_number = COALESCE(${order_number}, order_number),
        delivery_date = COALESCE(${delivery_date}, delivery_date),
        quantity = COALESCE(${quantity}, quantity),
        weight_kg = COALESCE(${weight_kg}, weight_kg),
        volume_m3 = COALESCE(${volume_m3}, volume_m3),
        notes = COALESCE(${notes}, notes),
        priority = COALESCE(${priority}, priority),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    console.log("[v0] Order updated:", order.id)
    return NextResponse.json(order)
  } catch (error: any) {
    console.error("[v0] Order update error:", error)
    return NextResponse.json({ error: "Failed to update order", details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { ids, status } = body

    if (!status) {
      return NextResponse.json({ error: "Status required" }, { status: 400 })
    }

    const validStatuses = ["pending", "approved", "in_progress", "completed", "cancelled"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    if (Array.isArray(ids)) {
      // Bulk update using ANY() for array matching
      const result = await sql`
        UPDATE orders 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ANY(${ids})
        RETURNING id
      `
      console.log("[v0] Orders status updated (bulk):", result.length, "orders to", status)
      return NextResponse.json({ message: "Orders updated", count: result.length })
    } else {
      // Single update
      const [order] = await sql`
        UPDATE orders 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${ids}
        RETURNING *
      `
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }
      console.log("[v0] Order status updated:", order.id, "to", status)
      return NextResponse.json(order)
    }
  } catch (error: any) {
    console.error("[v0] Order status update error:", error)
    return NextResponse.json({ error: "Failed to update order status", details: error.message }, { status: 500 })
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
