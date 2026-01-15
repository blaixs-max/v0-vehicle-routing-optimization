import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  console.log("[v0] POST /api/optimize/jobs called")
  try {
    const requestData = await request.json()
    console.log(
      "[v0] Request data received, depots:",
      requestData.depots?.length,
      "vehicles:",
      requestData.vehicles?.length,
      "customers:",
      requestData.customers?.length,
    )

    const result = await sql`
      INSERT INTO optimization_jobs (request_data, status)
      VALUES (${JSON.stringify(requestData)}, 'pending')
      RETURNING id, status, created_at
    `

    const job = result[0]
    console.log("[v0] Job created:", job.id)

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      createdAt: job.created_at,
    })
  } catch (error) {
    console.error("[v0] Failed to create job:", error)
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    const result = await sql`
      SELECT id, status, result_data, error_message, 
             created_at, started_at, completed_at, processing_time_seconds
      FROM optimization_jobs
      WHERE id = ${jobId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const job = result[0]

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      result: job.result_data,
      error: job.error_message,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      processingTimeSeconds: job.processing_time_seconds,
    })
  } catch (error) {
    console.error("[v0] Failed to get job status:", error)
    return NextResponse.json({ error: "Failed to get job status" }, { status: 500 })
  }
}
