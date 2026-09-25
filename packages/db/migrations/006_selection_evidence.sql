ALTER TABLE project_selections ADD COLUMN IF NOT EXISTS duty_results_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE project_selections ADD COLUMN IF NOT EXISTS warnings_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE project_selections ADD COLUMN IF NOT EXISTS engine_version TEXT;
