-- Independent domain tables; existing activity, member and store rows are unchanged.
CREATE TABLE trpg_access (
 user_id TEXT NOT NULL REFERENCES "user"(id), store_id TEXT NOT NULL REFERENCES stores(id),
 staff INTEGER NOT NULL DEFAULT 0 CHECK (staff IN (0,1)), host INTEGER NOT NULL DEFAULT 0 CHECK (host IN (0,1)),
 PRIMARY KEY (user_id,store_id)
);
CREATE TABLE trpg_sessions (
 id TEXT PRIMARY KEY NOT NULL, store_id TEXT NOT NULL REFERENCES stores(id), host_id TEXT NOT NULL REFERENCES "user"(id),
 table_id TEXT REFERENCES tables(id), title TEXT NOT NULL, description TEXT NOT NULL,
 module_name TEXT NOT NULL, game_system TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('pending','returned','published','cancelled','completed')),
 starts_at INTEGER, deadline INTEGER, priority_until INTEGER,
 duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
 fee_cents INTEGER NOT NULL CHECK (fee_cents BETWEEN 0 AND 999999), capacity INTEGER NOT NULL, minimum INTEGER NOT NULL,
 time_hint TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
 revision INTEGER NOT NULL DEFAULT 1, reason TEXT, changed_by TEXT REFERENCES "user"(id),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 CONSTRAINT trpg_capacity CHECK (minimum >= 1 AND minimum <= capacity AND capacity <= 6),
 CHECK ((starts_at IS NULL AND deadline IS NULL AND table_id IS NULL) OR
 (starts_at IS NOT NULL AND deadline IS NOT NULL AND table_id IS NOT NULL AND deadline <= starts_at))
);
CREATE INDEX trpg_sessions_store_schedule ON trpg_sessions(store_id,status,starts_at);
CREATE INDEX trpg_sessions_host_schedule ON trpg_sessions(host_id,status,starts_at);
CREATE TABLE trpg_registrations (
 id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES trpg_sessions(id), user_id TEXT NOT NULL REFERENCES "user"(id),
 status TEXT NOT NULL CHECK (status IN ('interested','pending','confirmed','rejected','withdrawn')),
 reason TEXT, reviewed_by TEXT REFERENCES "user"(id), reviewed_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX trpg_registrations_user ON trpg_registrations(user_id,created_at);
CREATE UNIQUE INDEX trpg_registration_active ON trpg_registrations(session_id,user_id)
 WHERE status IN ('interested','pending','confirmed');
