-- Add video_url column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create 'videos' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'videos' bucket

-- 1. Public Read Access
CREATE POLICY "Public Read Access for Videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- 2. Authenticated Upload (Insert) - Users can upload to their own folder: videos/users/{user_id}/*
CREATE POLICY "Authenticated Users Upload Videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. Authenticated Update (Replace)
CREATE POLICY "Authenticated Users Update Videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. Authenticated Delete
CREATE POLICY "Authenticated Users Delete Videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
);
