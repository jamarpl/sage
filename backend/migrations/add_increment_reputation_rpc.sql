-- Atomic reputation increment / decrement.
-- delta can be positive or negative.
-- Reputation is clamped to a minimum of 0.
CREATE OR REPLACE FUNCTION increment_reputation(uid UUID, delta INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET reputation_score = GREATEST(0, COALESCE(reputation_score, 0) + delta)
  WHERE id = uid;
END;
$$ LANGUAGE plpgsql;
