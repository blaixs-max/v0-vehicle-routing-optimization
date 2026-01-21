-- Add service duration setting for unloading time at each stop

INSERT INTO settings (key, value, category, description, updated_by)
VALUES (
  'service_duration_minutes',
  '45',
  'optimization',
  'Varsayılan boşaltma süresi (dakika). Her müşteri noktasında aracın boşaltma için harcayacağı süre.',
  'system'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
