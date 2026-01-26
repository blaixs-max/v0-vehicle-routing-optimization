-- =====================================================
-- Script: Assign Adana customers to İzmir depot
-- Purpose: Move 23 Adana customers and their orders to İzmir depot
-- =====================================================

-- Step 1: First check Izmir depot ID
SELECT 'Izmir Depot Info:' as info, id, name, city, lat, lng 
FROM depots 
WHERE city = 'Izmir';

-- Step 2: Check current Adana customers status
SELECT 'Current Adana Customers:' as info, 
       COUNT(*) as total_count,
       COUNT(CASE WHEN assigned_depot_id IS NULL THEN 1 END) as null_depot_count,
       COUNT(CASE WHEN assigned_depot_id IS NOT NULL THEN 1 END) as assigned_count
FROM customers 
WHERE city = 'Adana';

-- Step 3: List all Adana customers
SELECT 'Adana Customer Details:' as info, id, name, city, assigned_depot_id 
FROM customers 
WHERE city = 'Adana'
ORDER BY id;

-- Step 4: Get Izmir depot ID first and update Adana customers
DO $$
DECLARE
  izmir_depot_id VARCHAR;
  updated_count INTEGER;
BEGIN
  -- Get Izmir depot ID (it's 'depot-3')
  SELECT id INTO izmir_depot_id FROM depots WHERE city = 'Izmir' LIMIT 1;
  
  IF izmir_depot_id IS NULL THEN
    RAISE EXCEPTION 'Izmir depot not found!';
  END IF;
  
  -- Update all Adana customers to Izmir depot
  UPDATE customers 
  SET assigned_depot_id = izmir_depot_id
  WHERE city = 'Adana';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Updated % Adana customers to Izmir depot: %', updated_count, izmir_depot_id;
END $$;

-- Step 5: Verify the customer update
SELECT 'After Update - Adana Customers:' as info, 
       COUNT(*) as total_count,
       COUNT(CASE WHEN assigned_depot_id = (SELECT id FROM depots WHERE city = 'Izmir' LIMIT 1) THEN 1 END) as izmir_depot_count,
       COUNT(CASE WHEN assigned_depot_id IS NULL THEN 1 END) as null_depot_count
FROM customers 
WHERE city = 'Adana';

-- Step 6: Show Adana orders with their new depot assignment (via customer)
SELECT 'Adana Orders (via Customer):' as info,
       COUNT(o.id) as total_orders,
       COUNT(CASE WHEN c.assigned_depot_id = (SELECT id FROM depots WHERE city = 'Izmir' LIMIT 1) THEN 1 END) as orders_with_izmir_depot
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.city = 'Adana';

-- Step 7: Summary of all depot assignments
SELECT 'Final Depot Assignment Summary:' as info,
       d.name as depot_name,
       d.city as depot_city,
       COUNT(c.id) as customer_count
FROM depots d
LEFT JOIN customers c ON c.assigned_depot_id = d.id
GROUP BY d.id, d.name, d.city
ORDER BY d.city;

-- Step 8: Show Izmir depot capacity
SELECT 'Izmir Depot Capacity:' as info,
       d.name,
       d.city,
       COUNT(DISTINCT c.id) as total_customers,
       COUNT(DISTINCT v.id) as total_vehicles,
       d.capacity_pallets
FROM depots d
LEFT JOIN customers c ON c.assigned_depot_id = d.id
LEFT JOIN vehicles v ON v.depot_id = d.id
WHERE d.city = 'Izmir'
GROUP BY d.id, d.name, d.city, d.capacity_pallets;
