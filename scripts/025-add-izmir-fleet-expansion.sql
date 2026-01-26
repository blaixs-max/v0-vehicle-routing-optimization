-- Add 10 new vehicles to İzmir Depot
-- 5x Kamyon Tip 2 (18 pallet capacity)
-- 5x Kamyonet (10 pallet capacity)

-- First, update vehicle_type constraint to include kamyon_2 and kamyonet
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check 
  CHECK (vehicle_type IN ('kamyon', 'kamyon_1', 'kamyon_2', 'tir', 'kamyonet', 'romork'));

-- Get Izmir depot ID
DO $$
DECLARE
  izmir_depot_id TEXT;
BEGIN
  SELECT id INTO izmir_depot_id FROM depots WHERE name = 'Izmir Depo' LIMIT 1;
  
  IF izmir_depot_id IS NULL THEN
    RAISE EXCEPTION 'Izmir Depo not found';
  END IF;

  -- Add 5x Kamyon Tip 2 (18 pallet, 12000kg capacity)
  -- Kamyon Tip 2: Medium trucks with 18 pallet capacity
  -- Cost: 6.00 TL/km, Fuel: 25 L/100km, Speed: 60 km/h
  INSERT INTO vehicles (depot_id, plate, vehicle_type, capacity_pallets, capacity_kg, cost_per_km, fuel_consumption_per_100km, fixed_daily_cost, avg_speed_kmh, status)
  VALUES
    (izmir_depot_id, '35 KMY 501', 'kamyon_2', 18, 12000, 6.00, 25.0, 550, 60, 'available'),
    (izmir_depot_id, '35 KMY 502', 'kamyon_2', 18, 12000, 6.00, 25.0, 550, 60, 'available'),
    (izmir_depot_id, '35 KMY 503', 'kamyon_2', 18, 12000, 6.00, 25.0, 550, 60, 'available'),
    (izmir_depot_id, '35 KMY 504', 'kamyon_2', 18, 12000, 6.00, 25.0, 550, 60, 'available'),
    (izmir_depot_id, '35 KMY 505', 'kamyon_2', 18, 12000, 6.00, 25.0, 550, 60, 'available')
  ON CONFLICT (plate) DO NOTHING;

  -- Add 5x Kamyonet (10 pallet, 6000kg capacity)
  -- Kamyonet: Small vans with 10 pallet capacity
  -- Cost: 2.60 TL/km, Fuel: 15 L/100km, Speed: 70 km/h
  INSERT INTO vehicles (depot_id, plate, vehicle_type, capacity_pallets, capacity_kg, cost_per_km, fuel_consumption_per_100km, fixed_daily_cost, avg_speed_kmh, status)
  VALUES
    (izmir_depot_id, '35 VAN 601', 'kamyonet', 10, 6000, 2.60, 15.0, 350, 70, 'available'),
    (izmir_depot_id, '35 VAN 602', 'kamyonet', 10, 6000, 2.60, 15.0, 350, 70, 'available'),
    (izmir_depot_id, '35 VAN 603', 'kamyonet', 10, 6000, 2.60, 15.0, 350, 70, 'available'),
    (izmir_depot_id, '35 VAN 604', 'kamyonet', 10, 6000, 2.60, 15.0, 350, 70, 'available'),
    (izmir_depot_id, '35 VAN 605', 'kamyonet', 10, 6000, 2.60, 15.0, 350, 70, 'available')
  ON CONFLICT (plate) DO NOTHING;

  RAISE NOTICE 'Successfully added 10 vehicles to İzmir depot: 5 Kamyon Tip 2 + 5 Kamyonet';
END $$;

-- Verify the additions
SELECT 
  vehicle_type,
  COUNT(*) as count,
  SUM(capacity_pallets) as total_capacity
FROM vehicles v
JOIN depots d ON v.depot_id = d.id
WHERE d.name = 'Izmir Depo'
GROUP BY vehicle_type
ORDER BY vehicle_type;
