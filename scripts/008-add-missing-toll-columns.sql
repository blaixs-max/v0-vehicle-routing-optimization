-- Add missing toll tracking columns to routes table
-- These columns track toll crossings and highway usage statistics

ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS toll_crossings_count INTEGER DEFAULT 0;

ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS highway_usage_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN routes.toll_crossings_count IS 'Number of toll crossings in the route';
COMMENT ON COLUMN routes.highway_usage_count IS 'Number of highway segments used in the route';
