CREATE TABLE IF NOT EXISTS product_documents (id TEXT PRIMARY KEY,name TEXT NOT NULL,file_name TEXT NOT NULL,mime_type TEXT NOT NULL,storage_key TEXT NOT NULL UNIQUE,checksum TEXT,uploaded_at TEXT NOT NULL,uploaded_by TEXT NOT NULL,description TEXT);
CREATE TABLE IF NOT EXISTS source_references (id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES product_documents(id) ON DELETE CASCADE,page INTEGER,table_name TEXT,region TEXT,excerpt TEXT);
CREATE TABLE IF NOT EXISTS entity_source_references (entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,source_reference_id TEXT NOT NULL REFERENCES source_references(id) ON DELETE CASCADE,field_name TEXT,PRIMARY KEY(entity_type,entity_id,source_reference_id,field_name));
CREATE INDEX IF NOT EXISTS idx_source_reference_document ON source_references(document_id);
CREATE INDEX IF NOT EXISTS idx_entity_source_entity ON entity_source_references(entity_type,entity_id);
