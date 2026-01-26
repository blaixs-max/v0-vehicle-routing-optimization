-- Check what depots currently exist in the database
SELECT id, name, city, address, latitude, longitude, created_at
FROM depots
ORDER BY city;
