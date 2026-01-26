-- Tüm müşterileri İzmir deposuna ata
-- This script assigns all customers (including Adana) to İzmir depot

DO $$
DECLARE
    izmir_depot_id UUID;
    updated_count INTEGER;
BEGIN
    -- İzmir deposunun ID'sini al
    SELECT id INTO izmir_depot_id
    FROM depots
    WHERE city = 'Izmir'
    LIMIT 1;

    IF izmir_depot_id IS NULL THEN
        RAISE EXCEPTION 'Izmir depot not found! Please create it first.';
    END IF;

    RAISE NOTICE 'İzmir depot ID: %', izmir_depot_id;

    -- Tüm müşterileri İzmir deposuna ata
    UPDATE customers
    SET assigned_depot_id = izmir_depot_id
    WHERE assigned_depot_id IS NULL OR assigned_depot_id != izmir_depot_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % customers to İzmir depot', updated_count;

    -- Verification: Show customer counts by city with depot assignments
    RAISE NOTICE '--- Customer Distribution ---';
    PERFORM city, COUNT(*) as customer_count, assigned_depot_id
    FROM customers
    GROUP BY city, assigned_depot_id
    ORDER BY city;

END $$;

-- Final verification query
SELECT 
    c.city as customer_city,
    COUNT(*) as customer_count,
    d.city as depot_city,
    d.name as depot_name
FROM customers c
LEFT JOIN depots d ON c.assigned_depot_id = d.id
GROUP BY c.city, d.city, d.name
ORDER BY c.city;

-- Show any customers without depot assignment (should be 0)
SELECT 
    COUNT(*) as customers_without_depot,
    city
FROM customers
WHERE assigned_depot_id IS NULL
GROUP BY city;
