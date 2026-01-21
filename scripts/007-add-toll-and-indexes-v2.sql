-- Schema Improvements: Add toll columns, lat/lng to route_stops, and performance indexes
-- Version 2: Fixed with proper IF NOT EXISTS checks

-- 1. Add toll cost tracking columns to routes table
ALTER TABLE routes 
  ADD COLUMN IF NOT EXISTS toll_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS highway_cost DECIMAL(10,2) DEFAULT 0;

-- 2. Add coordinates to route_stops for better performance (avoid JOIN with customers)
ALTER TABLE route_stops
  ADD COLUMN IF NOT EXISTS lat DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS lng DECIMAL(10,8);

-- 3. Create performance indexes (with IF NOT EXISTS equivalent using DO block)
DO $$
BEGIN
  -- Routes indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'routes' AND indexname = 'idx_routes_depot_id') THEN
    CREATE INDEX idx_routes_depot_id ON routes(depot_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'routes' AND indexname = 'idx_routes_vehicle_id') THEN
    CREATE INDEX idx_routes_vehicle_id ON routes(vehicle_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'routes' AND indexname = 'idx_routes_status') THEN
    CREATE INDEX idx_routes_status ON routes(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'routes' AND indexname = 'idx_routes_date') THEN
    CREATE INDEX idx_routes_date ON routes(route_date DESC);
  END IF;
  
  -- Route stops indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'route_stops' AND indexname = 'idx_route_stops_route_id') THEN
    CREATE INDEX idx_route_stops_route_id ON route_stops(route_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'route_stops' AND indexname = 'idx_route_stops_customer_id') THEN
    CREATE INDEX idx_route_stops_customer_id ON route_stops(customer_id);
  END IF;
  
  -- Customers indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'customers' AND indexname = 'idx_customers_depot_id') THEN
    CREATE INDEX idx_customers_depot_id ON customers(assigned_depot_id);
  END IF;
  
  -- Vehicles indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_depot_id') THEN
    CREATE INDEX idx_vehicles_depot_id ON vehicles(depot_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_status') THEN
    CREATE INDEX idx_vehicles_status ON vehicles(status);
  END IF;
END$$;

-- 4. Add comment for documentation
COMMENT ON COLUMN routes.toll_cost IS 'Total toll/highway crossing costs for this route';
COMMENT ON COLUMN routes.highway_cost IS 'Highway usage costs for this route';
COMMENT ON COLUMN route_stops.lat IS 'Cached latitude for performance (avoid customer JOIN)';
COMMENT ON COLUMN route_stops.lng IS 'Cached longitude for performance (avoid customer JOIN)';
