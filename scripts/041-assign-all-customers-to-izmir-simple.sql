-- Assign all customers to Izmir depot (depot-3)
-- This ensures all customers, including Adana customers, are assigned to Izmir depot

-- Update all customers to be assigned to Izmir depot
UPDATE customers
SET assigned_depot_id = 'depot-3'
WHERE assigned_depot_id IS NULL OR assigned_depot_id != 'depot-3';

-- Verify the update
SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN assigned_depot_id = 'depot-3' THEN 1 END) as assigned_to_izmir,
    COUNT(CASE WHEN assigned_depot_id IS NULL THEN 1 END) as unassigned
FROM customers;

-- Show customers by depot assignment
SELECT 
    d.name as depot_name,
    d.city as depot_city,
    COUNT(c.id) as customer_count
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
GROUP BY d.name, d.city
ORDER BY d.city;

-- Show sample of Adana customers to verify
SELECT 
    c.id,
    c.name,
    c.city,
    c.assigned_depot_id,
    d.name as depot_name,
    d.city as depot_city
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
WHERE c.city = 'Adana'
LIMIT 5;
