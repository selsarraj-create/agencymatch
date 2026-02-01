
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_analysis_complete') THEN 
        ALTER TABLE public.profiles ADD COLUMN is_analysis_complete boolean DEFAULT false; 
    END IF;

    -- Also adding a JSONB column for the full raw analysis data if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'analysis_data') THEN 
        ALTER TABLE public.profiles ADD COLUMN analysis_data jsonb; 
    END IF;
END $$;
