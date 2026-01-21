-- Fix existing routes with invalid status values
-- Step 1: Update any invalid status values to valid ones
UPDATE routes 
SET status = 'pending'
WHERE status NOT IN ('in_progress', 'completed', 'cancelled');

-- Step 2: Drop the old constraint
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_status_check;

-- Step 3: Add new constraint with all valid statuses
ALTER TABLE routes 
ADD CONSTRAINT routes_status_check 
CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled'));

-- Verify the change
SELECT COUNT(*) as total_routes, status, COUNT(*) as count_per_status
FROM routes 
GROUP BY status;
