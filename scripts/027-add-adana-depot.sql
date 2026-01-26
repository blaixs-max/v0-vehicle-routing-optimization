-- Add Adana Depot

INSERT INTO depots (name, city, address, lat, lng, capacity_pallets, status) VALUES
  ('Adana Lojistik Depo', 'Adana', 'Adana Organize Sanayi Bölgesi, Sarıçam', 37.0000, 35.3213, 1000, 'active')
ON CONFLICT DO NOTHING;

-- Verify depot was created
SELECT 
  id,
  name,
  city,
  lat,
  lng,
  capacity_pallets,
  status
FROM depots 
WHERE city = 'Adana'
ORDER BY created_at DESC;
