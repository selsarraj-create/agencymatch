-- ENSURE ALL PROFILE COLUMNS EXIST
-- Run this in Supabase SQL Editor to fix "Failed to update profile" errors
-- Every ADD COLUMN uses IF NOT EXISTS, so it's safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Model measurements
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bust_cm NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS waist_cm NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hips_cm NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shoe_size_uk NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eye_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hair_color TEXT;

-- Additional info (agency form fields)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ethnicity TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dress_size TEXT;

-- Onboarding / system flags
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_analysis_complete BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Update RLS to allow users to update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
