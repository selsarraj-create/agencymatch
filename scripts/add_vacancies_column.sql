ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS has_vacancies BOOLEAN DEFAULT false;
