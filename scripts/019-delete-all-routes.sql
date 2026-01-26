-- Delete all routes and route stops from database
-- This will clear all optimization history

-- First delete route stops (foreign key dependency)
DELETE FROM route_stops;

-- Then delete routes
DELETE FROM routes;

-- Reset orders that were linked to routes back to pending
UPDATE orders 
SET route_id = NULL, 
    status = 'pending',
    updated_at = NOW()
WHERE route_id IS NOT NULL;

-- Output result
SELECT 
  (SELECT COUNT(*) FROM routes) as remaining_routes,
  (SELECT COUNT(*) FROM route_stops) as remaining_stops,
  (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders;
