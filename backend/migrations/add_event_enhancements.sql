-- Add event enhancement columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Add index for share token lookups
CREATE INDEX IF NOT EXISTS idx_events_share_token ON events(share_token) WHERE share_token IS NOT NULL;

-- Add index for recurring event queries
CREATE INDEX IF NOT EXISTS idx_events_parent_id ON events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- Add index for event status and time-based queries
CREATE INDEX IF NOT EXISTS idx_events_status_start_time ON events(status, start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time) WHERE status = 'scheduled';

-- Comments for documentation
COMMENT ON COLUMN events.is_recurring IS 'Whether this event repeats on a schedule';
COMMENT ON COLUMN events.recurrence_pattern IS 'JSON object defining recurrence: { frequency: "daily"|"weekly"|"custom", daysOfWeek: [0-6], endDate: "ISO date" }';
COMMENT ON COLUMN events.share_token IS 'Unique token for sharing event via URL';
COMMENT ON COLUMN events.parent_event_id IS 'References the parent event if this is a recurring instance';
