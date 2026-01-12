import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customers, vehicles, depot } = body

    console.log("[v0] OR-Tools optimize çağrıldı")
    console.log("[v0] Müşteri sayısı:", customers.length)
    console.log("[v0] Araç sayısı:", vehicles.length)

    // Python script'e gönderilecek veri
    const inputData = {
      customers: customers.map((c: any, idx: number) => ({
        id: c.id,
        name: c.name,
        lat: c.latitude,
        lng: c.longitude,
        pallets: c.demand_pallets || 0,
        business: c.business,
        special_constraint: c.special_constraint || "HAYIR",
        allowed_vehicle_types: c.required_vehicle_types || null,
      })),
      vehicles: vehicles.map((v: any) => ({
        id: v.id,
        plate: v.plate_number,
        type: v.type,
        capacity_pallets: v.capacity_pallets,
      })),
      depot: {
        lat: depot.latitude,
        lng: depot.longitude,
      },
    }

    // Python script çalıştır
    const result = await runORToolsOptimizer(inputData)

    if (result.error) {
      return NextResponse.json({ error: result.error, algorithm: "OR-Tools" }, { status: 500 })
    }

    // ORS'den geometri al (harita çizimi için)
    const routesWithGeometry = await addGeometryToRoutes(result.routes, customers, depot)

    // Maliyet hesapla
    const routesWithCosts = calculateCosts(routesWithGeometry, vehicles)

    return NextResponse.json({
      routes: routesWithCosts,
      summary: {
        totalRoutes: result.num_routes,
        totalDistance: result.total_distance,
        totalTime: result.total_time,
        algorithm: "OR-Tools",
      },
    })
  } catch (error: any) {
    console.error("[v0] OR-Tools optimize hatası:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function runORToolsOptimizer(inputData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "ortools_optimizer.py")

    const pythonProcess = spawn("python3", [scriptPath])

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("[v0] Python stderr:", stderr)
        reject(new Error(`Python script failed: ${stderr}`))
        return
      }

      try {
        const result = JSON.parse(stdout)
        resolve(result)
      } catch (e) {
        reject(new Error(`JSON parse error: ${stdout}`))
      }
    })

    // Girdiyi stdin'e yaz
    pythonProcess.stdin.write(JSON.stringify(inputData))
    pythonProcess.stdin.end()
  })
}

async function addGeometryToRoutes(routes: any[], customers: any[], depot: any) {
  // ORS API ile gerçek yol geometrisi al
  const ORS_API_KEY = process.env.ORS_API_KEY

  if (!ORS_API_KEY) {
    console.warn("[v0] ORS_API_KEY yok, geometri eklenemiyor")
    return routes
  }

  const routesWithGeometry = await Promise.all(
    routes.map(async (route) => {
      try {
        // Rota koordinatları
        const coordinates = [
          [depot.lng, depot.lat],
          ...route.stops.map((stop: any) => {
            const customer = customers[stop.customer_index]
            return [customer.lng, customer.lat]
          }),
          [depot.lng, depot.lat],
        ]

        // ORS Directions API
        const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-hgv", {
          method: "POST",
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates,
            instructions: false,
            elevation: false,
          }),
        })

        if (!response.ok) {
          throw new Error("ORS API error")
        }

        const data = await response.json()
        const geometry = data.routes[0].geometry

        return {
          ...route,
          geometry,
          real_distance: data.routes[0].summary.distance / 1000, // km
          real_duration: data.routes[0].summary.duration / 60, // dakika
        }
      } catch (error) {
        console.error("[v0] Geometri alınamadı:", error)
        return route
      }
    }),
  )

  return routesWithGeometry
}

function calculateCosts(routes: any[], vehicles: any[]) {
  const fuelPrice = 47.5 // TL/L - Settings'den alınacak

  return routes.map((route) => {
    const vehicle = vehicles.find((v) => v.id === route.vehicle_id)
    if (!vehicle) return route

    const distance = route.real_distance || route.total_distance
    const fuelConsumption = vehicle.fuel_consumption_per_100km
    const fuelCost = (distance / 100) * fuelConsumption * fuelPrice

    return {
      ...route,
      costs: {
        fuel: fuelCost,
        toll: 0, // Toll calculator eklenecek
        total: fuelCost,
      },
    }
  })
}
