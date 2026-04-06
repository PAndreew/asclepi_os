import type { ExtractedObservation } from './extractor.js';

export interface DerivedAlert {
  level: 'info' | 'attention' | 'urgent';
  title: string;
  body: string;
}

const CHEST_PAIN_TERMS = ['chest pain', 'chest tightness', 'chest pressure', 'chest discomfort'];

export function deriveAlerts(observations: ExtractedObservation[], rawText: string): DerivedAlert[] {
  const alerts: DerivedAlert[] = [];
  const lower = rawText.toLowerCase();

  const systolic = observations.find((o) => o.metric === 'blood_pressure_systolic')?.valueNumber;
  const diastolic = observations.find((o) => o.metric === 'blood_pressure_diastolic')?.valueNumber;
  const tempObs = observations.find((o) => o.metric === 'temperature');
  const sleepHours = observations.find((o) => o.metric === 'sleep_hours')?.valueNumber;
  const hasChestPain = CHEST_PAIN_TERMS.some((term) => lower.includes(term));

  if (typeof systolic === 'number' && typeof diastolic === 'number') {
    if (systolic >= 180 || diastolic >= 120) {
      alerts.push({
        level: 'urgent',
        title: 'Very high blood pressure reading',
        body: `Logged blood pressure was ${systolic}/${diastolic} mmHg. Consider urgent medical advice, especially if you also feel unwell.`,
      });
    } else if (systolic >= 140 || diastolic >= 90) {
      alerts.push({
        level: 'attention',
        title: 'Blood pressure above common threshold',
        body: `Logged blood pressure was ${systolic}/${diastolic} mmHg. Track follow-up readings and discuss persistent elevation with a clinician.`,
      });
    }
  }

  if (tempObs?.valueNumber !== undefined) {
    const { valueNumber: temp, unit } = tempObs;
    const tempC = unit === 'F' ? (temp - 32) * (5 / 9) : temp;
    if (tempC >= 39) {
      alerts.push({
        level: 'attention',
        title: 'High temperature logged',
        body: `Temperature was recorded as ${temp}°${unit ?? 'C'}. Monitor symptoms and seek care if it persists or worsens.`,
      });
    }
  }

  if (typeof sleepHours === 'number' && sleepHours < 4) {
    alerts.push({
      level: 'info',
      title: 'Very low sleep duration',
      body: `Only ${sleepHours} hours of sleep were logged. This can affect symptoms, mood, and concentration.`,
    });
  }

  if (hasChestPain) {
    alerts.push({
      level: 'urgent',
      title: 'Chest pain mentioned',
      body: 'Chest pain or discomfort was mentioned in the check-in. If symptoms are severe or accompanied by breathing difficulty, seek urgent medical care.',
    });
  }

  return alerts;
}
