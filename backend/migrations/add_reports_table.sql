-- Reports table for community reporting (hazards, food status, campus updates, etc.)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('hazard', 'food_status', 'campus_update', 'safety', 'accessibility', 'general', 'other')),
  pin_id UUID REFERENCES pins(id) ON DELETE SET NULL,
  location GEOMETRY(Point, 4326),
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_reports_pin ON reports(pin_id, created_at DESC) WHERE pin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_type_created ON reports(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

COMMENT ON TABLE reports IS 'Community reports: hazards, food status, campus updates, safety, accessibility';
COMMENT ON COLUMN reports.pin_id IS 'Optional: report attached to existing pin';
COMMENT ON COLUMN reports.location IS 'For standalone reports (when pin_id is null)';
COMMENT ON COLUMN reports.metadata IS 'Type-specific data: { status, subtype, severity }';

-- Function to get nearby reports (reports with location within radius)
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
  created_at TIMESTAMP,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.type,
    r.pin_id,
    r.content,
    r.metadata,
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
    AND (report_type IS NULL OR r.type = report_type)
  ORDER BY r.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
