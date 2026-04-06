import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { schemaSql } from './schema.js';

export type RawEntryInput = {
  period: 'morning' | 'evening' | 'ad_hoc';
  rawText: string;
};

export type ObservationInput = {
  rawEntryId: number;
  kind: string;
  label: string;
  valueText?: string | null;
  valueNumber?: number | null;
  unit?: string | null;
  severity?: string | null;
  confidence?: number;
};

export type AlertInput = {
  rawEntryId: number;
  level: 'info' | 'attention' | 'urgent';
  title: string;
  detail: string;
};

export function createDb(appDataDir: string) {
  fs.mkdirSync(appDataDir, { recursive: true });
  const dbPath = path.join(appDataDir, 'asclepios.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(schemaSql);

  return {
    db,
    insertRawEntry(input: RawEntryInput) {
      const stmt = db.prepare(`INSERT INTO raw_entries (period, raw_text) VALUES (?, ?)`);
      const result = stmt.run(input.period, input.rawText);
      return Number(result.lastInsertRowid);
    },
    insertObservation(input: ObservationInput) {
      db.prepare(`
        INSERT INTO observations (raw_entry_id, kind, label, value_text, value_number, unit, severity, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.rawEntryId,
        input.kind,
        input.label,
        input.valueText ?? null,
        input.valueNumber ?? null,
        input.unit ?? null,
        input.severity ?? null,
        input.confidence ?? 0.7,
      );
    },
    insertAlert(input: AlertInput) {
      db.prepare(`INSERT INTO alerts (raw_entry_id, level, title, detail) VALUES (?, ?, ?, ?)`)
        .run(input.rawEntryId, input.level, input.title, input.detail);
    },
    upsertReminder(period: string, timeOfDay: string, enabled: boolean) {
      const existing = db.prepare(`SELECT id FROM reminders WHERE period = ?`).get(period) as { id: number } | undefined;
      if (existing) {
        db.prepare(`UPDATE reminders SET time_of_day = ?, enabled = ? WHERE id = ?`).run(timeOfDay, enabled ? 1 : 0, existing.id);
      } else {
        db.prepare(`INSERT INTO reminders (period, time_of_day, enabled) VALUES (?, ?, ?)`)
          .run(period, timeOfDay, enabled ? 1 : 0);
      }
    },
    insertDocument(filename: string, mimeType?: string, note?: string) {
      const result = db.prepare(`INSERT INTO documents (filename, mime_type, note) VALUES (?, ?, ?)`)
        .run(filename, mimeType ?? null, note ?? null);
      return Number(result.lastInsertRowid);
    },
    getRecentEntries(limit = 20) {
      return db.prepare(`SELECT * FROM raw_entries ORDER BY id DESC LIMIT ?`).all(limit);
    },
    getRecentObservations(limit = 50) {
      return db.prepare(`SELECT * FROM observations ORDER BY id DESC LIMIT ?`).all(limit);
    },
    getRecentAlerts(limit = 20) {
      return db.prepare(`SELECT * FROM alerts ORDER BY id DESC LIMIT ?`).all(limit);
    },
    getReminders() {
      return db.prepare(`SELECT * FROM reminders ORDER BY id ASC`).all();
    },
    getSummary() {
      const counts = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM raw_entries) AS entry_count,
          (SELECT COUNT(*) FROM observations) AS observation_count,
          (SELECT COUNT(*) FROM alerts) AS alert_count,
          (SELECT COUNT(*) FROM documents) AS document_count
      `).get();
      const latestBp = db.prepare(`
        SELECT value_number, unit, observed_at, label
        FROM observations
        WHERE kind = 'measurement' AND label IN ('blood_pressure_systolic', 'blood_pressure_diastolic')
        ORDER BY id DESC
        LIMIT 2
      `).all();
      return { counts, latestBp };
    }
  };
}

export type HealthDb = ReturnType<typeof createDb>;
