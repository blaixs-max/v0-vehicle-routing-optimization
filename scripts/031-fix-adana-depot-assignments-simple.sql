-- Fix Adana depot assignments
-- This script ensures all Adana customers are assigned to the Adana depot

-- First, verify the Adana depot exists
DO $$
DECLARE
  adana_depot_id UUID;
  adana_depot_count INTEGER;
BEGIN
  -- Check if Adana depot exists
  SELECT COUNT(*) INTO adana_depot_count FROM depots WHERE city = 'Adana';
  
  IF adana_depot_count = 0 THEN
    -- Create Adana depot if it doesn't exist
    INSERT INTO depots (name, city, address, lat, lng, capacity_pallets, status)
    VALUES (
      'Adana Merkez Depo',
      'Adana',
      'Seyhan, Adana',
      37.0000,
      35.3213,
      1000,
      'active'
    );
    RAISE NOTICE 'Created Adana depot';
  END IF;
  
  -- Get the Adana depot ID
  SELECT id INTO adana_depot_id FROM depots WHERE city = 'Adana' LIMIT 1;
  
  -- Update all Adana customers to use the Adana depot
  UPDATE customers
  SET assigned_depot_id = adana_depot_id,
      updated_at = NOW()
  WHERE city = 'Adana' 
    AND (assigned_depot_id IS NULL OR assigned_depot_id != adana_depot_id);
  
  RAISE NOTICE 'Updated Adana customers to depot: %', adana_depot_id;
END $$;

-- Verify the assignments
SELECT 
  city,
  COUNT(*) as customer_count,
  COUNT(assigned_depot_id) as assigned_count,
  COUNT(*) - COUNT(assigned_depot_id) as unassigned_count
FROM customers
GROUP BY city
ORDER BY city;

-- Show depot assignments summary
SELECT 
  d.city as depot_city,
  d.name as depot_name,
  COUNT(c.id) as assigned_customers
FROM depots d
LEFT JOIN customers c ON c.assigned_depot_id = d.id
GROUP BY d.id, d.city, d.name
ORDER BY d.city;
