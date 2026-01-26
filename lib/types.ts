// Core database types
export interface Depot {
  id: string
  name: string
  city: string
  address: string
  lat: number
  lng: number
  capacity: number
  capacity_pallets?: number
  status: "active" | "inactive"
  created_at?: string
  updated_at?: string
}

export interface Vehicle {
  id: string
  depot_id: string
  plate: string
  vehicle_type: "kamyon" | "tir" | "kamyonet" | "doblo"
  capacity_kg: number
  capacity_pallet: number
  capacity_pallets?: number // Alias for capacity_pallet
  capacity_m3?: number
  cost_per_km: number
  fuel_consumption_per_100km: number
  fuel_consumption?: number // Alias
  fixed_daily_cost: number
  avg_speed_kmh: number
  status: "available" | "in_use" | "maintenance"
  // Driver rules
  driver_max_work_hours?: number
  driver_break_after_hours?: number
  driver_break_duration?: number
  type?: string // Alias for vehicle_type
  created_at?: string
  updated_at?: string
}

export interface Customer {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
  demand_kg: number
  demand_pallet: number
  demand_pallets?: number // Alias
  demand_m3?: number
  priority: number
  assigned_depot_id?: string
  status: "active" | "inactive" | "pending"
  // Time windows
  time_window_start?: string
  time_window_end?: string
  // Service
  service_duration?: number
  service_duration_min?: number
  // Vehicle requirements
  required_vehicle_types?: string[]
  business_type?: string
  created_at?: string
  updated_at?: string
}

export interface Route {
  id: string
  vehicle_id: string
  depot_id: string
  total_distance_km: number
  total_duration_min: number
  total_cost: number
  fixed_cost: number
  distance_cost: number
  fuel_cost: number
  status: "planned" | "in_progress" | "completed"
  optimized_at?: string
  created_at?: string
  // Relations
  vehicle?: Vehicle
  depot?: Depot
  stops?: RouteStop[]
}

export interface RouteStop {
  id: string
  route_id: string
  customer_id: string
  stop_order: number
  distance_from_prev: number
  duration_from_prev: number
  cumulative_load: number
  // Relations
  customer?: Customer
}

export interface OptimizationHistory {
  id: string
  algorithm: string
  depot_id?: string
  parameters: Record<string, unknown>
  total_routes: number
  total_distance_km: number
  total_cost: number
  computation_time_ms: number
  created_at?: string
}

export interface FuelPrice {
  id: string
  fuel_type: string
  price_per_liter: number
  effective_date: string
  created_at?: string
}

export interface VehicleType {
  id: string
  name: string
  capacity_pallets: number
  capacity_kg: number
  fuel_consumption: number
}

export interface Order {
  id: string
  customer_id: string
  customer_name?: string
  customer_address?: string
  customer_city?: string
  demand_kg: number
  demand_pallet: number
  priority: 1 | 2 | 3 | 4 | 5
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled"
  notes?: string
  delivery_date?: string
  assigned_vehicle_id?: string
  assigned_route_id?: string
  created_at?: string
  updated_at?: string
  // Relations
  customer?: Customer
}
