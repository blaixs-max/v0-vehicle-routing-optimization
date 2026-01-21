-- Safe approach: Drop constraint first, clean data, then add new constraint

-- Step 1: Drop the old constraint
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_status_check;

-- Step 2: Update any invalid status values to 'pending'
UPDATE routes 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled');

-- Step 3: Add new constraint with all valid statuses
ALTER TABLE routes 
ADD CONSTRAINT routes_status_check 
CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled'));

-- Verify
SELECT DISTINCT status FROM routes;
