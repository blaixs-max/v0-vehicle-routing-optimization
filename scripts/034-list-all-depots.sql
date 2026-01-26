-- List all existing depots to verify İzmir depot exists
SELECT 
    id,
    name,
    city,
    address,
    lat,
    lng,
    capacity_pallets,
    created_at
FROM depots
ORDER BY city;
