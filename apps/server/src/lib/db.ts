import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

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

  CREATE TABLE IF NOT EXISTS structured_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_entry_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    metric TEXT NOT NULL,
    value_text TEXT,
    value_number REAL,
    unit TEXT,
    confidence REAL NOT NULL,
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

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_entry_id INTEGER,
    level TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(raw_entry_id) REFERENCES raw_entries(id)
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    date_of_birth TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_obs_metric ON structured_observations(metric);
  CREATE INDEX IF NOT EXISTS idx_obs_created_at ON structured_observations(created_at);
  CREATE INDEX IF NOT EXISTS idx_entries_created_at ON raw_entries(created_at);
  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
`);

const reminderCount = db.prepare('SELECT COUNT(*) as count FROM reminders').get() as { count: number };
if (reminderCount.count === 0) {
  db.prepare(
    'INSERT INTO reminders (label, schedule_time, period, enabled) VALUES (?, ?, ?, ?)'
  ).run('Morning health check-in', '08:00', 'morning', 1);
  db.prepare(
    'INSERT INTO reminders (label, schedule_time, period, enabled) VALUES (?, ?, ?, ?)'
  ).run('Evening health check-in', '20:00', 'evening', 1);
}
