// Turkiye'deki kopru, tunel ve otoyol gecis ucretleri (2024 Aralik guncel)
// Kaynak: HGS/OGS resmi fiyat tarifesi

export interface TollSegment {
  name: string
  type: "bridge" | "tunnel" | "highway_bridge"
  // Gecis noktasi koordinatlari (kopru/tunel giris-cikis)
  checkpoints: { lat: number; lng: number }[]
  // Bounding box - hizli filtreleme icin
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  // Tek yon mu cift yon mu
  bidirectional: boolean
  costs: {
    car: number // 1. sinif (otomobil)
    minibus: number // 2. sinif (minibus, panelvan)
    bus: number // 3. sinif (otobus)
    truck: number // 4. sinif (kamyon)
    tir: number // 5. sinif (tir, dorseili)
  }
}

// =====================================================
// ISTANBUL KOPRU VE TUNELLERI
// =====================================================
export const ISTANBUL_TOLLS: TollSegment[] = [
  // 15 Temmuz Sehitler Koprusu (1. Kopru) - Ortakoy-Beylerbeyi
  // Sadece Avrupa'dan Asya yonune ucretli
  {
    name: "15 Temmuz Sehitler Koprusu",
    type: "bridge",
    bidirectional: false,
    checkpoints: [
      { lat: 41.0456, lng: 29.0283 }, // Avrupa giris (Ortakoy)
      { lat: 41.0431, lng: 29.0388 }, // Kopru ortasi
      { lat: 41.0418, lng: 29.0525 }, // Asya cikis (Beylerbeyi)
    ],
    bbox: { minLat: 41.038, maxLat: 41.05, minLng: 29.02, maxLng: 29.06 },
    costs: { car: 25.5, minibus: 38.25, bus: 76.5, truck: 76.5, tir: 127.5 },
  },
  // Fatih Sultan Mehmet Koprusu (2. Kopru) - Hisarustu-Kavacik
  // Sadece Avrupa'dan Asya yonune ucretli
  {
    name: "Fatih Sultan Mehmet Koprusu",
    type: "bridge",
    bidirectional: false,
    checkpoints: [
      { lat: 41.0872, lng: 29.0498 }, // Avrupa giris (Hisarustu)
      { lat: 41.089, lng: 29.061 }, // Kopru ortasi
      { lat: 41.0875, lng: 29.0735 }, // Asya cikis (Kavacik)
    ],
    bbox: { minLat: 41.082, maxLat: 41.095, minLng: 29.045, maxLng: 29.08 },
    costs: { car: 25.5, minibus: 38.25, bus: 76.5, truck: 76.5, tir: 127.5 },
  },
  // Yavuz Sultan Selim Koprusu (3. Kopru) - Garipce-Poyrazkoy
  // Cift yonlu ucretli
  {
    name: "Yavuz Sultan Selim Koprusu",
    type: "bridge",
    bidirectional: true,
    checkpoints: [
      { lat: 41.2053, lng: 29.1055 }, // Avrupa giris (Garipce)
      { lat: 41.2098, lng: 29.121 }, // Kopru ortasi
      { lat: 41.2072, lng: 29.1385 }, // Asya cikis (Poyrazkoy)
    ],
    bbox: { minLat: 41.195, maxLat: 41.22, minLng: 29.095, maxLng: 29.15 },
    costs: { car: 36.75, minibus: 55.12, bus: 110.25, truck: 110.25, tir: 183.75 },
  },
  // Avrasya Tuneli - Kazlicesme-Goztepe
  // Cift yonlu ucretli
  {
    name: "Avrasya Tuneli",
    type: "tunnel",
    bidirectional: true,
    checkpoints: [
      { lat: 40.9925, lng: 28.9485 }, // Avrupa giris (Kazlicesme)
      { lat: 40.985, lng: 29.002 }, // Tunel ortasi
      { lat: 40.9785, lng: 29.0565 }, // Asya cikis (Goztepe)
    ],
    bbox: { minLat: 40.97, maxLat: 41.0, minLng: 28.94, maxLng: 29.065 },
    costs: { car: 167.0, minibus: 250.5, bus: 501.0, truck: 501.0, tir: 835.0 },
  },
  // Marmaray (Tren - arac gecisi yok ama bilgi icin)
  // Not: Marmaray arac gecisi yoktur, sadece tren
]

// =====================================================
// DIGER BUYUK KOPRULER
// =====================================================
export const OTHER_BRIDGES: TollSegment[] = [
  // Osmangazi Koprusu (Izmit Korfez Gecisi)
  {
    name: "Osmangazi Koprusu",
    type: "bridge",
    bidirectional: true,
    checkpoints: [
      { lat: 40.7632, lng: 29.4585 }, // Kuzey giris (Dilovasi/Gebze)
      { lat: 40.742, lng: 29.495 }, // Kopru ortasi
      { lat: 40.7185, lng: 29.528 }, // Guney cikis (Hersek/Altinova)
    ],
    bbox: { minLat: 40.71, maxLat: 40.77, minLng: 29.45, maxLng: 29.54 },
    costs: { car: 525.0, minibus: 787.5, bus: 1575.0, truck: 1575.0, tir: 2625.0 },
  },
  // Canakkale 1915 Koprusu
  {
    name: "Canakkale 1915 Koprusu",
    type: "bridge",
    bidirectional: true,
    checkpoints: [
      { lat: 40.3585, lng: 26.6125 }, // Avrupa giris (Gelibolu/Sütlüce)
      { lat: 40.318, lng: 26.635 }, // Kopru ortasi
      { lat: 40.278, lng: 26.6685 }, // Asya cikis (Lapseki)
    ],
    bbox: { minLat: 40.27, maxLat: 40.365, minLng: 26.6, maxLng: 26.68 },
    costs: { car: 410.0, minibus: 615.0, bus: 1230.0, truck: 1230.0, tir: 2050.0 },
  },
  // Nissibi Koprusu (Adiyaman-Sanliurfa, Ataturk Baraji)
  {
    name: "Nissibi Koprusu",
    type: "bridge",
    bidirectional: true,
    checkpoints: [
      { lat: 37.6582, lng: 38.589 }, // Adiyaman tarafi
      { lat: 37.651, lng: 38.6185 }, // Sanliurfa tarafi
    ],
    bbox: { minLat: 37.645, maxLat: 37.665, minLng: 38.58, maxLng: 38.625 },
    costs: { car: 35.0, minibus: 52.5, bus: 105.0, truck: 105.0, tir: 175.0 },
  },
]

// =====================================================
// OTOYOL GUZERLAHLARI VE GISELERI
// =====================================================
export interface TollHighway {
  code: string
  name: string
  tollGates: {
    lat: number
    lng: number
    name: string
    km: number // Baslangictan km
  }[]
  costPerKm: {
    car: number
    minibus: number
    bus: number
    truck: number
    tir: number
  }
}

export const TOLL_HIGHWAYS: TollHighway[] = [
  // O-1 TEM (Edirne-Istanbul)
  {
    code: "O-1",
    name: "TEM Otoyolu (Edirne-Istanbul)",
    tollGates: [
      { lat: 41.6892, lng: 26.5558, name: "Edirne", km: 0 },
      { lat: 41.562, lng: 27.2315, name: "Luleburgaz", km: 55 },
      { lat: 41.4058, lng: 27.812, name: "Corlu", km: 105 },
      { lat: 41.2385, lng: 28.6852, name: "Catalca", km: 165 },
      { lat: 41.1055, lng: 28.792, name: "Hadimkoy", km: 185 },
      { lat: 41.0855, lng: 28.8305, name: "Mahmutbey", km: 195 },
    ],
    costPerKm: { car: 1.05, minibus: 1.58, bus: 3.15, truck: 3.15, tir: 5.25 },
  },
  // O-2 TEM (Istanbul-Ankara Kuzey)
  {
    code: "O-2",
    name: "TEM Otoyolu (Istanbul-Ankara)",
    tollGates: [
      { lat: 41.0325, lng: 29.189, name: "Atasehir/Kavacik", km: 0 },
      { lat: 40.9875, lng: 29.3548, name: "Gebze Kuzey", km: 25 },
      { lat: 40.875, lng: 29.6285, name: "Izmit Kuzey", km: 55 },
      { lat: 40.8125, lng: 29.958, name: "Sapanca", km: 85 },
      { lat: 40.7325, lng: 30.452, name: "Bolu Dagi", km: 145 },
      { lat: 40.6585, lng: 31.125, name: "Duzce", km: 195 },
      { lat: 40.528, lng: 32.045, name: "Gerede", km: 265 },
      { lat: 39.9325, lng: 32.8548, name: "Ankara (Akyurt)", km: 380 },
    ],
    costPerKm: { car: 0.95, minibus: 1.42, bus: 2.85, truck: 2.85, tir: 4.75 },
  },
  // O-4 (Istanbul-Ankara Guney / E80)
  {
    code: "O-4",
    name: "Anadolu Otoyolu (Istanbul-Ankara)",
    tollGates: [
      { lat: 40.9125, lng: 29.258, name: "Gebze Guney", km: 0 },
      { lat: 40.7825, lng: 29.892, name: "Izmit Guney", km: 50 },
      { lat: 40.595, lng: 30.3825, name: "Bolu", km: 110 },
      { lat: 40.4525, lng: 31.215, name: "Abant", km: 175 },
      { lat: 40.0825, lng: 32.458, name: "Ankara Bati", km: 310 },
    ],
    costPerKm: { car: 0.95, minibus: 1.42, bus: 2.85, truck: 2.85, tir: 4.75 },
  },
  // O-3 (Istanbul Cevre Yolu - Kuzey)
  {
    code: "O-3",
    name: "Kuzey Marmara Otoyolu",
    tollGates: [
      { lat: 41.2185, lng: 28.589, name: "Kinali", km: 0 },
      { lat: 41.2255, lng: 28.8125, name: "Hasdal", km: 20 },
      { lat: 41.2125, lng: 29.058, name: "Kemerburgaz", km: 45 },
      { lat: 41.1985, lng: 29.285, name: "Omerli", km: 65 },
      { lat: 41.1025, lng: 29.452, name: "Gebze Kuzey", km: 85 },
    ],
    costPerKm: { car: 1.15, minibus: 1.72, bus: 3.45, truck: 3.45, tir: 5.75 },
  },
  // O-5 (Izmir-Cesme)
  {
    code: "O-5",
    name: "Izmir-Cesme Otoyolu",
    tollGates: [
      { lat: 38.4325, lng: 27.135, name: "Izmir (Balcova)", km: 0 },
      { lat: 38.3925, lng: 26.852, name: "Urla", km: 30 },
      { lat: 38.3285, lng: 26.3185, name: "Cesme", km: 80 },
    ],
    costPerKm: { car: 1.0, minibus: 1.5, bus: 3.0, truck: 3.0, tir: 5.0 },
  },
  // O-6 (Izmir-Aydin)
  {
    code: "O-6",
    name: "Izmir-Aydin Otoyolu",
    tollGates: [
      { lat: 38.405, lng: 27.1025, name: "Izmir (Buca)", km: 0 },
      { lat: 38.2585, lng: 27.352, name: "Torbali", km: 35 },
      { lat: 38.025, lng: 27.589, name: "Selcuk", km: 75 },
      { lat: 37.8525, lng: 27.845, name: "Aydin", km: 115 },
    ],
    costPerKm: { car: 0.95, minibus: 1.42, bus: 2.85, truck: 2.85, tir: 4.75 },
  },
  // O-7 (Ankara Cevre Yolu)
  {
    code: "O-7",
    name: "Ankara Cevre Otoyolu",
    tollGates: [
      { lat: 39.8925, lng: 32.585, name: "Eskisehir Yolu", km: 0 },
      { lat: 39.985, lng: 32.525, name: "Konya Yolu", km: 15 },
      { lat: 40.0525, lng: 32.685, name: "Samsun Yolu", km: 35 },
      { lat: 40.0125, lng: 32.925, name: "Istanbul Yolu", km: 55 },
    ],
    costPerKm: { car: 0.85, minibus: 1.27, bus: 2.55, truck: 2.55, tir: 4.25 },
  },
  // O-21 (Bursa-Izmir)
  {
    code: "O-21",
    name: "Bursa-Izmir Otoyolu",
    tollGates: [
      { lat: 40.1925, lng: 29.085, name: "Bursa", km: 0 },
      { lat: 39.925, lng: 28.652, name: "Balikesir", km: 75 },
      { lat: 39.4525, lng: 28.215, name: "Akhisar", km: 145 },
      { lat: 38.9125, lng: 27.835, name: "Manisa", km: 195 },
      { lat: 38.4585, lng: 27.2125, name: "Izmir", km: 250 },
    ],
    costPerKm: { car: 1.0, minibus: 1.5, bus: 3.0, truck: 3.0, tir: 5.0 },
  },
  // O-31 (Mersin-Adana)
  {
    code: "O-31",
    name: "Mersin-Adana Otoyolu",
    tollGates: [
      { lat: 36.8125, lng: 34.635, name: "Mersin", km: 0 },
      { lat: 36.865, lng: 34.852, name: "Tarsus", km: 25 },
      { lat: 36.9925, lng: 35.3285, name: "Adana", km: 70 },
    ],
    costPerKm: { car: 0.9, minibus: 1.35, bus: 2.7, truck: 2.7, tir: 4.5 },
  },
  // O-52 (Ankara-Konya)
  {
    code: "O-52",
    name: "Ankara-Konya Otoyolu",
    tollGates: [
      { lat: 39.8525, lng: 32.685, name: "Ankara (Gölbasi)", km: 0 },
      { lat: 39.4125, lng: 32.452, name: "Cihanbeyli", km: 75 },
      { lat: 38.8525, lng: 32.485, name: "Konya Kuzey", km: 165 },
      { lat: 37.8725, lng: 32.4925, name: "Konya", km: 260 },
    ],
    costPerKm: { car: 0.9, minibus: 1.35, bus: 2.7, truck: 2.7, tir: 4.5 },
  },
]

// Tum ucretli gecisleri birlestir
export const TOLL_SEGMENTS: TollSegment[] = [...ISTANBUL_TOLLS, ...OTHER_BRIDGES]

// Arac tipini toll kategorisine donustur
export function getVehicleTollCategory(vehicleType: string): keyof TollSegment["costs"] {
  const type = vehicleType.toLowerCase()
  if (type.includes("tir") || type.includes("tır") || type.includes("dorseili") || type.includes("çekici")) return "tir"
  if (type.includes("kamyon") || type.includes("truck") || type.includes("kamyonet")) return "truck"
  if (type.includes("otobus") || type.includes("otobüs") || type.includes("bus")) return "bus"
  if (type.includes("minibus") || type.includes("minibüs") || type.includes("panelvan") || type.includes("van"))
    return "minibus"
  return "truck" // Varsayilan kamyon
}

// Haversine mesafe hesaplama (km)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Polyline decode (ORS/Google format)
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b: number
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

// Rota noktalarinin bir bounding box icinden gecip gecmedigini kontrol et
function routePassesThroughBbox(
  points: { lat: number; lng: number }[],
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): boolean {
  return points.some(
    (p) => p.lat >= bbox.minLat && p.lat <= bbox.maxLat && p.lng >= bbox.minLng && p.lng <= bbox.maxLng,
  )
}

// Rotanin bir kopru/tuneli gecip gecmedigini kontrol et (iyilestirilmis algoritma)
function checkTollCrossing(points: { lat: number; lng: number }[], segment: TollSegment): boolean {
  // Once hizli bbox kontrolu
  if (!routePassesThroughBbox(points, segment.bbox)) {
    return false
  }

  // Her checkpoint'e yakinlik skoru hesapla
  const checkpointThreshold = 1.5 // km - checkpoint'e maksimum uzaklik
  const checkpointHits: boolean[] = segment.checkpoints.map(() => false)

  for (const point of points) {
    for (let i = 0; i < segment.checkpoints.length; i++) {
      const cp = segment.checkpoints[i]
      const dist = haversineDistance(point.lat, point.lng, cp.lat, cp.lng)
      if (dist < checkpointThreshold) {
        checkpointHits[i] = true
      }
    }
  }

  // En az 2 ardisik checkpoint'e yakin olmaliyiz (giris ve cikis)
  let consecutiveHits = 0
  for (const hit of checkpointHits) {
    if (hit) {
      consecutiveHits++
      if (consecutiveHits >= 2) return true
    } else {
      consecutiveHits = 0
    }
  }

  return false
}

// Otoyol kullanimini tespit et ve mesafe hesapla (iyilestirilmis)
function calculateHighwayUsage(
  points: { lat: number; lng: number }[],
): { highway: TollHighway; entryGate: string; exitGate: string; distanceKm: number }[] {
  const usage: { highway: TollHighway; entryGate: string; exitGate: string; distanceKm: number }[] = []

  for (const highway of TOLL_HIGHWAYS) {
    const passedGates: { gate: (typeof highway.tollGates)[0]; pointIndex: number }[] = []

    // Hangi giselerden gectigimizi bul
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      for (const gate of highway.tollGates) {
        const dist = haversineDistance(point.lat, point.lng, gate.lat, gate.lng)
        if (dist < 8) {
          // 8 km yaricap - gise yakinlik tespiti
          // Ayni giseyi tekrar ekleme
          if (!passedGates.some((g) => g.gate.name === gate.name)) {
            passedGates.push({ gate, pointIndex: i })
          }
        }
      }
    }

    // En az 2 giseden gecmissek otoyol kullanilmis
    if (passedGates.length >= 2) {
      // Point index'e gore sirala (rota sirasina gore)
      passedGates.sort((a, b) => a.pointIndex - b.pointIndex)

      const entryGate = passedGates[0].gate
      const exitGate = passedGates[passedGates.length - 1].gate

      // Giris-cikis arasi mesafe (km bazli, gise km'lerinden)
      const distanceKm = Math.abs(exitGate.km - entryGate.km)

      if (distanceKm > 0) {
        usage.push({
          highway,
          entryGate: entryGate.name,
          exitGate: exitGate.name,
          distanceKm,
        })
      }
    }
  }

  return usage
}

// Ana fonksiyon: Rota geometrisinden ucretli yol maliyetlerini hesapla
export function calculateTollCosts(
  routeGeometry: string | { lat: number; lng: number }[] | null,
  vehicleType: string,
  totalDistanceKm: number,
): {
  tollCost: number
  highwayCost: number
  totalTollCost: number
  crossings: { name: string; type: string; cost: number }[]
  highwayUsage: { highway: string; entry: string; exit: string; distanceKm: number; cost: number }[]
} {
  const category = getVehicleTollCategory(vehicleType)
  const crossings: { name: string; type: string; cost: number }[] = []
  const highwayUsage: { highway: string; entry: string; exit: string; distanceKm: number; cost: number }[] = []

  // Geometri parse et
  let points: { lat: number; lng: number }[] = []

  if (typeof routeGeometry === "string" && routeGeometry.length > 0) {
    try {
      points = decodePolyline(routeGeometry)
    } catch (e) {
      // Polyline decode hatasi - sessizce devam et
    }
  } else if (Array.isArray(routeGeometry)) {
    points = routeGeometry
  }

  // Yeterli nokta yoksa ucretli yol hesaplama yapma
  if (points.length < 2) {
    return {
      tollCost: 0,
      highwayCost: 0,
      totalTollCost: 0,
      crossings: [],
      highwayUsage: [],
    }
  }

  // Kopru ve tunel gecislerini kontrol et
  let tollCost = 0
  for (const segment of TOLL_SEGMENTS) {
    const passesBbox = routePassesThroughBbox(points, segment.bbox)
    if (passesBbox) {
      const crosses = checkTollCrossing(points, segment)
      if (crosses) {
        const cost = segment.costs[category]
        tollCost += cost
        crossings.push({
          name: segment.name,
          type: segment.type === "bridge" ? "Kopru" : segment.type === "tunnel" ? "Tunel" : "Kopru",
          cost,
        })
      }
    }
  }

  // Otoyol kullanimini hesapla
  let highwayCost = 0
  const hwUsage = calculateHighwayUsage(points)

  for (const hw of hwUsage) {
    const cost = hw.distanceKm * hw.highway.costPerKm[category]
    highwayCost += cost
    highwayUsage.push({
      highway: `${hw.highway.code} ${hw.highway.name}`,
      entry: hw.entryGate,
      exit: hw.exitGate,
      distanceKm: Math.round(hw.distanceKm * 10) / 10,
      cost: Math.round(cost * 100) / 100,
    })
  }

  return {
    tollCost: Math.round(tollCost * 100) / 100,
    highwayCost: Math.round(highwayCost * 100) / 100,
    totalTollCost: Math.round((tollCost + highwayCost) * 100) / 100,
    crossings,
    highwayUsage,
  }
}

// Fiyat guncelleme tarihi
export const TOLL_PRICES_UPDATED = "2024-12-15"
