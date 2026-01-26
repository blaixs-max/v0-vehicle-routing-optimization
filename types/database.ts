export interface Depot {
  id: string
  name: string
  city: string
  address: string | null
  lat: number
  lng: number
  capacity_pallets: number
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  depot_id: string
  plate: string
  vehicle_type: "kamyonet" | "kamyon_1" | "kamyon_2" | "tir" | "romork"
  type?: string // Alias for vehicle_type
  capacity_pallets: number
  capacity_kg: number // Kullanılmayacak ama yapıda tutuluyor
  capacity_m3: number // Kullanılmayacak ama yapıda tutuluyor
  cost_per_km: number // Kapsam dışı ama yapıda tutuluyor
  fuel_consumption_per_100km: number
  fixed_daily_cost: number // Kapsam dışı ama yapıda tutuluyor
  avg_speed_kmh: number
  driver_max_work_hours: number // 9 saat toplam sürüş
  driver_break_duration: number // 45 dakika zorunlu mola
  driver_break_after_hours: number // 4.5 saat sonra mola
  status: "available" | "in_route" | "maintenance" | "inactive"
  created_at: string
  updated_at: string
  // Joined fields
  depot?: Depot
}

export interface Customer {
  id: string
  customer_code: string // Müşteri kodu eklendi (Master data ile eşleşme için)
  name: string
  address: string
  city: string
  district: string | null
  lat: number
  lng: number
  business_type: "MCD" | "IKEA" | "CHL" | "OPT" | "OTHER" | null // Business tipi eklendi
  service_duration_min: number // Business bazlı: MCD=60, IKEA=45, CHL=30, OPT=30, varsayılan=30
  service_duration?: number // Alias for service_duration_min
  time_restrictions: string | null // Örn: "20:00 den önce verilemiyor" veya "08:00-19:00 arası verilemiyor"
  // Time window aliases for VRP compatibility
  time_window_start?: string | null
  time_window_end?: string | null
  allowed_vehicle_types: ("kamyonet" | "kamyon_1" | "kamyon_2" | "tir" | "romork")[] | null
  required_vehicle_types?: string[] | null // Alias for allowed_vehicle_types
  assigned_depot_id: string | null
  status: "pending" | "assigned" | "delivered"
  // Demand fields for VRP compatibility
  demand_kg?: number
  demand_m3?: number
  demand_pallets?: number
  demand_pallet?: number
  created_at: string
  updated_at: string
  // Joined fields
  assigned_depot?: Depot
}

export interface Route {
  id: string
  vehicle_id: string
  depot_id: string
  route_date: string
  total_distance_km: number
  total_duration_min: number
  total_pallets: number
  total_kg: number
  total_cost: number
  fuel_cost: number
  distance_cost: number
  fixed_cost: number
  status: "planned" | "in_progress" | "completed" | "cancelled"
  optimized_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  vehicle?: Vehicle
  depot?: Depot
  stops?: RouteStop[]
}

export interface RouteStop {
  id: string
  route_id: string
  customer_id: string
  stop_order: number
  distance_from_prev_km: number
  duration_from_prev_min: number
  cumulative_distance_km: number
  cumulative_load_pallets: number
  arrival_time: string | null
  status: "pending" | "arrived" | "completed" | "skipped"
  created_at: string
  // Joined fields
  customer?: Customer
}

export interface OptimizationHistory {
  id: string
  algorithm: string
  parameters: Record<string, unknown>
  total_routes: number
  total_vehicles_used: number
  total_distance_km: number
  total_cost: number
  computation_time_ms: number
  improvement_percent: number | null
  created_at: string
}

export interface FuelPrice {
  id: string
  fuel_type: string
  price_per_liter: number
  effective_date: string
  created_at: string
}

// Dashboard stats type
export interface DashboardStats {
  totalDepots: number
  totalVehicles: number
  availableVehicles: number
  totalCustomers: number
  pendingCustomers: number
  totalRoutes: number
  todayRoutes: number
  totalDistance: number
  totalCost: number
}

export interface Order {
  id: string
  order_date: string // YYYY-MM-DD
  customer_code: string // Master customer ile eşleşir
  customer_name: string
  business_type: "MCD" | "IKEA" | "CHL" | "OPT" | "OTHER"
  pallet_count: number // Siparişteki palet sayısı
  order_details: string // Sipariş detayı (opsiyonel)
  status: "pending" | "assigned" | "in_route" | "delivered"
  assigned_route_id: string | null
  created_at: string
  updated_at: string
}
