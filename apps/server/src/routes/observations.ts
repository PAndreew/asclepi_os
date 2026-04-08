import { Router } from 'express';
import { db } from '../lib/db.js';

export const observationsRouter = Router();

observationsRouter.get('/', (_req, res) => {
  const observations = db.prepare(
    `SELECT o.id,
            o.raw_entry_id as rawEntryId,
            o.category,
            o.metric_key as metric,
            md.display_name as metricDisplayName,
            o.source_metric_label as sourceMetricLabel,
            o.value_type as valueType,
            o.value_text as valueText,
            o.value_number as valueNumber,
            o.value_boolean as valueBoolean,
            o.unit_canonical as unit,
            o.unit_original as unitOriginal,
            o.confidence,
            o.status,
            o.provenance_json as provenanceJson,
            o.observed_at as observedAt,
            o.created_at as createdAt
     FROM observations o
     LEFT JOIN metric_definitions md ON md.metric_key = o.metric_key
     ORDER BY datetime(o.observed_at) DESC, o.id DESC
     LIMIT 200`
  ).all();

  res.json(observations);
});

observationsRouter.get('/chart/:metric', (req, res) => {
  const rows = db.prepare(
    `SELECT observed_at as observedAt, value_number as valueNumber
     FROM observations
     WHERE metric_key = ? AND value_number IS NOT NULL
     ORDER BY datetime(observed_at) ASC`
  ).all(req.params.metric);

  res.json({ metric: req.params.metric, points: rows });
});
