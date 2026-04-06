export type ExtractedObservation = {
  kind: string;
  label: string;
  valueText?: string;
  valueNumber?: number;
  unit?: string;
  severity?: string;
  confidence?: number;
};

const symptomKeywords = ['headache', 'nausea', 'dizzy', 'dizziness', 'cough', 'fever', 'pain', 'fatigue', 'anxiety', 'stress'];

export function extractObservations(text: string): ExtractedObservation[] {
  const lower = text.toLowerCase();
  const observations: ExtractedObservation[] = [];

  const sleepMatch = lower.match(/(slept|sleep)\s+(about\s+)?(\d+(?:\.\d+)?)\s*(hours|hrs|h)/);
  if (sleepMatch) {
    observations.push({
      kind: 'measurement',
      label: 'sleep_hours',
      valueNumber: Number(sleepMatch[3]),
      unit: 'hours',
      confidence: 0.85,
    });
  }

  const bpMatch = lower.match(/(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/);
  if (bpMatch) {
    observations.push({ kind: 'measurement', label: 'blood_pressure_systolic', valueNumber: Number(bpMatch[1]), unit: 'mmHg', confidence: 0.92 });
    observations.push({ kind: 'measurement', label: 'blood_pressure_diastolic', valueNumber: Number(bpMatch[2]), unit: 'mmHg', confidence: 0.92 });
  }

  const weightMatch = lower.match(/(weight|weigh|weighed)\s*(is|was)?\s*(\d+(?:\.\d+)?)\s*(kg|kilograms|lbs|pounds)/);
  if (weightMatch) {
    observations.push({ kind: 'measurement', label: 'weight', valueNumber: Number(weightMatch[3]), unit: weightMatch[4], confidence: 0.88 });
  }

  const tempMatch = lower.match(/(temp|temperature)\s*(is|was)?\s*(\d{2}(?:\.\d+)?)\s*(c|f)?/);
  if (tempMatch) {
    observations.push({ kind: 'measurement', label: 'temperature', valueNumber: Number(tempMatch[3]), unit: tempMatch[4] || 'c', confidence: 0.83 });
  }

  const medMatch = lower.match(/took\s+(\d+)\s+([a-zA-Z]+)/);
  if (medMatch) {
    observations.push({ kind: 'medication', label: 'medication_taken', valueText: medMatch[2], valueNumber: Number(medMatch[1]), unit: 'dose', confidence: 0.7 });
  }

  for (const keyword of symptomKeywords) {
    if (lower.includes(keyword)) {
      observations.push({ kind: 'symptom', label: keyword, valueText: 'present', severity: inferSeverity(lower), confidence: 0.65 });
    }
  }

  return observations;
}

function inferSeverity(lower: string): string | undefined {
  if (/(severe|very bad|strong)/.test(lower)) return 'severe';
  if (/(mild|slight|little)/.test(lower)) return 'mild';
  if (/(moderate)/.test(lower)) return 'moderate';
  return undefined;
}
