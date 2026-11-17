-- 0060: allow a session to be recruited before a venue is decided.
-- store_id becomes nullable (NULL = 地点待定), and table_id no longer has to be
-- present when the start time is known. trpg_registrations references
-- trpg_sessions, so both tables are rebuilt together to keep foreign keys valid.

CREATE TABLE trpg_sessions_new (
 id TEXT PRIMARY KEY NOT NULL,
 store_id TEXT REFERENCES stores(id),
 host_id TEXT NOT NULL REFERENCES "user"(id),
 table_id TEXT REFERENCES tables(id),
 title TEXT NOT NULL, description TEXT NOT NULL,
 module_name TEXT NOT NULL, game_system TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('pending','returned','published','cancelled','completed')),
 starts_at INTEGER, deadline INTEGER, priority_until INTEGER,
 duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
 session_type TEXT NOT NULL DEFAULT 'commercial' CHECK (session_type IN ('commercial','club','test')),
 fee_cents INTEGER NOT NULL CHECK (fee_cents BETWEEN 0 AND 999999),
 capacity INTEGER NOT NULL, minimum INTEGER NOT NULL,
 time_hint TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
 revision INTEGER NOT NULL DEFAULT 1, reason TEXT, changed_by TEXT REFERENCES "user"(id),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 CONSTRAINT trpg_capacity CHECK (minimum >= 1 AND minimum <= capacity AND capacity <= 6),
 CHECK (table_id IS NULL OR store_id IS NOT NULL),
 CHECK ((starts_at IS NULL AND deadline IS NULL) OR
 (starts_at IS NOT NULL AND deadline IS NOT NULL AND deadline <= starts_at))
);

INSERT INTO trpg_sessions_new
SELECT id, store_id, host_id, table_id, title, description, module_name, game_system,
       status, starts_at, deadline, priority_until, duration_minutes, session_type,
       fee_cents, capacity, minimum, time_hint, tags, revision, reason, changed_by,
       created_at, updated_at
FROM trpg_sessions;

CREATE TABLE trpg_registrations_new (
 id TEXT PRIMARY KEY NOT NULL,
 session_id TEXT NOT NULL REFERENCES trpg_sessions_new(id),
 user_id TEXT NOT NULL REFERENCES "user"(id),
 status TEXT NOT NULL CHECK (status IN ('interested','pending','confirmed','rejected','withdrawn')),
 reason TEXT, reviewed_by TEXT REFERENCES "user"(id), reviewed_at INTEGER,
 created_at INTEGER NOT NULL
);

INSERT INTO trpg_registrations_new
SELECT id, session_id, user_id, status, reason, reviewed_by, reviewed_at, created_at
FROM trpg_registrations;

DROP TABLE trpg_registrations;
DROP TABLE trpg_sessions;

ALTER TABLE trpg_sessions_new RENAME TO trpg_sessions;
ALTER TABLE trpg_registrations_new RENAME TO trpg_registrations;

CREATE INDEX trpg_sessions_store_schedule ON trpg_sessions(store_id,status,starts_at);
CREATE INDEX trpg_sessions_host_schedule ON trpg_sessions(host_id,status,starts_at);
CREATE INDEX trpg_registrations_user ON trpg_registrations(user_id,created_at);
CREATE UNIQUE INDEX trpg_registration_active ON trpg_registrations(session_id,user_id)
 WHERE status IN ('interested','pending','confirmed');
