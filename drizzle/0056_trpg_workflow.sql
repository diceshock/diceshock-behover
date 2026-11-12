ALTER TABLE actives ADD COLUMN trpg_state TEXT CHECK (trpg_state IN ('pending','returned','published','cancelled','completed'));
ALTER TABLE actives ADD COLUMN trpg_module TEXT;
ALTER TABLE actives ADD COLUMN trpg_system TEXT;
ALTER TABLE actives ADD COLUMN trpg_min_players INTEGER CHECK (trpg_min_players BETWEEN 1 AND max_players);
ALTER TABLE actives ADD COLUMN trpg_table_id TEXT REFERENCES tables(id);
ALTER TABLE actives ADD COLUMN trpg_duration INTEGER;
ALTER TABLE actives ADD COLUMN trpg_fee INTEGER;
ALTER TABLE actives ADD COLUMN trpg_starts_at INTEGER;
ALTER TABLE actives ADD COLUMN trpg_deadline INTEGER;
ALTER TABLE actives ADD COLUMN trpg_closed_at INTEGER;
ALTER TABLE actives ADD COLUMN trpg_priority_until INTEGER;
ALTER TABLE actives ADD COLUMN trpg_time_hint TEXT;
ALTER TABLE actives ADD COLUMN trpg_reason TEXT;
ALTER TABLE actives ADD COLUMN trpg_tags TEXT;
ALTER TABLE actives ADD COLUMN trpg_changed_by TEXT REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE actives ADD COLUMN trpg_revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE active_registrations ADD COLUMN trpg_status TEXT
  CHECK (trpg_status IN ('interested','pending','confirmed','rejected','withdrawn'));
ALTER TABLE active_registrations ADD COLUMN trpg_reason TEXT;
ALTER TABLE active_registrations ADD COLUMN trpg_reviewed_by TEXT REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE active_registrations ADD COLUMN trpg_reviewed_at INTEGER;
ALTER TABLE user_info ADD COLUMN trpg_staff_stores TEXT CHECK (trpg_staff_stores IS NULL OR json_valid(trpg_staff_stores));
ALTER TABLE user_info ADD COLUMN trpg_host_stores TEXT CHECK (trpg_host_stores IS NULL OR json_valid(trpg_host_stores));
CREATE INDEX idx_trpg_schedule ON actives (store_id, trpg_state, trpg_starts_at) WHERE trpg_state IS NOT NULL;
CREATE INDEX idx_trpg_registration_player ON active_registrations (user_id, create_at DESC) WHERE trpg_status IS NOT NULL;
CREATE UNIQUE INDEX idx_trpg_registration_active ON active_registrations (active_id, user_id)
  WHERE trpg_status IN ('interested','pending','confirmed');

CREATE TRIGGER trpg_registration_scope BEFORE INSERT ON active_registrations
WHEN (NEW.trpg_status IS NOT NULL) <> EXISTS (
  SELECT 1 FROM actives WHERE id=NEW.active_id AND trpg_state IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'invalid TRPG registration scope');
END;
