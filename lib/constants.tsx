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
  kamyonet: {
    name: "Kamyonet",
    capacity_pallets: 10,
    fuel_consumption: 15, // L/100km
    type_code: 1,
  },
  kamyon_1: {
    name: "Kamyon Tip 1",
    capacity_pallets: 14,
    fuel_consumption: 20,
    type_code: 2,
  },
  kamyon_2: {
    name: "Kamyon Tip 2",
    capacity_pallets: 18,
    fuel_consumption: 30,
    type_code: 3,
  },
  tir: {
    name: "TIR",
    capacity_pallets: 32,
    fuel_consumption: 35,
    type_code: 4,
  },
  romork: {
    name: "Kamyon Romork",
    capacity_pallets: 36,
    fuel_consumption: 40,
    type_code: 5,
  },
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
  url: process.env.NEXT_PUBLIC_VROOM_URL || "https://vroom.project-osrm.org",
}

// Fuel price (TL per liter)
export const DEFAULT_FUEL_PRICE = 47.5

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

export const SERVICE_DURATION_BY_BUSINESS = {
  MCD: 60, // McDonald's - 60 dakika
  IKEA: 45, // IKEA - 45 dakika
  CHL: 30, // Chocolabs - 30 dakika
  OPT: 30, // Opet - 30 dakika
  OTHER: 30, // Varsayılan - 30 dakika
}

export const DRIVER_RULES = {
  max_work_hours: 999, // Sınırsız
  break_duration: 0, // Mola yok
  break_after_hours: 999, // Sınırsız
}

// Defaults
export const DEFAULTS = {
  fuelPricePerLiter: 47.5, // 2026 güncel yakıt fiyatı (manuel girilmeli)
  vehicleCapacityUtilization: 0.9,
  maxRouteDistance: 0, // Sınırsız
  maxRouteDuration: 0, // Sınırsız
  serviceTimePerStop: 30, // Varsayılan 30 dk (business'a göre değişir)
  averageSpeed: 50, // km/h
}

export const TURKEY_CITIES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kilis",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Şanlıurfa",
  "Siirt",
  "Sinop",
  "Şırnak",
  "Sivas",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak",
]
