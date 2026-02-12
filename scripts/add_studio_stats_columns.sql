-- Add measurement columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS waist_cm INTEGER,
ADD COLUMN IF NOT EXISTS hips_cm INTEGER,
ADD COLUMN IF NOT EXISTS bust_cm INTEGER,
ADD COLUMN IF NOT EXISTS shoe_size_uk NUMERIC,
ADD COLUMN IF NOT EXISTS eye_color TEXT,
ADD COLUMN IF NOT EXISTS hair_color TEXT,
ADD COLUMN IF NOT EXISTS height TEXT;

-- Verify columns (optional, just for confirmation)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
