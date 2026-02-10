-- Add logo_url and modeling_types to agencies table

ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS modeling_types TEXT[] DEFAULT '{}';

-- Check if they exist to be safe
DO $$ 
BEGIN
    -- You can add more logic here if needed, but ADD COLUMN IF NOT EXISTS is usually sufficient
END $$;
