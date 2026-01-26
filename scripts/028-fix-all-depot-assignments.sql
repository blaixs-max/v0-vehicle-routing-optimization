-- Fix depot assignments for all customers
-- This ensures every customer has a valid depot_id

-- First, let's see current depot IDs
-- Istanbul: depot-1
-- Ankara: depot-2  
-- Izmir: depot-3

-- Update customers with NULL depot_id based on their city/location

-- Istanbul customers
UPDATE customers 
SET depot_id = 'depot-1'
WHERE depot_id IS NULL 
AND (address LIKE '%Istanbul%' OR address LIKE '%İstanbul%');

-- Ankara customers
UPDATE customers 
SET depot_id = 'depot-2'
WHERE depot_id IS NULL 
AND address LIKE '%Ankara%';

-- Izmir customers (including Adana region which is served by Izmir depot)
UPDATE customers 
SET depot_id = 'depot-3'
WHERE depot_id IS NULL 
AND (address LIKE '%İzmir%' OR address LIKE '%Izmir%' OR address LIKE '%Adana%');

-- Verify all customers now have a depot assigned
SELECT 
    depot_id,
    COUNT(*) as customer_count,
    STRING_AGG(DISTINCT SUBSTRING(address FROM '([^,]+)$'), ', ') as cities
FROM customers 
GROUP BY depot_id
ORDER BY depot_id;

-- Check if any customers still have NULL depot_id
SELECT COUNT(*) as null_depot_count
FROM customers 
WHERE depot_id IS NULL;
