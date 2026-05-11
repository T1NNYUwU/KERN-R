-- Supabase Schema for video_jobs table

-- Supabase Schema for video_jobs table

-- 1. Create table if it doesn't exist (for new setups)
CREATE TABLE IF NOT EXISTS video_jobs (
    id UUID PRIMARY KEY,
    global_header TEXT NOT NULL,
    items_payload JSONB NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')) NOT NULL,
    progress INT CHECK (progress BETWEEN 0 AND 100) DEFAULT 0,
    final_video_url TEXT
);

-- 2. Add new columns for Dashboard Ready feature (will succeed if columns don't exist, error gracefully if they do)
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS user_id UUID;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_jobs_updated_at
BEFORE UPDATE ON video_jobs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();