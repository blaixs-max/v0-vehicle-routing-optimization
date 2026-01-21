-- Add service_duration_minutes column to customers table
-- This allows each customer to have a custom unloading time

-- Add column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS service_duration_minutes INTEGER DEFAULT 45;

-- Add comment
COMMENT ON COLUMN customers.service_duration_minutes IS 'Time required for unloading at this customer location (in minutes). Used during route optimization.';

-- Update existing customers with default value
UPDATE customers 
SET service_duration_minutes = 45 
WHERE service_duration_minutes IS NULL;
