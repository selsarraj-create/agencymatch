-- Run this to add the missing columns to your existing agencies table

ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'UK',
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Re-apply policies just in case
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_policies 
        WHERE tablename = 'agencies' AND policyname = 'Public agencies are viewable by everyone'
    ) THEN
        CREATE POLICY "Public agencies are viewable by everyone" ON public.agencies FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_policies 
        WHERE tablename = 'agencies' AND policyname = 'Service role manages agencies'
    ) THEN
        CREATE POLICY "Service role manages agencies" ON public.agencies FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
