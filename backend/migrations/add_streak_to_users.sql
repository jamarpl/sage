-- Adds a streak column to cache the current contribution streak.
-- Updated by the application layer on each contribution.
ALTER TABLE users ADD COLUMN IF NOT EXISTS contribution_streak INTEGER DEFAULT 0;
