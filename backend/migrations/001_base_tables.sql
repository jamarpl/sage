-- ============================================================
-- Base tables for Community Map App
-- Must be run FIRST before any other migration
-- Requires: uuid-ossp, postgis, vector extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── Users ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255) NOT NULL,
  school VARCHAR(255),
  major VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  reputation_score INTEGER DEFAULT 0,
  pins_created INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Pins ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(Point, 4326) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  building VARCHAR(255),
  floor VARCHAR(50),
  access_notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pins_location ON pins USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_pins_user_id ON pins(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_type ON pins(type);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at DESC);

-- ─── Pin Verifications ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS pin_verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pin_id UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_accurate BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pin_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pin_verifications_pin ON pin_verifications(pin_id);

-- ─── Events ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(Point, 4326) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  location_name VARCHAR(255),
  building VARCHAR(255),
  room VARCHAR(100),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  photo_url TEXT,
  embedding VECTOR(1536),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  share_token VARCHAR(64) UNIQUE,
  parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, start_time);
CREATE INDEX IF NOT EXISTS idx_events_share_token ON events(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- ─── Event Attendees ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('interested', 'going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON event_attendees(user_id);

-- ─── PostGIS RPC Functions ───────────────────────────────────
-- Drop ALL overloads of these functions so return-type changes are allowed
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT oid::regprocedure::text AS sig
            FROM pg_proc WHERE proname = 'get_nearby_pins'
  LOOP EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE'; END LOOP;
  FOR r IN SELECT oid::regprocedure::text AS sig
            FROM pg_proc WHERE proname = 'get_upcoming_events'
  LOOP EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE'; END LOOP;
END $$;
DROP FUNCTION IF EXISTS increment_user_pins_created(UUID);

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
  GROUP BY p.id
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Fallback: if the old get_nearby_pins cannot be replaced due to return-type
-- conflicts, create under a new name so the app can call this one instead.
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
  GROUP BY p.id
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_upcoming_events(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000,
  hours_ahead INTEGER DEFAULT 168
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  event_lat DOUBLE PRECISION,
  event_lng DOUBLE PRECISION,
  title TEXT,
  description TEXT,
  category TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  max_attendees INTEGER,
  current_attendees INTEGER,
  tags TEXT[],
  location_name TEXT,
  building TEXT,
  room TEXT,
  status TEXT,
  photo_url TEXT,
  is_recurring BOOLEAN,
  parent_event_id UUID,
  created_at TIMESTAMP,
  distance_meters DOUBLE PRECISION,
  creator_name TEXT,
  creator_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    ST_Y(e.location::geometry) AS event_lat,
    ST_X(e.location::geometry) AS event_lng,
    e.title::TEXT,
    e.description::TEXT,
    e.category::TEXT,
    e.start_time::TIMESTAMP,
    e.end_time::TIMESTAMP,
    e.max_attendees,
    e.current_attendees,
    e.tags,
    e.location_name::TEXT,
    e.building::TEXT,
    e.room::TEXT,
    e.status::TEXT,
    e.photo_url::TEXT,
    e.is_recurring,
    e.parent_event_id,
    e.created_at::TIMESTAMP,
    ST_Distance(
      e.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters,
    u.name::TEXT AS creator_name,
    u.avatar_url::TEXT AS creator_avatar
  FROM events e
  JOIN users u ON u.id = e.user_id
  WHERE ST_DWithin(
    e.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  AND e.status = 'scheduled'
  AND e.end_time > NOW()
  AND e.start_time < NOW() + (hours_ahead || ' hours')::interval
  ORDER BY e.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- ─── Helper RPC for user counters ────────────────────────────

CREATE OR REPLACE FUNCTION increment_user_pins_created(uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET pins_created = COALESCE(pins_created, 0) + 1 WHERE id = uid;
END;
$$ LANGUAGE plpgsql;
