
-- Drop the existing check constraint
ALTER TABLE purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_transfer_mode_check;

-- Add a new check constraint with the correct allowed values
ALTER TABLE purchase_requests ADD CONSTRAINT purchase_requests_transfer_mode_check 
CHECK (transfer_mode IN ('self-transfer', 'shipping', 'pickup', 'both'));
