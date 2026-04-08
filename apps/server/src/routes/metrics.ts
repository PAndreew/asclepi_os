import { Router } from 'express';
import { db } from '../lib/db.js';

export const metricsRouter = Router();

metricsRouter.get('/', (_req, res) => {
  const metrics = db.prepare(
    `SELECT md.metric_key as metricKey,
            md.display_name as displayName,
            md.category,
            md.value_type as valueType,
            md.canonical_unit as canonicalUnit,
            md.description,
            md.alert_enabled as alertEnabled,
            COUNT(ma.id) as aliasCount
     FROM metric_definitions md
     LEFT JOIN metric_aliases ma ON ma.metric_key = md.metric_key
     GROUP BY md.metric_key, md.display_name, md.category, md.value_type, md.canonical_unit, md.description, md.alert_enabled
     ORDER BY md.category ASC, md.display_name ASC`
  ).all();

  res.json(metrics);
});

metricsRouter.get('/aliases', (_req, res) => {
  const aliases = db.prepare(
    `SELECT id,
            alias,
            normalized_alias as normalizedAlias,
            metric_key as metricKey,
            source_type as sourceType,
            created_at as createdAt
     FROM metric_aliases
     ORDER BY alias ASC`
  ).all();

  res.json(aliases);
});

metricsRouter.get('/candidates', (_req, res) => {
  const candidates = db.prepare(
    `SELECT id,
            raw_entry_id as rawEntryId,
            candidate_label as candidateLabel,
            normalized_key as normalizedKey,
            sample_value_text as sampleValueText,
            sample_unit as sampleUnit,
            reason,
            confidence,
            status,
            provenance_json as provenanceJson,
            created_at as createdAt
     FROM metric_candidates
     ORDER BY id DESC`
  ).all();

  res.json(candidates);
});
