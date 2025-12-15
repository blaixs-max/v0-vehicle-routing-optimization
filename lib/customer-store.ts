// Musteri koordinat guncellemelerini localStorage'da tutan store
// ERP'den gelen verilerle birlestirilecek

const STORAGE_KEY = "customer_coordinates"

export interface CustomerCoordinateUpdate {
  id: string
  lat: number
  lng: number
  updatedAt: string
}

export function getCustomerCoordinates(): Record<string, CustomerCoordinateUpdate> {
  if (typeof window === "undefined") return {}
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function saveCustomerCoordinates(updates: { id: string; lat: number; lng: number }[]): void {
  if (typeof window === "undefined") return
  try {
    const existing = getCustomerCoordinates()
    const now = new Date().toISOString()

    for (const update of updates) {
      existing[update.id] = {
        id: update.id,
        lat: update.lat,
        lng: update.lng,
        updatedAt: now,
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

    // Event dispatch for real-time updates
    window.dispatchEvent(new CustomEvent("customer-coordinates-updated"))
  } catch (e) {
    console.error("Failed to save customer coordinates:", e)
  }
}

export function getCustomerCoordinate(customerId: string): { lat: number; lng: number } | null {
  const coords = getCustomerCoordinates()
  const update = coords[customerId]
  if (update && update.lat && update.lng) {
    return { lat: update.lat, lng: update.lng }
  }
  return null
}

export function clearCustomerCoordinates(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}
