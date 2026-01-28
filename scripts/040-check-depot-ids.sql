-- Check depot IDs and their data types
SELECT 
  id,
  pg_typeof(id) as id_type,
  name, 
  city
FROM depots
ORDER BY city;

-- Check customer assigned_depot_id column type
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'customers' 
  AND column_name = 'assigned_depot_id';

-- Check depots id column type  
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'depots' 
  AND column_name = 'id';
