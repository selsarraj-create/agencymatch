-- Create Applications Tracking Table
CREATE TABLE IF NOT EXISTS applications_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    casting_id UUID NOT NULL REFERENCES castings(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'applied',
    UNIQUE(user_id, casting_id)
);

-- Enable RLS
ALTER TABLE applications_tracking ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own applications" 
ON applications_tracking FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications" 
ON applications_tracking FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" 
ON applications_tracking FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications" 
ON applications_tracking FOR DELETE 
USING (auth.uid() = user_id);
