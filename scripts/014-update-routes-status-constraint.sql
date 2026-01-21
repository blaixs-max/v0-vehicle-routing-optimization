-- Update routes status check constraint to include new statuses

-- Drop old constraint
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE routes ADD CONSTRAINT routes_status_check 
  CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled'));

-- Verify constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'routes_status_check';
