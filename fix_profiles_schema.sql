-- COMPREHENSIVE FIX FOR PROFILES TABLE
-- Run this to resolve "column does not exist" errors

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add columns individually (safely)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stage_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS model_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_stats jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_onboarding_complete boolean DEFAULT false;

-- Progressive Onboarding Columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Female', 'Male', 'Non-Binary'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply Policies (Drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 5. Update the Trigger Function (The Source of Truth)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_legal_name text;
  v_avatar_url text;
  v_meta jsonb;
BEGIN
  v_meta := new.raw_user_meta_data;
  
  v_legal_name := COALESCE(v_meta->>'full_name', v_meta->>'name', 'New Model');
  v_avatar_url := COALESCE(v_meta->>'avatar_url', v_meta->>'picture', NULL);

  INSERT INTO public.profiles (
    id, 
    legal_name, 
    avatar_url, 
    is_onboarding_complete,
    stage_name, 
    gender, 
    date_of_birth, 
    phone_number
  )
  VALUES (
    new.id,
    v_legal_name,
    v_avatar_url,
    false, -- Always require onboarding
    NULL, NULL, NULL, NULL
  )
  ON CONFLICT (id) DO NOTHING; -- Safety if run on existing user

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure Trigger is Bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
