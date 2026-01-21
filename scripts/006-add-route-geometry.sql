-- Add geometry column to routes table to store route polylines
ALTER TABLE routes ADD COLUMN IF NOT EXISTS geometry TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN routes.geometry IS 'Encoded polyline string for route visualization on maps';
