PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '#a98bd1',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  category_slug TEXT REFERENCES categories(slug) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  layout TEXT NOT NULL DEFAULT 'single',
  cover_media_id TEXT,
  content_text TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX posts_public_date ON posts(status, published_at DESC);
CREATE INDEX posts_category ON posts(category_slug, status);
CREATE INDEX posts_search ON posts(title, excerpt, content_text);

CREATE TABLE post_blocks (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY (post_id, position)
);

CREATE TABLE tags (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL REFERENCES tags(slug) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_slug)
);

CREATE TABLE media (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  uploaded_at TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE post_media (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, media_id)
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE login_attempts (
  ip TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE INDEX login_attempts_ip_time ON login_attempts(ip, attempted_at);

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE playlists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE playlist_tracks (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (playlist_id, position)
);

INSERT INTO categories (slug, name, description, accent, sort_order) VALUES
  ('data-science', 'Data Science', 'Patterns, models, and the questions behind the data.', '#b59bdd', 1),
  ('computer-engineering', 'Computer Engineering', 'Systems, architecture, and how the machine thinks.', '#aaa0c0', 2),
  ('mathematics', 'Mathematics', 'Proofs, abstractions, and beautiful ways to see.', '#d2bd8c', 3),
  ('programming', 'Programming & Software', 'Notes from building things that work.', '#9fb7a4', 4),
  ('projects', 'Projects & Experiments', 'Works in progress and things made tangible.', '#c69a9a', 5),
  ('art', 'Art', 'Images, objects, and aesthetic curiosities.', '#c9a8bd', 6),
  ('music', 'Music', 'Listening notes and sounds kept close.', '#a995d5', 7),
  ('personal-notes', 'Personal Notes', 'Small thoughts from the margins.', '#b7a792', 8),
  ('general', 'General Archive', 'The uncategorized and the in-between.', '#b5a9bd', 9);

INSERT INTO site_settings (key, value) VALUES
  ('site_title', 'The Cyber Grimoire'),
  ('secondary_title', 'Grimoires d''une Data Scientiste');

INSERT INTO playlists (id, title, description, sort_order)
  VALUES ('listening-room', 'The Listening Room', 'A little soundtrack for wandering the archive.', 1);
