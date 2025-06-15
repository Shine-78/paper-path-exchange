
-- Add quantity column to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;

-- Set default quantity for existing books
UPDATE public.books 
SET quantity = 1 
WHERE quantity IS NULL;
