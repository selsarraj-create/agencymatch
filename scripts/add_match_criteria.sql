-- Migration: Add match criteria with gender-specific height
-- Run this in Supabase SQL Editor

-- 1. Add columns (idempotent)
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS height_min_cm_f INT,  -- minimum height for women
  ADD COLUMN IF NOT EXISTS height_min_cm_m INT,  -- minimum height for men
  ADD COLUMN IF NOT EXISTS age_min INT,
  ADD COLUMN IF NOT EXISTS age_max INT;

-- 2. High Fashion & Editorial: gender-specific height + young age
UPDATE agencies SET height_min_cm_f = 173, height_min_cm_m = 183, age_min = 16, age_max = 30
WHERE category = 'High Fashion & Editorial';

-- 3. Child & Teen: age only
UPDATE agencies SET age_min = 4, age_max = 17
WHERE category = 'Child & Teen';

-- 4. Commercial & Lifestyle: wide range, no height
UPDATE agencies SET age_min = 16, age_max = 65
WHERE category = 'Commercial & Lifestyle';

-- 5. TV Extras & Casting: very wide, no height
UPDATE agencies SET age_min = 16, age_max = 75
WHERE category = 'TV Extras & Casting';

-- 6. Promo & Event Staff: adults, no height
UPDATE agencies SET age_min = 18, age_max = 55
WHERE category = 'Promo & Event Staff';

-- 7. All remaining (default)
UPDATE agencies SET age_min = 16, age_max = 65
WHERE age_min IS NULL;
