ALTER TABLE ingestion_candidates ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'catalog';
