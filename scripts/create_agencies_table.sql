-- Run this in your Supabase SQL Editor to prepare the agencies table

CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    website_url TEXT,
    application_url TEXT,
    description TEXT,
    image_url TEXT,
    location TEXT DEFAULT 'UK',
    status TEXT DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read agencies
CREATE POLICY "Public agencies are viewable by everyone" 
ON public.agencies FOR SELECT 
USING (true);

-- Policy: Only service role can insert/update/delete (or authenticated admins if you prefer)
-- For now, service role (our script) bypasses RLS if using service key, but good to be explicit for client side
CREATE POLICY "Service role manages agencies" 
ON public.agencies FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
