import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { alertRuleSeeds, metricDefinitionSeeds, resolveKnownMetric } from '../services/metricCatalog.js';

export interface ObservationInsert {
  rawEntryId: number;
  category: string;
  metricKey: string;
  sourceMetricLabel: string | null;
  valueType: 'number' | 'text' | 'boolean';
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  unitOriginal: string | null;
  unitCanonical: string | null;
  confidence: number;
  observedAt?: string;
  status?: string;
  provenanceJson?: string;
}

export interface AlertInsert {
  rawEntryId: number;
  level: 'info' | 'attention' | 'urgent';
  title: string;
  body: string;
  ruleKey: string | null;
  metricKey: string | null;
  provenanceJson?: string;
}

export interface MetricCandidateInsert {
  rawEntryId: number;
  candidateLabel: string;
  normalizedKey: string;
  sampleValueText: string | null;
  sampleUnit: string | null;
  reason: string;
  confidence: number;
  provenanceJson?: string;
}

const dataDir = path.resolve(process.cwd(), 'apps/server/data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'asclepios.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS raw_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    source TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS metric_definitions (
    metric_key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    category TEXT NOT NULL,
    value_type TEXT NOT NULL,
    canonical_unit TEXT,
    description TEXT NOT NULL DEFAULT '',
    alert_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS metric_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL UNIQUE,
    normalized_alias TEXT NOT NULL UNIQUE,
    metric_key TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'seed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(metric_key) REFERENCES metric_definitions(metric_key)
  );

  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_entry_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    source_metric_label TEXT,
    value_type TEXT NOT NULL,
    value_text TEXT,
    value_number REAL,
    value_boolean INTEGER,
    unit_original TEXT,
    unit_canonical TEXT,
    confidence REAL NOT NULL,
    observed_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'normalized',
    provenance_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(raw_entry_id) REFERENCES raw_entries(id),
    FOREIGN KEY(metric_key) REFERENCES metric_definitions(metric_key)
  );

  CREATE TABLE IF NOT EXISTS metric_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_entry_id INTEGER NOT NULL,
    candidate_label TEXT NOT NULL,
    normalized_key TEXT NOT NULL,
    sample_value_text TEXT,
    sample_unit TEXT,
    reason TEXT NOT NULL,
    confidence REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    provenance_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(raw_entry_id) REFERENCES raw_entries(id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    schedule_time TEXT NOT NULL,
    period TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    extraction_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alert_rules (
    rule_key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    level TEXT NOT NULL,
    metric_key TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(metric_key) REFERENCES metric_definitions(metric_key)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_entry_id INTEGER,
    level TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    rule_key TEXT,
    metric_key TEXT,
    provenance_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(raw_entry_id) REFERENCES raw_entries(id),
    FOREIGN KEY(rule_key) REFERENCES alert_rules(rule_key),
    FOREIGN KEY(metric_key) REFERENCES metric_definitions(metric_key)
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    date_of_birth TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_obs_metric_key ON observations(metric_key);
  CREATE INDEX IF NOT EXISTS idx_obs_observed_at ON observations(observed_at);
  CREATE INDEX IF NOT EXISTS idx_obs_raw_entry_id ON observations(raw_entry_id);
  CREATE INDEX IF NOT EXISTS idx_metric_candidates_status ON metric_candidates(status);
  CREATE INDEX IF NOT EXISTS idx_metric_aliases_metric_key ON metric_aliases(metric_key);
  CREATE INDEX IF NOT EXISTS idx_entries_created_at ON raw_entries(created_at);
  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
`);

seedMetricCatalog();
seedAlertRules();
migrateLegacyStructuredObservations();
seedDefaultReminders();

function seedMetricCatalog() {
  const insertMetric = db.prepare(`
    INSERT INTO metric_definitions (metric_key, display_name, category, value_type, canonical_unit, description, alert_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(metric_key) DO UPDATE SET
      display_name = excluded.display_name,
      category = excluded.category,
      value_type = excluded.value_type,
      canonical_unit = excluded.canonical_unit,
      description = excluded.description,
      alert_enabled = excluded.alert_enabled,
      updated_at = excluded.updated_at
  `);

  const insertAlias = db.prepare(`
    INSERT INTO metric_aliases (alias, normalized_alias, metric_key, source_type)
    VALUES (?, ?, ?, 'seed')
    ON CONFLICT(normalized_alias) DO UPDATE SET
      alias = excluded.alias,
      metric_key = excluded.metric_key,
      source_type = excluded.source_type
  `);

  for (const metric of metricDefinitionSeeds) {
    insertMetric.run(
      metric.metricKey,
      metric.displayName,
      metric.category,
      metric.valueType,
      metric.canonicalUnit,
      metric.description,
      metric.alertEnabled ? 1 : 0,
    );

    insertAlias.run(metric.metricKey, metric.metricKey, metric.metricKey);
    for (const alias of metric.aliases) {
      const normalized = alias
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');
      insertAlias.run(alias, normalized, metric.metricKey);
    }
  }
}

function seedAlertRules() {
  const stmt = db.prepare(`
    INSERT INTO alert_rules (rule_key, title, description, level, metric_key, enabled)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(rule_key) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      level = excluded.level,
      metric_key = excluded.metric_key,
      enabled = excluded.enabled
  `);

  for (const rule of alertRuleSeeds) {
    stmt.run(rule.ruleKey, rule.title, rule.description, rule.level, rule.metricKey);
  }
}

function migrateLegacyStructuredObservations() {
  const legacyTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'structured_observations'"
  ).get() as { name: string } | undefined;

  if (!legacyTable) {
    return;
  }

  const observationCount = db.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number };
  if (observationCount.count > 0) {
    return;
  }

  const legacyRows = db.prepare(`
    SELECT raw_entry_id, category, metric, value_text, value_number, unit, confidence, created_at
    FROM structured_observations
    ORDER BY id ASC
  `).all() as Array<{
    raw_entry_id: number;
    category: string;
    metric: string;
    value_text: string | null;
    value_number: number | null;
    unit: string | null;
    confidence: number;
    created_at: string;
  }>;

  const insertObservationStatement = db.prepare(`
    INSERT INTO observations (
      raw_entry_id, category, metric_key, source_metric_label, value_type,
      value_text, value_number, value_boolean, unit_original, unit_canonical,
      confidence, observed_at, status, provenance_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of legacyRows) {
    const metricKey = resolveMetricKey(row.metric) || row.metric;
    ensureMetricDefinition(metricKey, row.metric, row.category, row.unit);

    insertObservationStatement.run(
      row.raw_entry_id,
      row.category,
      metricKey,
      row.metric,
      row.value_number !== null ? 'number' : 'text',
      row.value_text,
      row.value_number,
      null,
      row.unit,
      row.unit,
      row.confidence,
      row.created_at,
      'migrated',
      JSON.stringify({ source: 'legacy_structured_observations', metric: row.metric })
    );
  }
}

function seedDefaultReminders() {
  const reminderCount = db.prepare('SELECT COUNT(*) as count FROM reminders').get() as { count: number };
  if (reminderCount.count === 0) {
    db.prepare(
      'INSERT INTO reminders (label, schedule_time, period, enabled) VALUES (?, ?, ?, ?)'
    ).run('Morning health check-in', '08:00', 'morning', 1);
    db.prepare(
      'INSERT INTO reminders (label, schedule_time, period, enabled) VALUES (?, ?, ?, ?)'
    ).run('Evening health check-in', '20:00', 'evening', 1);
  }
}

export function resolveMetricKey(label: string): string | null {
  const fromSeed = resolveKnownMetric(label);
  if (fromSeed) {
    return fromSeed;
  }

  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  const aliasRow = db.prepare(
    'SELECT metric_key as metricKey FROM metric_aliases WHERE normalized_alias = ?'
  ).get(normalized) as { metricKey: string } | undefined;

  return aliasRow ? aliasRow.metricKey : null;
}

export function ensureMetricDefinition(
  metricKey: string,
  displayName: string,
  category: string,
  canonicalUnit: string | null,
) {
  db.prepare(`
    INSERT INTO metric_definitions (metric_key, display_name, category, value_type, canonical_unit, description, alert_enabled, updated_at)
    VALUES (?, ?, ?, 'number', ?, 'Auto-created during normalization or migration.', 0, datetime('now'))
    ON CONFLICT(metric_key) DO NOTHING
  `).run(metricKey, displayName, category, canonicalUnit);
}

export function insertRawEntry(period: string, source: string, rawText: string): number {
  const result = db.prepare(
    'INSERT INTO raw_entries (period, source, raw_text) VALUES (?, ?, ?)'
  ).run(period, source, rawText);
  return Number(result.lastInsertRowid);
}

export function insertObservation(input: ObservationInsert): number {
  ensureMetricDefinition(input.metricKey, input.sourceMetricLabel || input.metricKey, input.category, input.unitCanonical);

  const result = db.prepare(`
    INSERT INTO observations (
      raw_entry_id, category, metric_key, source_metric_label, value_type,
      value_text, value_number, value_boolean, unit_original, unit_canonical,
      confidence, observed_at, status, provenance_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.rawEntryId,
    input.category,
    input.metricKey,
    input.sourceMetricLabel,
    input.valueType,
    input.valueText,
    input.valueNumber,
    input.valueBoolean === null ? null : input.valueBoolean ? 1 : 0,
    input.unitOriginal,
    input.unitCanonical,
    input.confidence,
    input.observedAt || new Date().toISOString(),
    input.status || 'normalized',
    input.provenanceJson || null,
  );

  return Number(result.lastInsertRowid);
}

export function insertMetricCandidate(input: MetricCandidateInsert): number {
  const result = db.prepare(`
    INSERT INTO metric_candidates (
      raw_entry_id, candidate_label, normalized_key, sample_value_text,
      sample_unit, reason, confidence, provenance_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.rawEntryId,
    input.candidateLabel,
    input.normalizedKey,
    input.sampleValueText,
    input.sampleUnit,
    input.reason,
    input.confidence,
    input.provenanceJson || null,
  );

  return Number(result.lastInsertRowid);
}

export function insertAlert(input: AlertInsert): number {
  const result = db.prepare(
    'INSERT INTO alerts (raw_entry_id, level, title, body, rule_key, metric_key, provenance_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    input.rawEntryId,
    input.level,
    input.title,
    input.body,
    input.ruleKey,
    input.metricKey,
    input.provenanceJson || null,
  );

  return Number(result.lastInsertRowid);
}
