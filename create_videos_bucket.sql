-- Create `videos` storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow public read access to videos (required for playback)
CREATE POLICY "Public read access for videos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'videos');

-- Storage Policy: Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload videos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Storage Policy: Allow authenticated users to update their own videos (overwrite)
CREATE POLICY "Authenticated users can update own videos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Storage Policy: Allow authenticated users to delete their own videos
CREATE POLICY "Authenticated users can delete own videos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);
