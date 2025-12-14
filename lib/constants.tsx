// Map configuration
export const MAP_CENTER = {
  lat: 39.9334,
  lng: 32.8597,
  zoom: 6,
}

// Tile providers for Leaflet
export const TILE_PROVIDERS = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  cartoDB: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
}

// Depot colors for map visualization
export const DEPOT_COLORS: Record<string, { primary: string; secondary: string; marker: string }> = {
  İstanbul: {
    primary: "#3b82f6",
    secondary: "#93c5fd",
    marker: "#2563eb",
  },
  Ankara: {
    primary: "#ef4444",
    secondary: "#fca5a5",
    marker: "#dc2626",
  },
  İzmir: {
    primary: "#22c55e",
    secondary: "#86efac",
    marker: "#16a34a",
  },
}

// Vehicle types with pallet capacities
export const VEHICLE_TYPES = {
  TIR: { name: "TIR", capacity_pallets: 33, capacity_kg: 24000, fuel_consumption: 35 },
  Kamyon: { name: "Kamyon", capacity_pallets: 15, capacity_kg: 12000, fuel_consumption: 22 },
  Kamyonet: { name: "Kamyonet", capacity_pallets: 6, capacity_kg: 3500, fuel_consumption: 12 },
}

// OSRM Configuration
export const OSRM_CONFIG = {
  // Public OSRM demo server (for development only)
  publicUrl: "https://router.project-osrm.org",
  // Self-hosted OSRM URL (for production)
  selfHostedUrl: process.env.NEXT_PUBLIC_OSRM_URL || "http://localhost:5000",
  // Use self-hosted if available
  baseUrl: process.env.NEXT_PUBLIC_OSRM_URL || "https://router.project-osrm.org",
}

// VROOM Configuration
export const VROOM_CONFIG = {
  // Public VROOM demo server (limited)
  publicUrl: "https://vroom.project-osrm.org",
  // Self-hosted VROOM URL
  selfHostedUrl: process.env.NEXT_PUBLIC_VROOM_URL || "http://localhost:3000",
  // Use self-hosted if available
  baseUrl: process.env.NEXT_PUBLIC_VROOM_URL || "https://vroom.project-osrm.org",
}

// Fuel price (TL per liter)
export const DEFAULT_FUEL_PRICE = 45

// Status colors
export const STATUS_COLORS = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  assigned: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  delivered: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  cancelled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  available: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  on_route: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  maintenance: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
}

// Priority labels
export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: "Acil", color: "bg-red-500" },
  high: { label: "Yüksek", color: "bg-orange-500" },
  normal: { label: "Normal", color: "bg-blue-500" },
  low: { label: "Düşük", color: "bg-gray-500" },
}

// Route colors
export const ROUTE_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
]

// Defaults
export const DEFAULTS = {
  fuelPricePerLiter: 45,
  vehicleCapacityUtilization: 0.9,
  maxRouteDistance: 500, // km
  maxRouteDuration: 480, // minutes (8 hours)
  serviceTimePerStop: 15, // minutes
  averageSpeed: 60, // km/h
}
