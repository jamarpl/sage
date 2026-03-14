-- Add is_anonymous column to event_messages
ALTER TABLE event_messages ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Add is_anonymous column to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
