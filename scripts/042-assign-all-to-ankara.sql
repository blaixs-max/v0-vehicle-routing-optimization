-- Assign all customers to Ankara depot (more central location)
-- This should reduce total distance for Adana customers

-- First, verify Ankara depot exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM depots WHERE city = 'Ankara') THEN
        RAISE EXCEPTION 'Ankara depot not found in database!';
    END IF;
END $$;

-- Get Ankara depot info
SELECT 
    id AS depot_id,
    name AS depot_name,
    city,
    address,
    lat,
    lng
FROM depots 
WHERE city = 'Ankara'
LIMIT 1;

-- Update all customers to Ankara depot
UPDATE customers
SET 
    assigned_depot_id = (SELECT id FROM depots WHERE city = 'Ankara' LIMIT 1),
    updated_at = NOW()
WHERE assigned_depot_id IS NULL OR assigned_depot_id != (SELECT id FROM depots WHERE city = 'Ankara' LIMIT 1);

-- Show update summary
SELECT 
    'Updated ' || COUNT(*) || ' customers to Ankara depot' AS summary
FROM customers
WHERE assigned_depot_id = (SELECT id FROM depots WHERE city = 'Ankara' LIMIT 1);

-- Verification: Show customer distribution by city
SELECT 
    CASE 
        WHEN address LIKE '%İstanbul%' OR address LIKE '%Istanbul%' THEN 'Istanbul'
        WHEN address LIKE '%Ankara%' THEN 'Ankara'
        WHEN address LIKE '%İzmir%' OR address LIKE '%Izmir%' THEN 'Izmir'
        WHEN address LIKE '%Adana%' THEN 'Adana'
        ELSE 'Other'
    END AS customer_city,
    COUNT(*) AS customer_count,
    d.city AS assigned_depot,
    d.name AS depot_name
FROM customers c
JOIN depots d ON c.assigned_depot_id = d.id
GROUP BY customer_city, d.city, d.name
ORDER BY customer_count DESC;

-- Show all customers with their depot assignment
SELECT 
    c.name AS customer_name,
    CASE 
        WHEN c.address LIKE '%İstanbul%' OR c.address LIKE '%Istanbul%' THEN 'Istanbul'
        WHEN c.address LIKE '%Ankara%' THEN 'Ankara'
        WHEN c.address LIKE '%İzmir%' OR c.address LIKE '%Izmir%' THEN 'Izmir'
        WHEN c.address LIKE '%Adana%' THEN 'Adana'
        ELSE 'Other'
    END AS customer_city,
    d.city AS depot_city,
    d.name AS depot_name
FROM customers c
JOIN depots d ON c.assigned_depot_id = d.id
ORDER BY customer_city, c.name;
