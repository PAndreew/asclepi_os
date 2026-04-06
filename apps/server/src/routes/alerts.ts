import { Router } from 'express';
import { db } from '../lib/db.js';

export const alertsRouter = Router();

alertsRouter.get('/', (_req, res) => {
  const alerts = db.prepare(
    `SELECT id, raw_entry_id as rawEntryId, level, title, body, created_at as createdAt
     FROM alerts
     ORDER BY id DESC
     LIMIT 50`
  ).all();
  res.json(alerts);
});
