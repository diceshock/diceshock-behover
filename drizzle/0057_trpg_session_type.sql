ALTER TABLE trpg_sessions ADD COLUMN session_type TEXT NOT NULL DEFAULT 'commercial' CHECK (session_type IN ('commercial','club','test'));
