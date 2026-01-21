-- Add toll cost and highway usage columns to routes table
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS toll_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS toll_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS highway_usage_km DECIMAL(10,2) DEFAULT 0;

-- Add lat/lng columns to route_stops for better performance (avoid join)
ALTER TABLE route_stops
ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_routes_depot_id ON routes(depot_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_route_date ON routes(route_date);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_customer_id ON route_stops(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_depot_id ON customers(depot_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_depot_id ON vehicles(depot_id);

-- Add comments for documentation
COMMENT ON COLUMN routes.toll_cost IS 'Total toll/highway costs for this route in TL';
COMMENT ON COLUMN routes.toll_count IS 'Number of toll crossings on this route';
COMMENT ON COLUMN routes.highway_usage_km IS 'Total highway distance used in km';
COMMENT ON COLUMN route_stops.lat IS 'Stop latitude - denormalized for performance';
COMMENT ON COLUMN route_stops.lng IS 'Stop longitude - denormalized for performance';
