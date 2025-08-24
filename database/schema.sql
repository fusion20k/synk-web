-- Supabase Database Schema for Synk
-- Run this SQL in your Supabase SQL editor to create the required table

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notion integration
    notion_token TEXT,
    notion_db_id TEXT,
    workspace_id TEXT,
    workspace_name TEXT,
    
    -- Google integration
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expiry TIMESTAMPTZ,
    
    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT FALSE,
    last_sync_time TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on workspace_id for upsert operations
CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);

-- Create index on sync_enabled for efficient querying of active users
CREATE INDEX IF NOT EXISTS idx_users_sync_enabled ON users(sync_enabled) WHERE sync_enabled = TRUE;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true);

-- Optional: Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();