import { Router } from 'express';
import { db } from '../lib/db.js';
import { deriveAlerts } from '../services/alerts.js';
import { extractObservations } from '../services/extractor.js';
import { summarizeEntry } from '../services/modelGateway.js';

export const checkinsRouter = Router();

checkinsRouter.get('/', (_req, res) => {
  const entries = db.prepare(
    'SELECT id, period, source, raw_text as rawText, created_at as createdAt FROM raw_entries ORDER BY id DESC LIMIT 50'
  ).all();
  res.json(entries);
});

checkinsRouter.post('/', async (req, res) => {
  const { rawText, period = 'freeform', source = 'checkin' } = req.body as {
    rawText?: string;
    period?: string;
    source?: string;
  };

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required' });
  }

  const insert = db.prepare(
    'INSERT INTO raw_entries (period, source, raw_text) VALUES (?, ?, ?)'
  );
  const result = insert.run(period, source, rawText.trim());
  const rawEntryId = Number(result.lastInsertRowid);

  const observations = extractObservations(rawText);
  const insertObservation = db.prepare(
    'INSERT INTO structured_observations (raw_entry_id, category, metric, value_text, value_number, unit, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  for (const observation of observations) {
    insertObservation.run(
      rawEntryId,
      observation.category,
      observation.metric,
      observation.valueText,
      observation.valueNumber,
      observation.unit,
      observation.confidence
    );
  }

  const alerts = deriveAlerts(observations, rawText);
  const insertAlert = db.prepare(
    'INSERT INTO alerts (raw_entry_id, level, title, body) VALUES (?, ?, ?, ?)'
  );
  for (const alert of alerts) {
    insertAlert.run(rawEntryId, alert.level, alert.title, alert.body);
  }

  const summary = await summarizeEntry(rawText);

  res.status(201).json({
    rawEntryId,
    extractedCount: observations.length,
    alerts,
    summary,
  });
});
