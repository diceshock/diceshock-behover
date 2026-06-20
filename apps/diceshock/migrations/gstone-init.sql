CREATE TABLE IF NOT EXISTS games (
  gstone_id INTEGER PRIMARY KEY,
  name TEXT,
  eng_name TEXT,
  rating REAL,
  player_num TEXT,
  category TEXT,
  description TEXT,
  cover_url TEXT,
  cover_cached INTEGER DEFAULT 0,
  full_data TEXT,
  crawled_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS crawl_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gstone_id INTEGER,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT,
  resolved INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating DESC);
CREATE INDEX IF NOT EXISTS idx_errors_unresolved ON crawl_errors(resolved, gstone_id);
