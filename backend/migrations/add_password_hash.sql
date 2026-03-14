-- Add password_hash column to users table for bcrypt authentication
-- Nullable so existing users without passwords can still log in until they set one
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
