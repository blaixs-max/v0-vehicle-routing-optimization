-- Add route_id column to orders table for tracking which route an order is assigned to

ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_id TEXT REFERENCES routes(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_route_id ON orders(route_id);

COMMIT;
