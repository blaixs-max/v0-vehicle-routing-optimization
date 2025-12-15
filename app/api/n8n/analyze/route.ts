import { type NextRequest, NextResponse } from "next/server"

// N8N Integration - Phase 2'de aktif edilecek
// Şu an için deaktif

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "N8N entegrasyonu Phase 2'de aktif edilecek",
      message: "Bu endpoint şu an deaktif. Manuel optimizasyon için /optimize sayfasını kullanın.",
      availableEndpoints: {
        optimize: "/optimize",
        routes: "/routes",
      },
    },
    { status: 501 },
  )
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "inactive",
    message: "N8N entegrasyonu Phase 2'de aktif edilecek",
    plannedFeatures: [
      "Günlük otomatik optimizasyon",
      "AI destekli maliyet analizi",
      "Anomali tespiti",
      "Otomatik bildirimler",
    ],
  })
}
