-- Assign all customers to Izmir depot
-- This script updates all customers to be assigned to the Izmir depot

DO $$
DECLARE
    izmir_depot_id UUID;
    updated_count INTEGER;
BEGIN
    -- Get Izmir depot ID
    SELECT id INTO izmir_depot_id
    FROM depots
    WHERE city = 'Izmir'
    LIMIT 1;

    IF izmir_depot_id IS NULL THEN
        RAISE EXCEPTION 'Izmir depot not found!';
    END IF;

    RAISE NOTICE 'Found Izmir depot with ID: %', izmir_depot_id;

    -- Update all customers to be assigned to Izmir depot
    UPDATE customers
    SET assigned_depot_id = izmir_depot_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE assigned_depot_id IS NULL OR assigned_depot_id != izmir_depot_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RAISE NOTICE 'Updated % customers to Izmir depot', updated_count;
END $$;

-- Verify the assignments
SELECT 
    c.city as customer_city,
    COUNT(*) as customer_count,
    d.name as depot_name,
    d.city as depot_city
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
GROUP BY c.city, d.name, d.city
ORDER BY c.city;

-- Show any customers without depot assignment
SELECT COUNT(*) as customers_without_depot
FROM customers
WHERE assigned_depot_id IS NULL;
