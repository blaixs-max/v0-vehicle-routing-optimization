-- =====================================================
-- Script: Check existing depots and create İzmir depot if needed
-- =====================================================

-- Step 1: List all existing depots
SELECT 'Existing Depots:' as info, id, name, city, lat, lng, capacity_pallets
FROM depots
ORDER BY city;

-- Step 2: Insert İzmir depot if it doesn't exist
INSERT INTO depots (name, city, address, lat, lng, capacity_pallets, status)
SELECT 
  'İzmir Merkez Depo',
  'İzmir',
  'Işıkkent Mahallesi, İzmir Organize Sanayi Bölgesi, 35620 Çiğli/İzmir',
  38.4668,
  27.2156,
  1500,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM depots WHERE city = 'İzmir'
);

-- Step 3: Show İzmir depot info
SELECT 'İzmir Depot Created/Found:' as info, id, name, city, lat, lng, capacity_pallets
FROM depots
WHERE city = 'İzmir';
