import type { ExtractedObservation } from './extractor.js';

export interface DerivedAlert {
  level: 'info' | 'attention' | 'urgent';
  title: string;
  body: string;
  ruleKey: string;
  metricKey: string | null;
  provenance: Record<string, unknown>;
}

const CHEST_PAIN_TERMS = ['chest pain', 'chest tightness', 'chest pressure', 'chest discomfort'];

export function deriveAlerts(observations: ExtractedObservation[], rawText: string): DerivedAlert[] {
  const alerts: DerivedAlert[] = [];
  const lower = rawText.toLowerCase();

  const systolic = observations.find(function (observation) {
    return observation.metricKey === 'blood_pressure_systolic';
  })?.valueNumber;
  const diastolic = observations.find(function (observation) {
    return observation.metricKey === 'blood_pressure_diastolic';
  })?.valueNumber;
  const temperature = observations.find(function (observation) {
    return observation.metricKey === 'temperature';
  })?.valueNumber;
  const sleepHours = observations.find(function (observation) {
    return observation.metricKey === 'sleep_hours';
  })?.valueNumber;
  const hasChestPain = CHEST_PAIN_TERMS.some(function (term) {
    return lower.includes(term);
  });

  if (typeof systolic === 'number' && typeof diastolic === 'number') {
    if (systolic >= 180 || diastolic >= 120) {
      alerts.push({
        level: 'urgent',
        title: 'Very high blood pressure reading',
        body: `Logged blood pressure was ${systolic}/${diastolic} mmHg. Consider urgent medical advice, especially if you also feel unwell.`,
        ruleKey: 'bp_urgent_crisis',
        metricKey: 'blood_pressure_systolic',
        provenance: {
          thresholds: { systolic: 180, diastolic: 120 },
          observed: { systolic, diastolic },
          source: 'deterministic_rule',
        },
      });
    } else if (systolic >= 140 || diastolic >= 90) {
      alerts.push({
        level: 'attention',
        title: 'Blood pressure above common threshold',
        body: `Logged blood pressure was ${systolic}/${diastolic} mmHg. Track follow-up readings and discuss persistent elevation with a clinician.`,
        ruleKey: 'bp_attention_elevated',
        metricKey: 'blood_pressure_systolic',
        provenance: {
          thresholds: { systolic: 140, diastolic: 90 },
          observed: { systolic, diastolic },
          source: 'deterministic_rule',
        },
      });
    }
  }

  if (typeof temperature === 'number' && temperature >= 39) {
    alerts.push({
      level: 'attention',
      title: 'High temperature logged',
      body: `Temperature was normalized to ${temperature}°C. Monitor symptoms and seek care if it persists or worsens.`,
      ruleKey: 'temperature_attention_high',
      metricKey: 'temperature',
      provenance: {
        thresholdCelsius: 39,
        observedCelsius: temperature,
        source: 'deterministic_rule',
      },
    });
  }

  if (typeof sleepHours === 'number' && sleepHours < 4) {
    alerts.push({
      level: 'info',
      title: 'Very low sleep duration',
      body: `Only ${sleepHours} hours of sleep were logged. This can affect symptoms, mood, and concentration.`,
      ruleKey: 'sleep_info_low',
      metricKey: 'sleep_hours',
      provenance: {
        thresholdHours: 4,
        observedHours: sleepHours,
        source: 'deterministic_rule',
      },
    });
  }

  if (hasChestPain) {
    alerts.push({
      level: 'urgent',
      title: 'Chest pain mentioned',
      body: 'Chest pain or discomfort was mentioned in the check-in. If symptoms are severe or accompanied by breathing difficulty, seek urgent medical care.',
      ruleKey: 'symptom_urgent_chest_pain',
      metricKey: 'chest_pain_present',
      provenance: {
        matchedTerms: CHEST_PAIN_TERMS.filter(function (term) {
          return lower.includes(term);
        }),
        source: 'deterministic_rule',
      },
    });
  }

  return alerts;
}
