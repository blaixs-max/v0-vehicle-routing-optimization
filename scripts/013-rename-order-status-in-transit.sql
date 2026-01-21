-- Update existing in_transit orders to in_progress for consistency
-- This makes order status terminology match route status

UPDATE orders 
SET status = 'in_progress' 
WHERE status = 'in_transit';

-- Update any in_transit in route_stops as well (for consistency)
UPDATE route_stops 
SET status = 'in_progress' 
WHERE status = 'in_transit';
