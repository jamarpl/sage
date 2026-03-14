-- Create function to get event details with extracted coordinates
CREATE OR REPLACE FUNCTION get_event_details(p_event_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  location TEXT,
  location_name TEXT,
  building TEXT,
  room TEXT,
  max_attendees INTEGER,
  current_attendees INTEGER,
  interested_count INTEGER,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  tags TEXT[],
  is_recurring BOOLEAN,
  recurrence_pattern JSONB,
  parent_event_id UUID,
  share_token TEXT,
  photo_url TEXT,
  is_public BOOLEAN,
  requires_approval BOOLEAN,
  external_link TEXT,
  pin_id UUID,
  embedding VECTOR(1536),
  view_count INTEGER,
  recurrence_rule TEXT,
  event_lat DOUBLE PRECISION,
  event_lng DOUBLE PRECISION,
  creator_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.title,
    e.description,
    e.category,
    e.start_time,
    e.end_time,
    e.location::TEXT,
    e.location_name,
    e.building,
    e.room,
    e.max_attendees,
    COUNT(DISTINCT CASE WHEN ea.status = 'going' THEN ea.user_id END)::INTEGER as current_attendees,
    COUNT(DISTINCT CASE WHEN ea.status = 'interested' THEN ea.user_id END)::INTEGER as interested_count,
    e.status,
    e.created_at,
    e.updated_at,
    e.tags,
    e.is_recurring,
    e.recurrence_pattern,
    e.parent_event_id,
    e.share_token,
    e.photo_url,
    e.is_public,
    e.requires_approval,
    e.external_link,
    e.pin_id,
    e.embedding,
    e.view_count,
    e.recurrence_rule,
    ST_Y(e.location::geometry) AS event_lat,
    ST_X(e.location::geometry) AS event_lng,
    u.name AS creator_name
  FROM events e
  LEFT JOIN event_attendees ea ON e.id = ea.event_id
  LEFT JOIN users u ON e.user_id = u.id
  WHERE e.id = p_event_id
  GROUP BY e.id, u.name;
END;
$$ LANGUAGE plpgsql;
