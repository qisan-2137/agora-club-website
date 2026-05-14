PRAGMA defer_foreign_keys = on;

CREATE TABLE talks_next (
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

INSERT INTO talks_next (
	id,
	title,
	speaker_name,
	event_date,
	summary,
	speaker_feedback,
	ppt_url,
	created_by_admin_id,
	updated_by_admin_id,
	created_at,
	updated_at
)
SELECT
	id,
	title,
	speaker_name,
	event_date,
	summary,
	speaker_feedback,
	CASE
		WHEN ppt_object_key LIKE 'http://%' OR ppt_object_key LIKE 'https://%' THEN ppt_object_key
		ELSE ''
	END,
	created_by_admin_id,
	updated_by_admin_id,
	created_at,
	updated_at
FROM talks;

DROP TABLE talks;
ALTER TABLE talks_next RENAME TO talks;
CREATE INDEX IF NOT EXISTS idx_talks_event_date ON talks(event_date DESC);
