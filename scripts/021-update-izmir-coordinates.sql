-- Update Izmir depot coordinates to correct location
-- Enlem: 38.4650333, Boylam: 27.3426415

UPDATE depots 
SET lat = 38.4650333, lng = 27.3426415
WHERE city LIKE '%zmir%' OR name LIKE '%zmir%';
