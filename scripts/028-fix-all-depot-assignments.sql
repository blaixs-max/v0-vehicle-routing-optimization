-- Fix depot assignments for all customers
-- This ensures every customer has a valid assigned_depot_id

-- First, let's check current state
SELECT 'Before Update:' as status;
SELECT city, COUNT(*) as customer_count, 
       SUM(CASE WHEN assigned_depot_id IS NULL THEN 1 ELSE 0 END) as null_depot_count
FROM customers
GROUP BY city;

-- Istanbul customers
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'İstanbul' LIMIT 1)
WHERE assigned_depot_id IS NULL 
AND city = 'İstanbul';

-- Ankara customers
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'Ankara' LIMIT 1)
WHERE assigned_depot_id IS NULL 
AND city = 'Ankara';

-- Izmir customers (including Adana region which is served by Izmir depot)
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)
WHERE assigned_depot_id IS NULL 
AND city IN ('İzmir', 'Adana');

-- Verify all customers now have a depot assigned
SELECT 'After Update:' as status;
SELECT 
    c.city,
    d.name as depot_name,
    d.city as depot_city,
    COUNT(*) as customer_count
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
GROUP BY c.city, d.name, d.city
ORDER BY c.city;

-- Check if any customers still have NULL assigned_depot_id
SELECT 'Customers without depot:' as status;
SELECT COUNT(*) as null_depot_count, 
       STRING_AGG(name, ', ') as customer_names
FROM customers 
WHERE assigned_depot_id IS NULL;
