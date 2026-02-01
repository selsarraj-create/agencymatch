-- Create Castings Table
CREATE TABLE IF NOT EXISTS castings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    brand_logo_url TEXT,
    location TEXT NOT NULL,
    rate TEXT NOT NULL,
    date_range TEXT,
    gender_req TEXT DEFAULT 'all', -- 'female', 'male', 'active'
    height_min INTEGER, -- cm
    height_max INTEGER, -- cm
    apply_method TEXT NOT NULL CHECK (apply_method IN ('email', 'link')),
    apply_contact TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE castings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read castings" 
ON castings FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert castings" 
ON castings FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can update castings" 
ON castings FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Admins can delete castings" 
ON castings FOR DELETE 
USING (auth.role() = 'service_role');
