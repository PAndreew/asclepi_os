import { normalizeMetricLabel, resolveKnownMetric } from './metricCatalog.js';

export interface ExtractedObservation {
  category: string;
  metricKey: string;
  sourceMetricLabel: string | null;
  valueType: 'number' | 'text' | 'boolean';
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  unitOriginal: string | null;
  unitCanonical: string | null;
  confidence: number;
  provenance: Record<string, unknown>;
}

export interface MetricCandidate {
  candidateLabel: string;
  normalizedKey: string;
  sampleValueText: string | null;
  sampleUnit: string | null;
  reason: string;
  confidence: number;
  provenance: Record<string, unknown>;
}

export interface ExtractionResult {
  observations: ExtractedObservation[];
  metricCandidates: MetricCandidate[];
}

const symptomPatterns = [
  { term: 'headache', metricKey: 'headache_present' },
  { term: 'nausea', metricKey: 'nausea_present' },
  { term: 'dizzy', metricKey: 'dizziness_present' },
  { term: 'dizziness', metricKey: 'dizziness_present' },
  { term: 'fatigue', metricKey: 'fatigue_present' },
  { term: 'cough', metricKey: 'cough_present' },
  { term: 'fever', metricKey: 'fever_present' },
  { term: 'pain', metricKey: 'pain_present' },
  { term: 'anxiety', metricKey: 'anxiety_present' },
  { term: 'stress', metricKey: 'stress_present' },
];

const chestPainTerms = ['chest pain', 'chest tightness', 'chest pressure', 'chest discomfort'];

export function extractObservations(rawText: string): ExtractionResult {
  const text = rawText.toLowerCase();
  const observations: ExtractedObservation[] = [];
  const metricCandidates: MetricCandidate[] = [];
  const seenObservationKeys = new Set<string>();
  const seenCandidateKeys = new Set<string>();

  function addObservation(observation: ExtractedObservation) {
    const dedupeKey = [
      observation.metricKey,
      observation.valueType,
      observation.valueText,
      observation.valueNumber,
      observation.valueBoolean,
      observation.unitCanonical,
    ].join('|');

    if (seenObservationKeys.has(dedupeKey)) {
      return;
    }

    seenObservationKeys.add(dedupeKey);
    observations.push(observation);
  }

  const sleepMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)\s*(?:of\s*)?sleep/);
  if (sleepMatch) {
    addObservation({
      category: 'sleep',
      metricKey: 'sleep_hours',
      sourceMetricLabel: 'sleep hours',
      valueType: 'number',
      valueText: sleepMatch[1],
      valueNumber: Number(sleepMatch[1]),
      valueBoolean: null,
      unitOriginal: 'hours',
      unitCanonical: 'hours',
      confidence: 0.82,
      provenance: { extractor: 'regex', pattern: 'sleep_hours', match: sleepMatch[0] },
    });
  }

  const bpMatch = text.match(/(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/);
  if (bpMatch) {
    const systolic = Number(bpMatch[1]);
    const diastolic = Number(bpMatch[2]);
    if (systolic >= 60 && systolic <= 250 && diastolic >= 30 && diastolic <= 150) {
      addObservation({
        category: 'vitals',
        metricKey: 'blood_pressure_systolic',
        sourceMetricLabel: 'blood pressure systolic',
        valueType: 'number',
        valueText: bpMatch[1],
        valueNumber: systolic,
        valueBoolean: null,
        unitOriginal: 'mmHg',
        unitCanonical: 'mmHg',
        confidence: 0.9,
        provenance: { extractor: 'regex', pattern: 'blood_pressure', match: bpMatch[0], component: 'systolic' },
      });
      addObservation({
        category: 'vitals',
        metricKey: 'blood_pressure_diastolic',
        sourceMetricLabel: 'blood pressure diastolic',
        valueType: 'number',
        valueText: bpMatch[2],
        valueNumber: diastolic,
        valueBoolean: null,
        unitOriginal: 'mmHg',
        unitCanonical: 'mmHg',
        confidence: 0.9,
        provenance: { extractor: 'regex', pattern: 'blood_pressure', match: bpMatch[0], component: 'diastolic' },
      });
    }
  }

  const tempCMatch = text.match(/(\d{2}(?:\.\d)?)\s*(?:°c|c\b|celsius)/);
  const tempFMatch = text.match(/(\d{2,3}(?:\.\d)?)\s*(?:°f|f\b|fahrenheit)/);
  if (tempCMatch) {
    addObservation({
      category: 'vitals',
      metricKey: 'temperature',
      sourceMetricLabel: 'temperature',
      valueType: 'number',
      valueText: tempCMatch[1],
      valueNumber: Number(tempCMatch[1]),
      valueBoolean: null,
      unitOriginal: 'C',
      unitCanonical: 'C',
      confidence: 0.88,
      provenance: { extractor: 'regex', pattern: 'temperature_c', match: tempCMatch[0] },
    });
  } else if (tempFMatch) {
    const fahrenheit = Number(tempFMatch[1]);
    const celsius = Number((((fahrenheit - 32) * 5) / 9).toFixed(2));
    addObservation({
      category: 'vitals',
      metricKey: 'temperature',
      sourceMetricLabel: 'temperature',
      valueType: 'number',
      valueText: tempFMatch[1],
      valueNumber: celsius,
      valueBoolean: null,
      unitOriginal: 'F',
      unitCanonical: 'C',
      confidence: 0.88,
      provenance: { extractor: 'regex', pattern: 'temperature_f', match: tempFMatch[0], normalizedFrom: fahrenheit },
    });
  }

  const medMatch = rawText.match(/took\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
  if (medMatch) {
    addObservation({
      category: 'medication',
      metricKey: 'medication_taken',
      sourceMetricLabel: 'medication taken',
      valueType: 'text',
      valueText: medMatch[2].trim(),
      valueNumber: Number(medMatch[1]),
      valueBoolean: null,
      unitOriginal: 'dose',
      unitCanonical: null,
      confidence: 0.7,
      provenance: { extractor: 'regex', pattern: 'medication_taken', match: medMatch[0], dose: medMatch[1] },
    });
  }

  for (const symptom of symptomPatterns) {
    if (text.includes(symptom.term)) {
      addObservation({
        category: 'symptom',
        metricKey: symptom.metricKey,
        sourceMetricLabel: symptom.term,
        valueType: 'boolean',
        valueText: symptom.term,
        valueNumber: null,
        valueBoolean: true,
        unitOriginal: null,
        unitCanonical: null,
        confidence: 0.7,
        provenance: { extractor: 'keyword', term: symptom.term },
      });
    }
  }

  if (chestPainTerms.some(function (term) { return text.includes(term); })) {
    addObservation({
      category: 'symptom',
      metricKey: 'chest_pain_present',
      sourceMetricLabel: 'chest pain',
      valueType: 'boolean',
      valueText: 'chest pain',
      valueNumber: null,
      valueBoolean: true,
      unitOriginal: null,
      unitCanonical: null,
      confidence: 0.82,
      provenance: { extractor: 'keyword', term: 'chest pain family' },
    });
  }

  const candidatePattern = /([A-Za-z][A-Za-z0-9 #()+\/-]{2,40})\s*[:=]\s*(\d+(?:[\.,]\d+)?)\s*([A-Za-z%/µμ^0-9.-]+)?/g;
  let match: RegExpExecArray | null;
  while ((match = candidatePattern.exec(rawText)) !== null) {
    const label = match[1].trim();
    const knownMetric = resolveKnownMetric(label);
    if (knownMetric) {
      continue;
    }

    const normalizedKey = normalizeMetricLabel(label);
    if (!normalizedKey || normalizedKey.length < 3) {
      continue;
    }

    const dedupeKey = `${normalizedKey}|${match[2]}|${match[3] || ''}`;
    if (seenCandidateKeys.has(dedupeKey)) {
      continue;
    }

    seenCandidateKeys.add(dedupeKey);
    metricCandidates.push({
      candidateLabel: label,
      normalizedKey,
      sampleValueText: match[2].replace(',', '.'),
      sampleUnit: match[3] || null,
      reason: 'Unmapped metric-like label found in check-in text. Added as candidate instead of mutating schema.',
      confidence: 0.55,
      provenance: { extractor: 'candidate_regex', match: match[0] },
    });
  }

  return { observations, metricCandidates };
}
