-- Auto-Refund Safety Check
-- Goal: Automatically refund 1 credit if an application status fails.
-- Table: applications_tracking (Confirmed via schema inspection as the table linking users to castings with status)

BEGIN;

-- 1. Create the Refund Function
CREATE OR REPLACE FUNCTION public.refund_credit_on_failure()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status is 'failed' and previously wasn't 'failed'
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    
    -- Refund 1 credit to the user
    UPDATE public.profiles
    SET credits = credits + 1
    WHERE id = NEW.user_id;

    RAISE NOTICE 'Refunded 1 credit to user % due to application failure', NEW.user_id;
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS auto_refund_trigger ON public.applications_tracking;

CREATE TRIGGER auto_refund_trigger
AFTER UPDATE ON public.applications_tracking
FOR EACH ROW
EXECUTE FUNCTION public.refund_credit_on_failure();

COMMIT;
