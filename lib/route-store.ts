// Global route store - optimize sonuclarini paylasmak icin
import type { MockRoute } from "@/lib/mock-data"

const STORAGE_KEY = "vrp_optimized_routes"

export type RouteStatus = "pending" | "approved" | "in_progress" | "completed" | "cancelled"

export interface StoredRouteData {
  routes: MockRoute[]
  summary: {
    totalRoutes: number
    totalDistance: number
    totalDuration: number
    totalCost: number
    fuelCost?: number
    distanceCost?: number
    fixedCost?: number
    tollCost?: number
  }
  optimizedAt: string
  provider: string
  timestamp?: number
}

export function saveOptimizedRoutes(routes: MockRoute[], summary: StoredRouteData["summary"], provider: string): void {
  if (typeof window !== "undefined") {
    const data: StoredRouteData = {
      routes,
      summary: {
        ...summary,
        totalRoutes: routes.length,
      },
      optimizedAt: new Date().toISOString(),
      provider,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("routes-updated", { detail: data }))
  }
}

export function getOptimizedRoutes(): StoredRouteData | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as StoredRouteData
  } catch {
    return null
  }
}

export function updateRouteStatus(routeId: string, newStatus: RouteStatus): void {
  if (typeof window === "undefined") return

  const stored = getOptimizedRoutes()
  if (!stored) return

  const updatedRoutes = stored.routes.map((route) => {
    if (route.id === routeId) {
      return { ...route, status: newStatus }
    }
    return route
  })

  const updatedData: StoredRouteData = {
    ...stored,
    routes: updatedRoutes,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
  window.dispatchEvent(new CustomEvent("routes-updated", { detail: updatedData }))
}

export function approveAllRoutes(): void {
  if (typeof window === "undefined") return

  const stored = getOptimizedRoutes()
  if (!stored) return

  const updatedRoutes = stored.routes.map((route) => ({
    ...route,
    status: route.status === "pending" ? "approved" : route.status,
  }))

  const updatedData: StoredRouteData = {
    ...stored,
    routes: updatedRoutes,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
  window.dispatchEvent(new CustomEvent("routes-updated", { detail: updatedData }))
}

export function approveSelectedRoutes(routeIds: string[]): void {
  if (typeof window === "undefined") return

  const stored = getOptimizedRoutes()
  if (!stored) return

  const updatedRoutes = stored.routes.map((route) => {
    if (routeIds.includes(route.id) && route.status === "pending") {
      return { ...route, status: "approved" as RouteStatus }
    }
    return route
  })

  const updatedData: StoredRouteData = {
    ...stored,
    routes: updatedRoutes,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
  window.dispatchEvent(new CustomEvent("routes-updated", { detail: updatedData }))
}

export function clearOptimizedRoutes(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent("routes-updated", { detail: null }))
  }
}

export function hasOptimizedRoutes(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(STORAGE_KEY) !== null
}

export const getOptimizationResult = getOptimizedRoutes
