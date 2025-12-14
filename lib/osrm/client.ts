import { OSRM_CONFIG } from "@/lib/constants"

// OSRM API response tipleri
export interface OSRMRouteResponse {
  code: string
  routes: OSRMRoute[]
  waypoints: OSRMWaypoint[]
}

export interface OSRMRoute {
  distance: number // meters
  duration: number // seconds
  geometry: string // polyline encoded
  legs: OSRMRouteLeg[]
}

export interface OSRMRouteLeg {
  distance: number
  duration: number
  steps: OSRMRouteStep[]
  summary: string
}

export interface OSRMRouteStep {
  distance: number
  duration: number
  geometry: string
  name: string
  mode: string
  maneuver: {
    type: string
    modifier?: string
    location: [number, number]
  }
}

export interface OSRMWaypoint {
  name: string
  location: [number, number] // [lng, lat]
  distance: number
}

export interface OSRMTableResponse {
  code: string
  distances: number[][] // meters
  durations: number[][] // seconds
  sources: OSRMWaypoint[]
  destinations: OSRMWaypoint[]
}

export interface Coordinate {
  lat: number
  lng: number
}

// OSRM Client sinifi
export class OSRMClient {
  private baseUrl: string
  private profile: string

  constructor(baseUrl?: string, profile = "car") {
    this.baseUrl = baseUrl || OSRM_CONFIG.url
    this.profile = profile
  }

  // Koordinatlari OSRM formatina cevir (lng,lat)
  private formatCoordinates(coords: Coordinate[]): string {
    return coords.map((c) => `${c.lng},${c.lat}`).join(";")
  }

  // Iki nokta arasi rota hesapla
  async getRoute(
    origin: Coordinate,
    destination: Coordinate,
    options: {
      alternatives?: boolean
      steps?: boolean
      geometries?: "polyline" | "polyline6" | "geojson"
      overview?: "full" | "simplified" | "false"
    } = {},
  ): Promise<OSRMRouteResponse> {
    const coords = this.formatCoordinates([origin, destination])
    const params = new URLSearchParams({
      alternatives: String(options.alternatives ?? false),
      steps: String(options.steps ?? false),
      geometries: options.geometries ?? "polyline",
      overview: options.overview ?? "full",
    })

    const url = `${this.baseUrl}/route/v1/${this.profile}/${coords}?${params}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`OSRM route error: ${response.status}`)
    }

    return response.json()
  }

  // Coklu nokta rotasi (trip)
  async getTrip(
    waypoints: Coordinate[],
    options: {
      roundtrip?: boolean
      source?: "any" | "first"
      destination?: "any" | "last"
      geometries?: "polyline" | "polyline6" | "geojson"
      overview?: "full" | "simplified" | "false"
    } = {},
  ): Promise<OSRMRouteResponse> {
    const coords = this.formatCoordinates(waypoints)
    const params = new URLSearchParams({
      roundtrip: String(options.roundtrip ?? true),
      source: options.source ?? "first",
      destination: options.destination ?? "last",
      geometries: options.geometries ?? "polyline",
      overview: options.overview ?? "full",
    })

    const url = `${this.baseUrl}/trip/v1/${this.profile}/${coords}?${params}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`OSRM trip error: ${response.status}`)
    }

    return response.json()
  }

  // Mesafe/sure matrisi hesapla (Table API)
  async getTable(
    coordinates: Coordinate[],
    options: {
      sources?: number[]
      destinations?: number[]
      annotations?: ("distance" | "duration")[]
    } = {},
  ): Promise<OSRMTableResponse> {
    const coords = this.formatCoordinates(coordinates)
    const params = new URLSearchParams()

    if (options.sources) {
      params.set("sources", options.sources.join(";"))
    }
    if (options.destinations) {
      params.set("destinations", options.destinations.join(";"))
    }
    params.set("annotations", options.annotations?.join(",") ?? "distance,duration")

    const url = `${this.baseUrl}/table/v1/${this.profile}/${coords}?${params}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`OSRM table error: ${response.status}`)
    }

    return response.json()
  }

  // En yakin yol noktasini bul (Nearest API)
  async getNearest(coordinate: Coordinate, number = 1): Promise<{ code: string; waypoints: OSRMWaypoint[] }> {
    const coords = `${coordinate.lng},${coordinate.lat}`
    const url = `${this.baseUrl}/nearest/v1/${this.profile}/${coords}?number=${number}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`OSRM nearest error: ${response.status}`)
    }

    return response.json()
  }
}

// Singleton instance
let osrmClient: OSRMClient | null = null

export function getOSRMClient(profile?: string): OSRMClient {
  if (!osrmClient || profile) {
    osrmClient = new OSRMClient(undefined, profile)
  }
  return osrmClient
}

// Polyline decode fonksiyonu (OSRM geometry icin)
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const coordinates: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  const factor = Math.pow(10, precision)

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lat / factor, lng / factor])
  }

  return coordinates
}
