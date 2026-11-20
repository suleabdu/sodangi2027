-- Apply once to an existing D1 database before enabling Facebook Page sync.
CREATE TABLE IF NOT EXISTS integration_settings (
  provider TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  page_id TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  auto_publish INTEGER NOT NULL DEFAULT 0 CHECK(auto_publish IN (0,1)),
  sync_interval_minutes INTEGER NOT NULL DEFAULT 30,
  last_synced_at TEXT,
  last_status TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO integration_settings(provider) VALUES ('facebook');

-- Preserve the full-resolution flyers as downloads, but avoid serving them as
-- repeated news-card images on the existing homepage.
UPDATE content SET image='/assets/shares.jpg' WHERE id='intro-digits-2027' AND image='/assets/sodangiEng.png';
UPDATE content SET image='/assets/share0s.jpg' WHERE id='shares-framework-2027' AND image='/assets/sodangiEng.png';
