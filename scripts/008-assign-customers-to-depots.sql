-- Müşterileri şehirlerine göre en yakın depoya ata

UPDATE customers c
SET assigned_depot_id = (
  SELECT d.id 
  FROM depots d 
  WHERE d.city = c.city
  LIMIT 1
)
WHERE assigned_depot_id IS NULL;

-- Şehir eşleşmezse, coğrafi olarak en yakın depoya ata
UPDATE customers c
SET assigned_depot_id = (
  SELECT d.id 
  FROM depots d 
  ORDER BY 
    SQRT(POW(d.lat - c.lat, 2) + POW(d.lng - c.lng, 2))
  LIMIT 1
)
WHERE assigned_depot_id IS NULL;
