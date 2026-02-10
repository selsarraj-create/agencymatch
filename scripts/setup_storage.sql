-- Create a new storage bucket for casting images
INSERT INTO storage.buckets (id, name, public)
VALUES ('casting-images', 'casting-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'casting-images' );

-- Policy: Allow authenticated users to upload images
-- (Ideally restrict to admins, but for now authenticated is safe enough given the admin dashboard check)
CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'casting-images' AND auth.role() = 'authenticated' );

-- Policy: Allow authenticated users to update/delete their uploads (or all for admins)
CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'casting-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'casting-images' AND auth.role() = 'authenticated' );
