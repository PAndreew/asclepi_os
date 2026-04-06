import { Router } from 'express';
import { db } from '../lib/db.js';

export const reportsRouter = Router();

reportsRouter.get('/summary', (_req, res) => {
  const summary = db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM raw_entries WHERE datetime(created_at) >= datetime('now', '-7 days')) as entriesLast7Days,
      (SELECT COUNT(*) FROM structured_observations WHERE datetime(created_at) >= datetime('now', '-7 days')) as observationsLast7Days,
      (SELECT COUNT(*) FROM structured_observations WHERE category = 'symptom' AND datetime(created_at) >= datetime('now', '-7 days')) as symptomMentionsLast7Days,
      (SELECT ROUND(AVG(value_number), 2) FROM structured_observations WHERE metric = 'sleep_hours' AND datetime(created_at) >= datetime('now', '-7 days')) as averageSleepHoursLast7Days`
  ).get();

  res.json(summary);
});
