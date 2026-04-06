import type { ExtractedObservation } from './extract.js';

export type DerivedAlert = {
  level: 'info' | 'attention' | 'urgent';
  title: string;
  detail: string;
};

export function deriveAlerts(observations: ExtractedObservation[]): DerivedAlert[] {
  const alerts: DerivedAlert[] = [];
  const systolic = observations.find((o) => o.label === 'blood_pressure_systolic')?.valueNumber;
  const diastolic = observations.find((o) => o.label === 'blood_pressure_diastolic')?.valueNumber;
  const temperature = observations.find((o) => o.label === 'temperature')?.valueNumber;
  const sleepHours = observations.find((o) => o.label === 'sleep_hours')?.valueNumber;
  const hasChestPain = observations.some((o) => o.label === 'pain');

  if (typeof systolic === 'number' && typeof diastolic === 'number') {
    if (systolic >= 180 || diastolic >= 120) {
      alerts.push({
        level: 'urgent',
        title: 'Very high blood pressure reading',
        detail: `Logged blood pressure was ${systolic}/${diastolic}. Consider urgent medical advice, especially if you also feel unwell.`
      });
    } else if (systolic >= 140 || diastolic >= 90) {
      alerts.push({
        level: 'attention',
        title: 'Blood pressure above common threshold',
        detail: `Logged blood pressure was ${systolic}/${diastolic}. Track follow-up readings and discuss persistent elevation with a clinician.`
      });
    }
  }

  if (typeof temperature === 'number' && temperature >= 39) {
    alerts.push({
      level: 'attention',
      title: 'High temperature logged',
      detail: `Temperature was recorded as ${temperature}°. Monitor symptoms and seek care if it persists or worsens.`
    });
  }

  if (typeof sleepHours === 'number' && sleepHours < 4) {
    alerts.push({
      level: 'info',
      title: 'Very low sleep duration',
      detail: `Only ${sleepHours} hours of sleep were logged. This can affect symptoms, mood, and concentration.`
    });
  }

  if (hasChestPain) {
    alerts.push({
      level: 'urgent',
      title: 'Pain symptom recorded',
      detail: 'Pain was mentioned in the check-in. If this includes chest pain, breathing difficulty, or severe symptoms, seek urgent medical care.'
    });
  }

  return alerts;
}
