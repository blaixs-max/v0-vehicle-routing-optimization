/**
 * OpenRouteService (ORS) API Client
 * VRP Optimizasyonu ve Mesafe Matrisi hesaplama
 */

const ORS_API_URL = "https://api.openrouteservice.org"

export interface ORSJob {
  id: number
  location: [number, number] // [lng, lat]
  service?: number // saniye cinsinden servis suresi
  amount?: number[] // talep miktari
  skills?: number[]
  time_windows?: [number, number][]
}

export interface ORSVehicle {
  id: number
  profile: "driving-car" | "driving-hgv"
  start: [number, number] // [lng, lat]
  end?: [number, number]
  capacity?: number[]
  skills?: number[]
  time_window?: [number, number]
}

export interface ORSOptimizationRequest {
  jobs: ORSJob[]
  vehicles: ORSVehicle[]
  geometry?: boolean // geometry parametre olarak eklendi
}

export interface ORSStep {
  type: "start" | "job" | "end"
  location: [number, number]
  id?: number
  arrival: number
  duration: number
  distance: number
  service?: number
  load?: number[]
}

export interface ORSRoute {
  vehicle: number
  steps: ORSStep[]
  cost: number
  distance: number
  duration: number
  service: number
  waiting_time: number
  geometry?: string
}

export interface ORSOptimizationResponse {
  code: number
  summary: {
    cost: number
    routes: number
    unassigned: number
    delivery: number[]
    pickup: number[]
    distance: number
    duration: number
    service: number
    computing_times: {
      loading: number
      solving: number
      routing: number
    }
  }
  routes: ORSRoute[]
  unassigned: { id: number; location: [number, number] }[]
}

export class ORSClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async optimize(request: ORSOptimizationRequest): Promise<ORSOptimizationResponse> {
    const requestBody = {
      jobs: request.jobs,
      vehicles: request.vehicles,
      options: {
        g: true, // geometry flag
      },
    }
    
    console.log(`[v0] ORS API Request: ${request.jobs.length} jobs, ${request.vehicles.length} vehicles`)
    console.log(`[v0] ORS First vehicle:`, JSON.stringify(request.vehicles[0], null, 2))
    console.log(`[v0] ORS First job:`, JSON.stringify(request.jobs[0], null, 2))
    
    const response = await fetch(`${ORS_API_URL}/optimization`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[v0] ORS API Error Response:`, errorText)
      throw new Error(`ORS Optimization API hatasi: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log(`[v0] ORS API Success: ${responseData.routes?.length || 0} routes generated`)
    
    return responseData
  }

  async getMatrix(
    locations: [number, number][],
    profile: "driving-car" | "driving-hgv" = "driving-hgv",
  ): Promise<{ durations: number[][]; distances: number[][] }> {
    const response = await fetch(`${ORS_API_URL}/v2/matrix/${profile}`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations,
        metrics: ["distance", "duration"],
        units: "km",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ORS Matrix API hatasi: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  async getRoute(
    coordinates: [number, number][],
    profile: "driving-car" | "driving-hgv" = "driving-hgv",
  ): Promise<{ distance: number; duration: number; geometry: string }> {
    const response = await fetch(`${ORS_API_URL}/v2/directions/${profile}/geojson`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates,
        instructions: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ORS Directions API hatasi: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const feature = data.features[0]

    return {
      distance: feature.properties.summary.distance / 1000, // metre -> km
      duration: feature.properties.summary.duration / 60, // saniye -> dakika
      geometry: JSON.stringify(feature.geometry),
    }
  }

  async getRouteGeometry(
    waypoints: { lat: number; lng: number }[],
    profile: "driving-car" | "driving-hgv" = "driving-hgv",
  ): Promise<{ lat: number; lng: number }[]> {
    if (waypoints.length < 2) return waypoints

    const coordinates = waypoints.map((p) => [p.lng, p.lat])

    try {
      const response = await fetch(`${ORS_API_URL}/v2/directions/${profile}/geojson`, {
        method: "POST",
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates,
          instructions: false,
        }),
      })

      if (!response.ok) {
        console.log("[v0] ORS Directions API failed, using waypoints")
        return waypoints
      }

      const data = await response.json()
      const coords = data.features?.[0]?.geometry?.coordinates || []

      // GeoJSON coordinates [lng, lat] -> {lat, lng}
      return coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
    } catch (error) {
      console.log("[v0] ORS Directions error:", error)
      return waypoints
    }
  }
}
