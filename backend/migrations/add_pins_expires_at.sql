-- Pin expiry: pins can expire unless verified (verification_count >= N clears expires_at).
-- RPCs and cleanup job filter/delete by expires_at.

ALTER TABLE pins ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_pins_expires_at ON pins(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN pins.expires_at IS 'When the pin expires and is hidden from the map; NULL = never expire (e.g. verified).';

-- Recreate get_nearby_pins to exclude expired pins
DROP FUNCTION IF EXISTS get_nearby_pins(double precision, double precision, integer, text, integer);
CREATE OR REPLACE FUNCTION get_nearby_pins(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 1000,
  pin_type TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  pin_lat DOUBLE PRECISION,
  pin_lng DOUBLE PRECISION,
  type TEXT,
  title TEXT,
  description TEXT,
  tags TEXT[],
  building TEXT,
  floor TEXT,
  access_notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP,
  verification_count BIGINT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    ST_Y(p.location::geometry) AS pin_lat,
    ST_X(p.location::geometry) AS pin_lng,
    p.type::TEXT,
    p.title::TEXT,
    p.description::TEXT,
    p.tags,
    p.building::TEXT,
    p.floor::TEXT,
    p.access_notes::TEXT,
    p.photo_urls,
    p.created_at::TIMESTAMP,
    COALESCE(COUNT(pv.pin_id), 0) AS verification_count,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM pins p
  LEFT JOIN pin_verifications pv ON pv.pin_id = p.id AND pv.is_accurate = true
  WHERE ST_DWithin(
    p.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  AND (pin_type IS NULL OR p.type = pin_type)
  AND (p.expires_at IS NULL OR p.expires_at > NOW())
  GROUP BY p.id
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Recreate search_nearby_pins to exclude expired pins
DROP FUNCTION IF EXISTS search_nearby_pins(double precision, double precision, integer, text, integer);
CREATE OR REPLACE FUNCTION search_nearby_pins(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 1000,
  pin_type TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  pin_lat DOUBLE PRECISION,
  pin_lng DOUBLE PRECISION,
  type TEXT,
  title TEXT,
  description TEXT,
  tags TEXT[],
  building TEXT,
  floor TEXT,
  access_notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP,
  verification_count BIGINT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    ST_Y(p.location::geometry) AS pin_lat,
    ST_X(p.location::geometry) AS pin_lng,
    p.type::TEXT,
    p.title::TEXT,
    p.description::TEXT,
    p.tags,
    p.building::TEXT,
    p.floor::TEXT,
    p.access_notes::TEXT,
    p.photo_urls,
    p.created_at::TIMESTAMP,
    COALESCE(COUNT(pv.pin_id), 0) AS verification_count,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM pins p
  LEFT JOIN pin_verifications pv ON pv.pin_id = p.id AND pv.is_accurate = true
  WHERE ST_DWithin(
    p.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  AND (pin_type IS NULL OR p.type = pin_type)
  AND (p.expires_at IS NULL OR p.expires_at > NOW())
  GROUP BY p.id
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
