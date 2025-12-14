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
  vehicle_type: "kamyon" | "tir"
  capacity_pallets: number
  capacity_kg: number
  cost_per_km: number
  fuel_consumption_per_100km: number
  fixed_daily_cost: number
  avg_speed_kmh: number
  status: "available" | "in_route" | "maintenance" | "inactive"
  created_at: string
  updated_at: string
  // Joined fields
  depot?: Depot
}

export interface Customer {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  lat: number
  lng: number
  demand_pallets: number
  demand_kg: number
  priority: 1 | 2 | 3 | 4 | 5
  assigned_depot_id: string | null
  status: "pending" | "assigned" | "delivered"
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
