-- Fix Adana Customers Depot Assignment
-- This script ensures Adana depot exists and assigns all Adana customers to it

-- Step 1: Ensure Adana depot exists
INSERT INTO depots (name, city, address, lat, lng, capacity_pallets, status) 
VALUES ('Adana Lojistik Depo', 'Adana', 'Adana Organize Sanayi Bölgesi, Sarıçam', 37.0000, 35.3213, 1000, 'active')
ON CONFLICT DO NOTHING;

-- Step 2: Get Adana depot ID and update all Adana customers
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'Adana' LIMIT 1)
WHERE city = 'Adana' 
  AND (assigned_depot_id IS NULL OR assigned_depot_id != (SELECT id FROM depots WHERE city = 'Adana' LIMIT 1));

-- Step 3: Verify the assignments
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
ORDER BY c.name;

-- Step 4: Show depot summary
SELECT 
  d.name as depot_name,
  d.city as depot_city,
  COUNT(c.id) as customer_count,
  SUM(CASE WHEN c.assigned_depot_id IS NULL THEN 1 ELSE 0 END) as unassigned_count
FROM depots d
LEFT JOIN customers c ON c.assigned_depot_id = d.id
GROUP BY d.id, d.name, d.city
ORDER BY d.city;
