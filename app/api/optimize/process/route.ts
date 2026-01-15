import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    // Mark job as processing
    await sql`
      UPDATE optimization_jobs
      SET status = 'processing', started_at = NOW()
      WHERE id = ${jobId}
    `

    // Get job data
    const jobResult = await sql`
      SELECT request_data FROM optimization_jobs WHERE id = ${jobId}
    `

    if (jobResult.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const requestData = jobResult[0].request_data
    const startTime = Date.now()

    try {
      // Call Railway optimizer
      const optimizeResponse = await fetch(`${process.env.RAILWAY_API_URL}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      })

      if (!optimizeResponse.ok) {
        const errorText = await optimizeResponse.text()
        throw new Error(`Railway error: ${errorText}`)
      }

      const result = await optimizeResponse.json()
      const processingTime = Math.round((Date.now() - startTime) / 1000)

      // Save result
      await sql`
        UPDATE optimization_jobs
        SET status = 'completed',
            result_data = ${JSON.stringify(result)},
            completed_at = NOW(),
            processing_time_seconds = ${processingTime}
        WHERE id = ${jobId}
      `

      return NextResponse.json({ success: true })
    } catch (error: any) {
      const processingTime = Math.round((Date.now() - startTime) / 1000)

      // Save error
      await sql`
        UPDATE optimization_jobs
        SET status = 'failed',
            error_message = ${error.message},
            completed_at = NOW(),
            processing_time_seconds = ${processingTime}
        WHERE id = ${jobId}
      `

      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] Process job failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
