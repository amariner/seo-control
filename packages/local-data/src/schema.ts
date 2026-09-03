export const LOCAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS crawl_runs (
  id VARCHAR PRIMARY KEY,
  project VARCHAR NOT NULL,
  domain VARCHAR NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR NOT NULL,
  max_urls INTEGER NOT NULL CHECK (max_urls <= 50000),
  crawled_urls INTEGER NOT NULL DEFAULT 0,
  configuration JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_pages (
  run_id VARCHAR NOT NULL,
  url VARCHAR NOT NULL,
  url_hash VARCHAR NOT NULL,
  status_code INTEGER,
  content_type VARCHAR,
  title VARCHAR,
  meta_description VARCHAR,
  canonical VARCHAR,
  robots VARCHAR,
  depth INTEGER,
  response_ms INTEGER,
  template VARCHAR,
  indexable BOOLEAN,
  hreflang JSON,
  schema_types JSON,
  PRIMARY KEY (run_id, url_hash)
);

CREATE TABLE IF NOT EXISTS crawl_links (
  run_id VARCHAR NOT NULL,
  source_hash VARCHAR NOT NULL,
  target_hash VARCHAR NOT NULL,
  anchor VARCHAR,
  follow BOOLEAN NOT NULL,
  internal BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS curated_issues (
  id VARCHAR PRIMARY KEY,
  run_id VARCHAR NOT NULL,
  fingerprint VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  severity VARCHAR NOT NULL,
  affected_urls INTEGER NOT NULL,
  traffic_at_risk INTEGER NOT NULL,
  persistence_runs INTEGER NOT NULL,
  priority_score DOUBLE NOT NULL,
  sample JSON NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS report_drafts (
  id VARCHAR PRIMARY KEY,
  project VARCHAR,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  author_id VARCHAR NOT NULL,
  reviewer_id VARCHAR,
  status VARCHAR NOT NULL,
  blocks JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
`;

export const CURATED_EXPORT_SQL = `
COPY (
  SELECT id, fingerprint, category, severity, affected_urls, traffic_at_risk,
         persistence_runs, priority_score, sample
  FROM curated_issues
  WHERE run_id = $run_id AND approved = TRUE
  ORDER BY priority_score DESC
  LIMIT 500
) TO $output_path (FORMAT PARQUET, COMPRESSION ZSTD);
`;
