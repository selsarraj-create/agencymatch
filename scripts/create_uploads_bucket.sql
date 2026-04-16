-- Create 'uploads' storage bucket for Photo Lab raw uploads
-- Run this in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public URLs)
CREATE POLICY "Public read uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Allow authenticated users to upload
CREATE POLICY "Auth users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to update their own files
CREATE POLICY "Auth users can update uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to delete their own files
CREATE POLICY "Auth users can delete uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
