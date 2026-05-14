CREATE TABLE IF NOT EXISTS admins (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'admin',
	is_active INTEGER NOT NULL DEFAULT 1,
	last_login_at TEXT,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
	id TEXT PRIMARY KEY,
	admin_id INTEGER NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TEXT NOT NULL,
	last_seen_at TEXT,
	revoked_at TEXT,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS talks (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	speaker_name TEXT NOT NULL,
	event_date TEXT NOT NULL,
	summary TEXT NOT NULL,
	speaker_feedback TEXT,
	ppt_url TEXT NOT NULL DEFAULT '',
	created_by_admin_id INTEGER NOT NULL,
	updated_by_admin_id INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (created_by_admin_id) REFERENCES admins(id),
	FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_lookup ON admin_sessions(admin_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_talks_event_date ON talks(event_date DESC);
