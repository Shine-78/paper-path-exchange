
-- Add delivery_date column to purchase_requests table
ALTER TABLE public.purchase_requests 
ADD COLUMN expected_delivery_date DATE;

-- Add delivery date to delivery_confirmations table for tracking
ALTER TABLE public.delivery_confirmations 
ADD COLUMN expected_delivery_date DATE;
