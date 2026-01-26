import { NextResponse } from "next/server"

export async function GET() {
  const railwayUrl = process.env.RAILWAY_API_URL

  if (!railwayUrl) {
    return NextResponse.json({
      success: false,
      error: "RAILWAY_API_URL environment variable eksik",
      help: "Vercel Dashboard > Settings > Environment Variables > RAILWAY_API_URL ekleyin"
    }, { status: 500 })
  }

  try {
    console.log("[v0] Testing Railway connection at:", railwayUrl)
    
    // Test 1: Health check
    const healthResponse = await fetch(`${railwayUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    })

    const healthData = await healthResponse.json()
    
    if (!healthResponse.ok) {
      return NextResponse.json({
        success: false,
        railwayUrl,
        healthCheck: {
          status: healthResponse.status,
          statusText: healthResponse.statusText,
          data: healthData
        },
        error: "Railway health check başarısız"
      }, { status: 500 })
    }

    // Test 2: Root endpoint
    const rootResponse = await fetch(railwayUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    })

    const rootData = await rootResponse.json()

    return NextResponse.json({
      success: true,
      message: "Railway servisi çalışıyor!",
      railwayUrl,
      healthCheck: {
        status: healthResponse.status,
        data: healthData
      },
      rootEndpoint: {
        status: rootResponse.status,
        data: rootData
      }
    })
  } catch (error: any) {
    console.error("[v0] Railway test error:", error)
    
    return NextResponse.json({
      success: false,
      railwayUrl,
      error: error.message || "Railway servisi yanıt vermiyor",
      errorType: error.name,
      help: [
        "1. Railway servisinin çalıştığından emin olun",
        "2. RAILWAY_API_URL doğru mu kontrol edin",
        "3. Railway servisi public mi kontrol edin",
        "4. Railway logs'u kontrol edin"
      ]
    }, { status: 500 })
  }
}
