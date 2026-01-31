-- PART 1: PUBLIC PROFILES TABLE
-- Drop if exists (careful in production, but okay for dev iteration)
-- DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name text, -- Sourced from OAuth
  stage_name text, -- Professional Name (set during onboarding)
  model_email text, -- Professional Email (set during onboarding)
  avatar_url text, -- Sourced from OAuth
  is_onboarding_complete boolean DEFAULT false,
  social_stats jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if need be to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- PART 2: AUTO-PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_legal_name text;
  v_avatar_url text;
  v_meta jsonb;
BEGIN
  v_meta := new.raw_user_meta_data;
  
  -- Extract Name
  v_legal_name := COALESCE(v_meta->>'full_name', v_meta->>'name', 'New Model');

  -- Extract Avatar (Prioritize TikTok if available, though standard OAuth usually maps it to avatar_url)
  -- Note: Supabase puts 'avatar_url' in top level metadata usually.
  v_avatar_url := COALESCE(
    v_meta->>'avatar_url',
    v_meta->>'picture',
    NULL
  );

  INSERT INTO public.profiles (id, legal_name, avatar_url, is_onboarding_complete)
  VALUES (
    new.id,
    v_legal_name,
    v_avatar_url,
    false -- Force onboarding
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
