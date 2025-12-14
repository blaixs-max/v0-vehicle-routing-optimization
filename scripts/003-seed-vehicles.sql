-- Seed: 50 Araç (Kamyon ve TIR karışık)
-- Kamyon: 12 palet, 8 ton, 18L/100km
-- TIR: 33 palet, 24 ton, 32L/100km

-- İstanbul Deposu Araçları (20 araç)
INSERT INTO vehicles (depot_id, plate, vehicle_type, capacity_pallets, capacity_kg, cost_per_km, fuel_consumption_per_100km, fixed_daily_cost, avg_speed_kmh, status)
SELECT 
  d.id,
  '34 VRP ' || LPAD(n::text, 3, '0'),
  CASE WHEN n <= 12 THEN 'kamyon' ELSE 'tir' END,
  CASE WHEN n <= 12 THEN 12 ELSE 33 END,
  CASE WHEN n <= 12 THEN 8000 ELSE 24000 END,
  CASE WHEN n <= 12 THEN 2.20 ELSE 3.50 END,
  CASE WHEN n <= 12 THEN 18 ELSE 32 END,
  CASE WHEN n <= 12 THEN 450 ELSE 750 END,
  CASE WHEN n <= 12 THEN 65 ELSE 55 END,
  'available'
FROM depots d, generate_series(1, 20) n
WHERE d.city = 'İstanbul'
ON CONFLICT (plate) DO NOTHING;

-- Ankara Deposu Araçları (15 araç)
INSERT INTO vehicles (depot_id, plate, vehicle_type, capacity_pallets, capacity_kg, cost_per_km, fuel_consumption_per_100km, fixed_daily_cost, avg_speed_kmh, status)
SELECT 
  d.id,
  '06 VRP ' || LPAD(n::text, 3, '0'),
  CASE WHEN n <= 9 THEN 'kamyon' ELSE 'tir' END,
  CASE WHEN n <= 9 THEN 12 ELSE 33 END,
  CASE WHEN n <= 9 THEN 8000 ELSE 24000 END,
  CASE WHEN n <= 9 THEN 2.20 ELSE 3.50 END,
  CASE WHEN n <= 9 THEN 18 ELSE 32 END,
  CASE WHEN n <= 9 THEN 450 ELSE 750 END,
  CASE WHEN n <= 9 THEN 65 ELSE 55 END,
  'available'
FROM depots d, generate_series(1, 15) n
WHERE d.city = 'Ankara'
ON CONFLICT (plate) DO NOTHING;

-- İzmir Deposu Araçları (15 araç)
INSERT INTO vehicles (depot_id, plate, vehicle_type, capacity_pallets, capacity_kg, cost_per_km, fuel_consumption_per_100km, fixed_daily_cost, avg_speed_kmh, status)
SELECT 
  d.id,
  '35 VRP ' || LPAD(n::text, 3, '0'),
  CASE WHEN n <= 9 THEN 'kamyon' ELSE 'tir' END,
  CASE WHEN n <= 9 THEN 12 ELSE 33 END,
  CASE WHEN n <= 9 THEN 8000 ELSE 24000 END,
  CASE WHEN n <= 9 THEN 2.20 ELSE 3.50 END,
  CASE WHEN n <= 9 THEN 18 ELSE 32 END,
  CASE WHEN n <= 9 THEN 450 ELSE 750 END,
  CASE WHEN n <= 9 THEN 65 ELSE 55 END,
  'available'
FROM depots d, generate_series(1, 15) n
WHERE d.city = 'İzmir'
ON CONFLICT (plate) DO NOTHING;
