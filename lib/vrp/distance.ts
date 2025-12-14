import { OSRM_CONFIG } from "@/lib/constants"
import type { Point, DistanceMatrix } from "./types"

// Haversine formula for straight-line distance
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Calculate Euclidean distance matrix (fast, for initial solution)
export function calculateEuclideanMatrix(points: Point[]): DistanceMatrix {
  const matrix: DistanceMatrix = {}

  for (const from of points) {
    matrix[from.id] = {}
    for (const to of points) {
      if (from.id === to.id) {
        matrix[from.id][to.id] = { distance: 0, duration: 0 }
      } else {
        const distance = haversineDistance(from.lat, from.lng, to.lat, to.lng)
        // Assume average speed of 50 km/h for duration estimate
        const duration = (distance / 50) * 60 // minutes
        matrix[from.id][to.id] = { distance, duration }
      }
    }
  }

  return matrix
}

// Fetch real road distances from OSRM (batched)
export async function fetchOSRMDistances(points: Point[]): Promise<DistanceMatrix> {
  const matrix: DistanceMatrix = {}

  // Initialize matrix
  for (const from of points) {
    matrix[from.id] = {}
    for (const to of points) {
      matrix[from.id][to.id] = { distance: 0, duration: 0 }
    }
  }

  // OSRM table API - max 100 coordinates per request
  const batchSize = 100
  const batches: Point[][] = []

  for (let i = 0; i < points.length; i += batchSize) {
    batches.push(points.slice(i, i + batchSize))
  }

  for (const batch of batches) {
    try {
      const coordinates = batch.map((p) => `${p.lng},${p.lat}`).join(";")
      const url = `${OSRM_CONFIG.url}/table/v1/driving/${coordinates}?annotations=distance,duration`

      const response = await fetch(url)
      const data = await response.json()

      if (data.code === "Ok") {
        for (let i = 0; i < batch.length; i++) {
          for (let j = 0; j < batch.length; j++) {
            const from = batch[i]
            const to = batch[j]
            matrix[from.id][to.id] = {
              distance: data.distances[i][j] / 1000, // meters to km
              duration: data.durations[i][j] / 60, // seconds to minutes
            }
          }
        }
      }
    } catch (error) {
      console.error("OSRM API error:", error)
      // Fallback to Euclidean distances for this batch
      for (const from of batch) {
        for (const to of batch) {
          if (from.id !== to.id) {
            const distance = haversineDistance(from.lat, from.lng, to.lat, to.lng)
            matrix[from.id][to.id] = {
              distance: distance * 1.3, // Road distance multiplier
              duration: (distance / 50) * 60,
            }
          }
        }
      }
    }
  }

  return matrix
}

// Get distance between two points from matrix
export function getDistance(matrix: DistanceMatrix, fromId: string, toId: string): number {
  return matrix[fromId]?.[toId]?.distance || 0
}

export function getDuration(matrix: DistanceMatrix, fromId: string, toId: string): number {
  return matrix[fromId]?.[toId]?.duration || 0
}
