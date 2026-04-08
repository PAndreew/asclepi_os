import { Router } from 'express';
import { db } from '../lib/db.js';

export const alertsRouter = Router();

alertsRouter.get('/', (_req, res) => {
  const alerts = db.prepare(
    `SELECT id,
            raw_entry_id as rawEntryId,
            level,
            title,
            body,
            rule_key as ruleKey,
            metric_key as metricKey,
            provenance_json as provenanceJson,
            created_at as createdAt
     FROM alerts
     ORDER BY id DESC
     LIMIT 50`
  ).all();

  res.json(alerts);
});
