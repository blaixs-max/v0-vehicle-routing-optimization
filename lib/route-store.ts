// Global route store - optimize sonuclarini paylasmak icin
import type { MockRoute } from "@/lib/mock-data"

const STORAGE_KEY = "vrp_optimized_routes"
const MAX_STORAGE_SIZE = 5 * 1024 * 1024 // 5MB limit (localStorage genelde 5-10MB)

// localStorage boyutunu kontrol et
function getStorageSize(): number {
  let total = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length
    }
  }
  return total
}

// Veriyi sıkıştırılmış şekilde kaydet
function safeSetItem(key: string, value: string): boolean {
  try {
    const size = value.length
    const currentSize = getStorageSize()

    // Eğer yeni veri eklendiğinde limit aşılacaksa uyar
    if (currentSize + size > MAX_STORAGE_SIZE) {
      console.warn(
        `[route-store] Storage limit approaching: ${((currentSize + size) / 1024 / 1024).toFixed(2)}MB / ${MAX_STORAGE_SIZE / 1024 / 1024}MB`,
      )
      // Eski veriyi temizle
      localStorage.removeItem(key)
    }

    localStorage.setItem(key, value)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error("[route-store] localStorage quota exceeded!")
      // Son çare: tüm route store'u temizle
      localStorage.removeItem(key)
      return false
    }
    console.error("[route-store] Error saving to localStorage:", error)
    return false
  }
}

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

export function saveOptimizedRoutes(
  routes: MockRoute[],
  summary: StoredRouteData["summary"],
  provider: string,
): boolean {
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

    const jsonString = JSON.stringify(data)
    const success = safeSetItem(STORAGE_KEY, jsonString)

    if (success) {
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("routes-updated", { detail: data }))
      console.log(
        `[route-store] Routes saved successfully (${(jsonString.length / 1024).toFixed(2)}KB)`,
      )
    } else {
      console.error("[route-store] Failed to save routes - storage quota exceeded")
    }

    return success
  }
  return false
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

export function updateRouteStatus(routeId: string, newStatus: RouteStatus): boolean {
  if (typeof window === "undefined") return false

  const stored = getOptimizedRoutes()
  if (!stored) return false

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

  const success = safeSetItem(STORAGE_KEY, JSON.stringify(updatedData))
  if (success) {
    window.dispatchEvent(new CustomEvent("routes-updated", { detail: updatedData }))
  }
  return success
}

export function approveAllRoutes(): boolean {
  if (typeof window === "undefined") return false

  const stored = getOptimizedRoutes()
  if (!stored) return false

  const updatedRoutes = stored.routes.map((route) => ({
    ...route,
    status: route.status === "pending" ? "approved" : route.status,
  }))

  const updatedData: StoredRouteData = {
    ...stored,
    routes: updatedRoutes,
  }

  const success = safeSetItem(STORAGE_KEY, JSON.stringify(updatedData))
  if (success) {
    window.dispatchEvent(new CustomEvent("routes-updated", { detail: updatedData }))
  }
  return success
}

export function approveSelectedRoutes(routeIds: string[]): boolean {
  if (typeof window === "undefined") return false

  const stored = getOptimizedRoutes()
  if (!stored) return false

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

  const success = safeSetItem(STORAGE_KEY, JSON.stringify(updatedData))
  if (success) {
    window.dispatchEvent(new CustomEvent("routes-updated", { detail: updatedData }))
  }
  return success
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
