-- Create event messages table for chat
CREATE TABLE IF NOT EXISTS event_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_event_messages_event ON event_messages(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_messages_user ON event_messages(user_id);

-- Create event posts table for social feed
CREATE TABLE IF NOT EXISTS event_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create event post reactions table
CREATE TABLE IF NOT EXISTS event_post_reactions (
  post_id UUID NOT NULL REFERENCES event_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Create indexes for posts and reactions
CREATE INDEX IF NOT EXISTS idx_event_posts_event ON event_posts(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_posts_user ON event_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_post_reactions_post ON event_post_reactions(post_id);

-- Add comments for documentation
COMMENT ON TABLE event_messages IS 'Real-time chat messages for events';
COMMENT ON TABLE event_posts IS 'Social feed posts for events with photos and comments';
COMMENT ON TABLE event_post_reactions IS 'Reactions (like, fire, heart) on event posts';
