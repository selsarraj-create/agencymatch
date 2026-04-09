-- ==============================================================================
-- PROFILE SECURITY & REWARD TRIGGER
-- ==============================================================================
-- Purpose: 
-- 1. Automatically grant 5 credits exactly once when a user completes onboarding.
-- 2. Prevent malicious end-users from arbitrarily updating their `credits` or `is_admin` 
--    flags by intercepting their API calls and reverting those columns to their OLD values.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- We use current_setting('request.jwt.claims', true) to determine if this is 
  -- an authenticated API request from an end-user (frontend).
  -- If this is an Admin running via Service Role, this block is bypassed.
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated' THEN
    
    -- RULE 1: Block users from trying to revoke their onboarding completion status
    -- (This prevents them from trying to loop the 5 credit reward)
    IF OLD.is_onboarding_complete = true AND NEW.is_onboarding_complete = false THEN
      NEW.is_onboarding_complete = true;
    END IF;

    -- RULE 2: Protect the `is_admin` column from being hijacked
    NEW.is_admin = OLD.is_admin;

  END IF;

  -- RULE 3: Auto-Reward exactly 5 credits when `is_onboarding_complete` flips from false to true
  -- Note: We run this AFTER the security checks so the system can legitimately update the credits.
  IF NEW.is_onboarding_complete = true AND (OLD.is_onboarding_complete IS NULL OR OLD.is_onboarding_complete = false) THEN
    -- They successfully completed onboarding! Give them 5 credits.
    NEW.credits = COALESCE(OLD.credits, 0) + 5;
    
  -- RULE 4: If they aren't getting the onboarding reward, block any manual frontend credit updates
  ELSIF current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated' THEN
    -- Any other attempt by a frontend user to update credits is silently reverted.
    NEW.credits = OLD.credits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to ensure idempotency
DROP TRIGGER IF EXISTS protect_and_reward_profiles ON public.profiles;

-- Create the trigger so it fires BEFORE every update on the profiles table
CREATE TRIGGER protect_and_reward_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.process_profile_updates();
