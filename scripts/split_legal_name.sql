-- Add new columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing data
-- Split legal_name by the first space found.
-- If no space, entire string goes to first_name.
UPDATE public.profiles
SET 
  first_name = CASE 
    WHEN position(' ' in legal_name) > 0 THEN split_part(legal_name, ' ', 1)
    ELSE legal_name 
  END,
  last_name = CASE 
    WHEN position(' ' in legal_name) > 0 THEN substring(legal_name from position(' ' in legal_name) + 1)
    ELSE '' 
  END
WHERE first_name IS NULL; -- Only run if not already populated

-- Verify (Optional, just for output)
-- SELECT id, legal_name, first_name, last_name FROM public.profiles LIMIT 10;
