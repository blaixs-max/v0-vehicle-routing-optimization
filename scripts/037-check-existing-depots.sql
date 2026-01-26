-- Check what depots currently exist in the database
SELECT id, name, city, address, lat, lng, capacity_pallets, status, created_at
FROM depots
ORDER BY city;
