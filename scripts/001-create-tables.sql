-- MDCVRP Database Schema
-- Multi-Depot Capacitated Vehicle Routing Problem

-- Depolar tablosu
CREATE TABLE IF NOT EXISTS depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL,
  address TEXT,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  capacity_pallets INTEGER DEFAULT 1000,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Araçlar tablosu
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  depot_id UUID REFERENCES depots(id) ON DELETE CASCADE,
  plate VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('kamyon', 'tir')),
  capacity_pallets INTEGER NOT NULL, -- Kamyon: 12 palet, TIR: 33 palet
  capacity_kg DECIMAL(10, 2) NOT NULL,
  cost_per_km DECIMAL(10, 2) DEFAULT 2.50,
  fuel_consumption_per_100km DECIMAL(5, 2) NOT NULL, -- Litre
  fixed_daily_cost DECIMAL(10, 2) DEFAULT 500.00,
  avg_speed_kmh INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_route', 'maintenance', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Müşteriler tablosu
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(50) NOT NULL,
  district VARCHAR(50),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  demand_pallets INTEGER NOT NULL DEFAULT 1,
  demand_kg DECIMAL(10, 2) DEFAULT 0,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1: En yüksek
  assigned_depot_id UUID REFERENCES depots(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rotalar tablosu
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  depot_id UUID REFERENCES depots(id) ON DELETE CASCADE,
  route_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_distance_km DECIMAL(10, 2) DEFAULT 0,
  total_duration_min INTEGER DEFAULT 0,
  total_pallets INTEGER DEFAULT 0,
  total_kg DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(12, 2) DEFAULT 0,
  fuel_cost DECIMAL(10, 2) DEFAULT 0,
  distance_cost DECIMAL(10, 2) DEFAULT 0,
  fixed_cost DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  optimized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rota durakları tablosu
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  distance_from_prev_km DECIMAL(10, 2) DEFAULT 0,
  duration_from_prev_min INTEGER DEFAULT 0,
  cumulative_distance_km DECIMAL(10, 2) DEFAULT 0,
  cumulative_load_pallets INTEGER DEFAULT 0,
  arrival_time TIME,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'completed', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimizasyon geçmişi
CREATE TABLE IF NOT EXISTS optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm VARCHAR(50) NOT NULL,
  parameters JSONB,
  total_routes INTEGER DEFAULT 0,
  total_vehicles_used INTEGER DEFAULT 0,
  total_distance_km DECIMAL(12, 2) DEFAULT 0,
  total_cost DECIMAL(14, 2) DEFAULT 0,
  computation_time_ms INTEGER DEFAULT 0,
  improvement_percent DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Yakıt fiyatları tablosu
CREATE TABLE IF NOT EXISTS fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type VARCHAR(20) DEFAULT 'diesel',
  price_per_liter DECIMAL(6, 2) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_depot ON vehicles(depot_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_customers_depot ON customers(assigned_depot_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_depot ON routes(depot_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(route_date);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, stop_order);
