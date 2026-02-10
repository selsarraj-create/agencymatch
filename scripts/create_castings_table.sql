-- Create table if not exists (base)
CREATE TABLE IF NOT EXISTS public.castings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns individually to ensure they exist
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS wage TEXT;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.castings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- Enable RLS
ALTER TABLE public.castings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts when re-running
DROP POLICY IF EXISTS "Public can view open castings" ON public.castings;
DROP POLICY IF EXISTS "Admins can do everything on castings" ON public.castings;
DROP POLICY IF EXISTS "Anyone can view castings" ON public.castings;
DROP POLICY IF EXISTS "Auth users can CRUD castings" ON public.castings;

-- Re-create policies
CREATE POLICY "Public can view open castings" 
ON public.castings FOR SELECT 
USING (status = 'open');

CREATE POLICY "Auth users can CRUD castings" 
ON public.castings FOR ALL 
USING (auth.role() = 'authenticated');
