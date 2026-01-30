import { NextResponse } from "next/server"

export async function GET() {
  console.log("[v0] ===== RAILWAY TEST START =====")
  
  const railwayUrl = process.env.RAILWAY_API_URL

  if (!railwayUrl) {
    console.error("[v0] ❌ RAILWAY_API_URL not configured")
    return NextResponse.json({
      success: false,
      error: "RAILWAY_API_URL ortam değişkeni yapılandırılmamış",
      help: "Vercel Dashboard → Settings → Environment Variables → RAILWAY_API_URL ekleyin",
      configured: false,
    }, { status: 500 })
  }

  console.log("[v0] Railway URL:", railwayUrl)

  try {
    console.log("[v0] Testing Railway health endpoint...")
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.error("[v0] ⏱️ Railway health check timeout after 10 seconds")
      controller.abort()
    }, 10000)
    
    const startTime = Date.now()
    const healthResponse = await fetch(`${railwayUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    })
    const responseTime = Date.now() - startTime
    
    clearTimeout(timeoutId)
    
    console.log("[v0] Health check response time:", responseTime, "ms")
    console.log("[v0] Health check status:", healthResponse.status)

    const healthData = await healthResponse.json().catch(() => ({ status: "unknown" }))
    
    if (!healthResponse.ok) {
      console.error("[v0] ❌ Railway health check FAILED")
      console.error("[v0] Status:", healthResponse.status, healthResponse.statusText)
      console.error("[v0] Response:", healthData)
      
      return NextResponse.json({
        success: false,
        url: railwayUrl,
        status: "offline",
        healthCheck: {
          status: healthResponse.status,
          statusText: healthResponse.statusText,
          responseTime,
          data: healthData
        },
        error: `Railway servisi hata döndü: ${healthResponse.status} ${healthResponse.statusText}`,
        help: [
          "1. Railway dashboard'da servisin durumunu kontrol edin",
          "2. Railway logs'da hata mesajlarını kontrol edin",
          "3. RAILWAY_API_URL'nin doğru olduğundan emin olun",
          "4. Geçici olarak VROOM algoritmasını kullanabilirsiniz"
        ]
      }, { status: 500 })
    }

    console.log("[v0] ✅ Railway health check PASSED")
    console.log("[v0] Response data:", healthData)
    console.log("[v0] ===== RAILWAY TEST SUCCESS =====")

    return NextResponse.json({
      success: true,
      status: "online",
      message: "✅ Railway servisi çalışıyor!",
      url: railwayUrl,
      healthCheck: {
        status: healthResponse.status,
        responseTime,
        data: healthData
      }
    })
  } catch (error: any) {
    console.error("[v0] ===== RAILWAY TEST FAILED =====")
    console.error("[v0] Error type:", error.name)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Full error:", error)
    
    let errorMessage = "Railway servisi test edilemedi"
    let errorHelp = []
    
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      errorMessage = "Railway servisi 10 saniye içinde yanıt vermedi (timeout)"
      errorHelp = [
        "1. Railway servisi cold start yaşıyor olabilir - tekrar deneyin",
        "2. Railway servisi çok yavaş veya donmuş olabilir",
        "3. Railway dashboard'da servis durumunu kontrol edin",
        "4. Geçici olarak VROOM algoritmasını kullanın"
      ]
    } else if (error.message?.includes("fetch") || error.code === "ECONNREFUSED") {
      errorMessage = "Railway servisine bağlanılamadı - URL yanlış olabilir veya servis çalışmıyor"
      errorHelp = [
        "1. RAILWAY_API_URL doğru mu kontrol edin: " + railwayUrl,
        "2. Railway servisinin çalıştığından emin olun",
        "3. Railway servisi public mi kontrol edin",
        "4. Railway'de yeni deploy yapıldıysa birkaç dakika bekleyin"
      ]
    } else {
      errorHelp = [
        "1. Railway dashboard'u kontrol edin",
        "2. Railway logs'da hata mesajlarını kontrol edin",
        "3. Geçici olarak VROOM algoritmasını kullanın"
      ]
    }
    
    return NextResponse.json({
      success: false,
      status: "offline",
      url: railwayUrl,
      error: errorMessage,
      errorType: error.name,
      details: error.message,
      help: errorHelp
    }, { status: 500 })
  }
}
