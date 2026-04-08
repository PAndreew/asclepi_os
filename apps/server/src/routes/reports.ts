import { Router } from 'express';
import { db } from '../lib/db.js';

export const reportsRouter = Router();

reportsRouter.get('/summary', (_req, res) => {
  const summary = db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM raw_entries WHERE datetime(created_at) >= datetime('now', '-7 days')) as entriesLast7Days,
      (SELECT COUNT(*) FROM observations WHERE datetime(observed_at) >= datetime('now', '-7 days')) as observationsLast7Days,
      (SELECT COUNT(*) FROM observations WHERE category = 'symptom' AND datetime(observed_at) >= datetime('now', '-7 days')) as symptomMentionsLast7Days,
      (SELECT ROUND(AVG(value_number), 2) FROM observations WHERE metric_key = 'sleep_hours' AND datetime(observed_at) >= datetime('now', '-7 days')) as averageSleepHoursLast7Days,
      (SELECT COUNT(*) FROM metric_candidates WHERE status = 'pending') as pendingMetricCandidates`
  ).get();

  res.json(summary);
});
