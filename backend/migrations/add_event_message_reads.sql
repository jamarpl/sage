-- Unread tracking for event chats: one row per (event, user), updated when the
-- user opens the event chat. This lets the API compute unread counts.
CREATE TABLE IF NOT EXISTS event_message_reads (
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_message_reads_user ON event_message_reads(user_id);

