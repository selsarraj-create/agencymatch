-- Migration: Add match criteria columns to agencies
-- Run these in order in the Supabase SQL Editor

-- 1. Add columns
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS gender_req TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS height_min_cm INT,
  ADD COLUMN IF NOT EXISTS height_max_cm INT,
  ADD COLUMN IF NOT EXISTS age_min INT,
  ADD COLUMN IF NOT EXISTS age_max INT;

-- 2. Seed High Fashion (height + age requirements)
UPDATE agencies SET age_min = 16, age_max = 30, height_min_cm = 170, height_max_cm = 195
WHERE 'High Fashion & Editorial' = ANY(modeling_types) OR 'High Fashion' = ANY(modeling_types);

-- 3. Seed Child & Teen
UPDATE agencies SET age_min = 4, age_max = 17
WHERE 'Child & Teen' = ANY(modeling_types);

-- 4. Default age range for all remaining
UPDATE agencies SET age_min = 16, age_max = 65
WHERE age_min IS NULL;
