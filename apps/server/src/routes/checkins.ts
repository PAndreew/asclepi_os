import { Router } from 'express';
import { db, insertAlert, insertMetricCandidate, insertObservation, insertRawEntry } from '../lib/db.js';
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
  const body = req.body as {
    rawText?: string;
    period?: string;
    source?: string;
  };

  const rawText = (body.rawText || '').trim();
  const period = body.period || 'freeform';
  const source = body.source || 'checkin';

  if (!rawText) {
    return res.status(400).json({ error: 'rawText is required' });
  }

  const rawEntryId = insertRawEntry(period, source, rawText);
  const extraction = extractObservations(rawText);

  for (const observation of extraction.observations) {
    insertObservation({
      rawEntryId,
      category: observation.category,
      metricKey: observation.metricKey,
      sourceMetricLabel: observation.sourceMetricLabel,
      valueType: observation.valueType,
      valueText: observation.valueText,
      valueNumber: observation.valueNumber,
      valueBoolean: observation.valueBoolean,
      unitOriginal: observation.unitOriginal,
      unitCanonical: observation.unitCanonical,
      confidence: observation.confidence,
      provenanceJson: JSON.stringify(observation.provenance),
    });
  }

  for (const candidate of extraction.metricCandidates) {
    insertMetricCandidate({
      rawEntryId,
      candidateLabel: candidate.candidateLabel,
      normalizedKey: candidate.normalizedKey,
      sampleValueText: candidate.sampleValueText,
      sampleUnit: candidate.sampleUnit,
      reason: candidate.reason,
      confidence: candidate.confidence,
      provenanceJson: JSON.stringify(candidate.provenance),
    });
  }

  const alerts = deriveAlerts(extraction.observations, rawText);
  for (const alert of alerts) {
    insertAlert({
      rawEntryId,
      level: alert.level,
      title: alert.title,
      body: alert.body,
      ruleKey: alert.ruleKey,
      metricKey: alert.metricKey,
      provenanceJson: JSON.stringify(alert.provenance),
    });
  }

  const summary = await summarizeEntry(rawText);

  res.status(201).json({
    rawEntryId,
    extractedCount: extraction.observations.length,
    candidateCount: extraction.metricCandidates.length,
    alerts,
    summary,
  });
});
