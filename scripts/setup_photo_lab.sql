
-- 1. Create 'uploads' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create policy for public read of uploads
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'uploads' );

-- 3. Create policy for authenticated uploads
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'uploads' );

-- 4. Add generated_photos column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS generated_photos TEXT[] DEFAULT '{}';

-- 5. Create 'generated' bucket for output images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated', 'generated', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Generated"
ON storage.objects FOR SELECT
USING ( bucket_id = 'generated' );

CREATE POLICY "Service Write Generated"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK ( bucket_id = 'generated' );
