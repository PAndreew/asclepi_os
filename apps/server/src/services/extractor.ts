export interface ExtractedObservation {
  category: string;
  metric: string;
  valueText: string | null;
  valueNumber: number | null;
  unit: string | null;
  confidence: number;
}

const symptomKeywords = ['headache', 'nausea', 'dizzy', 'dizziness', 'fatigue', 'cough', 'fever', 'pain', 'anxiety', 'stress'];

export function extractObservations(rawText: string): ExtractedObservation[] {
  const text = rawText.toLowerCase();
  const observations: ExtractedObservation[] = [];

  const sleepMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)\s*(?:of\s*)?sleep/);
  if (sleepMatch) {
    observations.push({
      category: 'sleep',
      metric: 'sleep_hours',
      valueText: sleepMatch[1],
      valueNumber: Number(sleepMatch[1]),
      unit: 'hours',
      confidence: 0.82,
    });
  }

  const bpMatch = text.match(/(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/);
  if (bpMatch) {
    const systolic = Number(bpMatch[1]);
    const diastolic = Number(bpMatch[2]);
    if (systolic >= 60 && systolic <= 250 && diastolic >= 30 && diastolic <= 150) {
      observations.push({
        category: 'vitals',
        metric: 'blood_pressure_systolic',
        valueText: bpMatch[1],
        valueNumber: systolic,
        unit: 'mmHg',
        confidence: 0.9,
      });
      observations.push({
        category: 'vitals',
        metric: 'blood_pressure_diastolic',
        valueText: bpMatch[2],
        valueNumber: diastolic,
        unit: 'mmHg',
        confidence: 0.9,
      });
    }
  }

  // Require explicit unit to avoid ambiguity between °C and °F
  const tempCMatch = text.match(/(\d{2}(?:\.\d)?)\s*(?:°c|c\b|celsius)/);
  const tempFMatch = text.match(/(\d{2,3}(?:\.\d)?)\s*(?:°f|f\b|fahrenheit)/);
  if (tempCMatch) {
    observations.push({
      category: 'vitals',
      metric: 'temperature',
      valueText: tempCMatch[1],
      valueNumber: Number(tempCMatch[1]),
      unit: 'C',
      confidence: 0.88,
    });
  } else if (tempFMatch) {
    observations.push({
      category: 'vitals',
      metric: 'temperature',
      valueText: tempFMatch[1],
      valueNumber: Number(tempFMatch[1]),
      unit: 'F',
      confidence: 0.88,
    });
  }

  const medMatch = text.match(/took\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/);
  if (medMatch) {
    observations.push({
      category: 'medication',
      metric: 'medication_taken',
      valueText: medMatch[2].trim(),
      valueNumber: Number(medMatch[1]),
      unit: 'dose',
      confidence: 0.7,
    });
  }

  for (const keyword of symptomKeywords) {
    if (text.includes(keyword)) {
      observations.push({
        category: 'symptom',
        metric: keyword,
        valueText: keyword,
        valueNumber: null,
        unit: null,
        confidence: 0.7,
      });
    }
  }

  return observations;
}
