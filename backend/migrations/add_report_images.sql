-- Add image_url to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Drop and recreate get_nearby_reports with image_url in return type
DO $$ BEGIN
  DROP FUNCTION IF EXISTS get_nearby_reports(double precision, double precision, integer, text, integer);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE OR REPLACE FUNCTION get_nearby_reports(
  p_lat FLOAT,
  p_lng FLOAT,
  radius_meters INT DEFAULT 500,
  report_type TEXT DEFAULT NULL,
  limit_count INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  pin_id UUID,
  content TEXT,
  metadata JSONB,
  image_url TEXT,
  created_at TIMESTAMP,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.type::TEXT,
    r.pin_id,
    r.content::TEXT,
    r.metadata,
    r.image_url::TEXT,
    r.created_at,
    ST_Y(r.location::geometry)::DOUBLE PRECISION,
    ST_X(r.location::geometry)::DOUBLE PRECISION
  FROM reports r
  WHERE
    r.location IS NOT NULL
    AND ST_DWithin(
      r.location::geography,
      ST_SetSRID(ST_Point(p_lng, p_lat), 4326)::geography,
      radius_meters
    )
    AND (report_type IS NULL OR r.type::TEXT = report_type)
  ORDER BY r.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
