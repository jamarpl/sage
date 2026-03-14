-- Magic link tokens for passwordless auth (login and signup)
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('login', 'signup')),
  name VARCHAR(255),
  username VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);
