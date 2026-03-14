-- Store lightweight live location for anonymous nearby user indicators.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS live_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS live_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS live_location_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_live_location_updated_at
  ON users(live_location_updated_at DESC);

-- Nearby users by fresh location ping (anonymous, excludes requester).
CREATE OR REPLACE FUNCTION get_nearby_live_users(
  p_user_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 500,
  p_active_within_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.live_lat,
    u.live_lng,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(u.live_lng, u.live_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters
  FROM users u
  WHERE u.id <> p_user_id
    AND u.live_lat IS NOT NULL
    AND u.live_lng IS NOT NULL
    AND u.live_location_updated_at IS NOT NULL
    AND u.live_location_updated_at >= NOW() - (p_active_within_minutes || ' minutes')::interval
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(u.live_lng, u.live_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;
