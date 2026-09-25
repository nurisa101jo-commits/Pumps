CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS seals (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS impellers (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS accessories (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS configuration_options (
  configuration_id TEXT NOT NULL REFERENCES pump_configurations(id) ON DELETE CASCADE,
  option_kind TEXT NOT NULL,
  option_id TEXT NOT NULL,
  PRIMARY KEY(configuration_id, option_kind, option_id)
);
CREATE INDEX IF NOT EXISTS idx_configuration_options_configuration ON configuration_options(configuration_id);
CREATE INDEX IF NOT EXISTS idx_configuration_options_lookup ON configuration_options(option_kind, option_id);
