-- Add required_vehicle_type column to customers table
-- This allows customers to specify which vehicle types can serve them

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS required_vehicle_type VARCHAR(20) CHECK (
  required_vehicle_type IS NULL OR 
  required_vehicle_type IN ('kamyonet', 'kamyon_1', 'kamyon_2', 'tir', 'romork')
);

-- Add comment
COMMENT ON COLUMN customers.required_vehicle_type IS 'Müşteriye sadece bu araç tipi gidebilir. NULL ise tüm araçlar gidebilir.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_customers_required_vehicle_type ON customers(required_vehicle_type);
