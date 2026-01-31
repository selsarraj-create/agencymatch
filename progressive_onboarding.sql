-- Add new columns for Progressive Onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Female', 'Male', 'Non-Binary')),
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS phone_number text;

-- Ensure is_onboarding_complete defaults to false
ALTER TABLE public.profiles 
ALTER COLUMN is_onboarding_complete SET DEFAULT false;

-- Update Trigger Function to ensure new fields start as NULL
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
    stage_name,    -- Explicitly NULL
    gender,        -- Explicitly NULL
    date_of_birth, -- Explicitly NULL
    phone_number   -- Explicitly NULL
  )
  VALUES (
    new.id,
    v_legal_name,
    v_avatar_url,
    false,
    NULL, NULL, NULL, NULL
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
