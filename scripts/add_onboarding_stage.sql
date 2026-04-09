-- Add new columns for the guided onboarding flow
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_stage TEXT DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS has_seen_welcome_modal BOOLEAN DEFAULT false;
