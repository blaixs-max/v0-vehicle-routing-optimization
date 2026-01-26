-- Assign all customers to Izmir depot (using string ID)
-- This script handles the fact that depot IDs are stored as strings like "depot-3"

DO $$
DECLARE
    izmir_depot_id TEXT;
    updated_count INTEGER;
BEGIN
    -- Get the Izmir depot ID (as text)
    SELECT id::TEXT INTO izmir_depot_id
    FROM depots
    WHERE city = 'Izmir'
    LIMIT 1;

    IF izmir_depot_id IS NULL THEN
        RAISE EXCEPTION 'Izmir depot not found! Please create it first.';
    END IF;

    RAISE NOTICE 'Found Izmir depot with ID: %', izmir_depot_id;

    -- Update all customers to be assigned to Izmir depot
    UPDATE customers
    SET assigned_depot_id = izmir_depot_id::UUID,
        updated_at = NOW()
    WHERE assigned_depot_id IS DISTINCT FROM izmir_depot_id::UUID;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Updated % customers to Izmir depot', updated_count;
END $$;

-- Verify the assignments
SELECT 
    d.city as depot_city,
    COUNT(c.id) as customer_count
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
GROUP BY d.city
ORDER BY customer_count DESC;

-- Show sample of Adana customers now assigned to Izmir
SELECT 
    c.name,
    c.city as customer_city,
    d.city as assigned_depot_city,
    d.name as depot_name
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
WHERE c.city = 'Adana'
LIMIT 10;
