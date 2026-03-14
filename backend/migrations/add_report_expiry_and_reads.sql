-- Add expiry and activity tracking to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill expires_at for existing rows based on type TTLs
UPDATE reports SET expires_at = created_at + INTERVAL '24 hours' WHERE type IN ('hazard', 'other')   AND expires_at IS NULL;
UPDATE reports SET expires_at = created_at + INTERVAL '12 hours' WHERE type = 'general'              AND expires_at IS NULL;
UPDATE reports SET expires_at = created_at + INTERVAL '6 hours'  WHERE type = 'food_status'         AND expires_at IS NULL;
UPDATE reports SET expires_at = created_at + INTERVAL '48 hours' WHERE type = 'safety'              AND expires_at IS NULL;
UPDATE reports SET expires_at = created_at + INTERVAL '7 days'   WHERE type = 'campus_update'       AND expires_at IS NULL;
UPDATE reports SET expires_at = created_at + INTERVAL '3 days'   WHERE type = 'accessibility'       AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_expires_at ON reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_last_activity ON reports(last_activity_at DESC);

-- Unread tracking: one row per (report, user), updated on chat open
CREATE TABLE IF NOT EXISTS report_message_reads (
  report_id    UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_message_reads_user ON report_message_reads(user_id);
