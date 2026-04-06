import { Router } from 'express';
import { db } from '../lib/db.js';

export const observationsRouter = Router();

observationsRouter.get('/', (_req, res) => {
  const observations = db.prepare(
    `SELECT id, raw_entry_id as rawEntryId, category, metric, value_text as valueText,
            value_number as valueNumber, unit, confidence, created_at as createdAt
     FROM structured_observations
     ORDER BY id DESC
     LIMIT 200`
  ).all();

  res.json(observations);
});

observationsRouter.get('/chart/:metric', (req, res) => {
  const rows = db.prepare(
    `SELECT created_at as createdAt, value_number as valueNumber
     FROM structured_observations
     WHERE metric = ? AND value_number IS NOT NULL
     ORDER BY datetime(created_at) ASC`
  ).all(req.params.metric);

  res.json({ metric: req.params.metric, points: rows });
});
