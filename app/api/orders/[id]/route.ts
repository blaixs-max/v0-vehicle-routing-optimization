import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { priority } = body

    if (!priority || priority < 1 || priority > 5) {
      return NextResponse.json({ error: "Priority must be between 1-5" }, { status: 400 })
    }

    await sql`UPDATE orders SET priority = ${priority}, updated_at = NOW() WHERE id = ${params.id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Order priority update error:", error)
    return NextResponse.json({ error: "Failed to update priority" }, { status: 500 })
  }
}
