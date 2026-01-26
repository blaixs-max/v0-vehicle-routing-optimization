-- Comprehensive fix for all depot assignments
-- This script ensures all customers are properly assigned to their city's depot

-- ============================================
-- STEP 1: Verify all depots exist
-- ============================================
SELECT '=== CHECKING DEPOTS ===' as status;
SELECT id, name, city, status FROM depots ORDER BY city;

-- ============================================
-- STEP 2: Check current customer assignments
-- ============================================
SELECT '=== CUSTOMERS WITHOUT DEPOT ASSIGNMENT ===' as status;
SELECT 
    COUNT(*) as total_unassigned,
    city,
    STRING_AGG(name, ', ' ORDER BY name) as customer_names
FROM customers 
WHERE assigned_depot_id IS NULL
GROUP BY city
ORDER BY city;

-- ============================================
-- STEP 3: Ensure Adana depot exists
-- ============================================
INSERT INTO depots (name, city, address, lat, lng, capacity_pallets, status) VALUES
  ('Adana Lojistik Depo', 'Adana', 'Adana Organize Sanayi Bölgesi, Sarıçam', 37.0000, 35.3213, 1000, 'active')
ON CONFLICT (city) DO NOTHING;

-- ============================================
-- STEP 4: Assign customers to their city depots
-- ============================================

-- Adana customers
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'Adana' LIMIT 1)
WHERE city = 'Adana' 
AND (assigned_depot_id IS NULL OR assigned_depot_id NOT IN (SELECT id FROM depots WHERE city = 'Adana'));

-- Istanbul customers
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'Istanbul' LIMIT 1)
WHERE city = 'Istanbul' 
AND (assigned_depot_id IS NULL OR assigned_depot_id NOT IN (SELECT id FROM depots WHERE city = 'Istanbul'));

-- Ankara customers
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'Ankara' LIMIT 1)
WHERE city = 'Ankara' 
AND (assigned_depot_id IS NULL OR assigned_depot_id NOT IN (SELECT id FROM depots WHERE city = 'Ankara'));

-- İzmir customers
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)
WHERE city = 'İzmir' 
AND (assigned_depot_id IS NULL OR assigned_depot_id NOT IN (SELECT id FROM depots WHERE city = 'İzmir'));

-- Izmir customers (alternative spelling)
UPDATE customers 
SET assigned_depot_id = (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)
WHERE city = 'Izmir' 
AND (assigned_depot_id IS NULL OR assigned_depot_id NOT IN (SELECT id FROM depots WHERE city = 'İzmir'));

-- ============================================
-- STEP 5: Verify all assignments are complete
-- ============================================
SELECT '=== FINAL VERIFICATION ===' as status;

SELECT '--- All Customer Depot Assignments ---' as info;
SELECT 
    c.city as customer_city,
    d.city as depot_city,
    d.name as depot_name,
    COUNT(*) as customer_count
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
GROUP BY c.city, d.city, d.name
ORDER BY c.city;

SELECT '--- Customers Still Without Depot ---' as info;
SELECT 
    COUNT(*) as unassigned_count,
    STRING_AGG(name || ' (' || city || ')', ', ') as unassigned_customers
FROM customers 
WHERE assigned_depot_id IS NULL;

SELECT '--- Depot Summary ---' as info;
SELECT 
    d.id,
    d.name,
    d.city,
    d.status,
    COUNT(c.id) as assigned_customers,
    COALESCE(SUM(c.demand_pallets), 0) as total_demand
FROM depots d
LEFT JOIN customers c ON c.assigned_depot_id = d.id
GROUP BY d.id, d.name, d.city, d.status
ORDER BY d.city;
