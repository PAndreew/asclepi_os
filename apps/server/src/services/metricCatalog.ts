export type MetricValueType = 'number' | 'text' | 'boolean';

export interface MetricDefinitionSeed {
  metricKey: string;
  displayName: string;
  category: string;
  valueType: MetricValueType;
  canonicalUnit: string | null;
  description: string;
  alertEnabled: boolean;
  aliases: string[];
}

export interface AlertRuleSeed {
  ruleKey: string;
  title: string;
  description: string;
  level: 'info' | 'attention' | 'urgent';
  metricKey: string | null;
}

export const metricDefinitionSeeds: MetricDefinitionSeed[] = [
  {
    metricKey: 'sleep_hours',
    displayName: 'Sleep duration',
    category: 'sleep',
    valueType: 'number',
    canonicalUnit: 'hours',
    description: 'Total sleep duration reported by the user.',
    alertEnabled: true,
    aliases: ['sleep', 'sleep hours', 'hours sleep', 'slept'],
  },
  {
    metricKey: 'blood_pressure_systolic',
    displayName: 'Blood pressure systolic',
    category: 'vitals',
    valueType: 'number',
    canonicalUnit: 'mmHg',
    description: 'Upper blood pressure value.',
    alertEnabled: true,
    aliases: ['systolic blood pressure', 'bp systolic', 'blood pressure systolic'],
  },
  {
    metricKey: 'blood_pressure_diastolic',
    displayName: 'Blood pressure diastolic',
    category: 'vitals',
    valueType: 'number',
    canonicalUnit: 'mmHg',
    description: 'Lower blood pressure value.',
    alertEnabled: true,
    aliases: ['diastolic blood pressure', 'bp diastolic', 'blood pressure diastolic'],
  },
  {
    metricKey: 'temperature',
    displayName: 'Body temperature',
    category: 'vitals',
    valueType: 'number',
    canonicalUnit: 'C',
    description: 'Body temperature normalized to Celsius where possible.',
    alertEnabled: true,
    aliases: ['temp', 'temperature', 'body temperature'],
  },
  {
    metricKey: 'medication_taken',
    displayName: 'Medication taken',
    category: 'medication',
    valueType: 'text',
    canonicalUnit: null,
    description: 'Medication dose or medication note captured from check-in text.',
    alertEnabled: false,
    aliases: ['medication', 'took medication', 'medication taken'],
  },
  {
    metricKey: 'headache_present',
    displayName: 'Headache present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Headache mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['headache'],
  },
  {
    metricKey: 'nausea_present',
    displayName: 'Nausea present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Nausea mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['nausea'],
  },
  {
    metricKey: 'dizziness_present',
    displayName: 'Dizziness present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Dizziness mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['dizzy', 'dizziness'],
  },
  {
    metricKey: 'fatigue_present',
    displayName: 'Fatigue present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Fatigue mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['fatigue', 'tired'],
  },
  {
    metricKey: 'cough_present',
    displayName: 'Cough present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Cough mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['cough'],
  },
  {
    metricKey: 'fever_present',
    displayName: 'Fever present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Fever mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['fever'],
  },
  {
    metricKey: 'pain_present',
    displayName: 'Pain present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Pain mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['pain'],
  },
  {
    metricKey: 'anxiety_present',
    displayName: 'Anxiety present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Anxiety mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['anxiety'],
  },
  {
    metricKey: 'stress_present',
    displayName: 'Stress present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Stress mentioned in the check-in.',
    alertEnabled: false,
    aliases: ['stress'],
  },
  {
    metricKey: 'chest_pain_present',
    displayName: 'Chest pain present',
    category: 'symptom',
    valueType: 'boolean',
    canonicalUnit: null,
    description: 'Chest pain or discomfort mentioned in the check-in.',
    alertEnabled: true,
    aliases: ['chest pain', 'chest tightness', 'chest pressure', 'chest discomfort'],
  },
  {
    metricKey: 'ferritin',
    displayName: 'Ferritin',
    category: 'lab',
    valueType: 'number',
    canonicalUnit: 'ug/L',
    description: 'Ferritin lab measurement.',
    alertEnabled: false,
    aliases: ['ferritin'],
  },
  {
    metricKey: 'granulocyte_count',
    displayName: 'Granulocyte count',
    category: 'lab',
    valueType: 'number',
    canonicalUnit: '10^9/L',
    description: 'Granulocyte lab measurement.',
    alertEnabled: false,
    aliases: ['granulocyte count', 'granulocytes', 'gran count'],
  },
];

export const alertRuleSeeds: AlertRuleSeed[] = [
  {
    ruleKey: 'bp_urgent_crisis',
    title: 'Very high blood pressure reading',
    description: 'Urgent flag for very high blood pressure values.',
    level: 'urgent',
    metricKey: 'blood_pressure_systolic',
  },
  {
    ruleKey: 'bp_attention_elevated',
    title: 'Blood pressure above common threshold',
    description: 'Attention flag for elevated blood pressure values.',
    level: 'attention',
    metricKey: 'blood_pressure_systolic',
  },
  {
    ruleKey: 'temperature_attention_high',
    title: 'High temperature logged',
    description: 'Attention flag for high body temperature.',
    level: 'attention',
    metricKey: 'temperature',
  },
  {
    ruleKey: 'sleep_info_low',
    title: 'Very low sleep duration',
    description: 'Informational flag for very low sleep duration.',
    level: 'info',
    metricKey: 'sleep_hours',
  },
  {
    ruleKey: 'symptom_urgent_chest_pain',
    title: 'Chest pain mentioned',
    description: 'Urgent flag when chest pain terms are mentioned.',
    level: 'urgent',
    metricKey: 'chest_pain_present',
  },
];

const aliasToMetricMap: Record<string, string> = {};
for (const metric of metricDefinitionSeeds) {
  aliasToMetricMap[metric.metricKey] = metric.metricKey;
  for (const alias of metric.aliases) {
    aliasToMetricMap[normalizeMetricLabel(alias)] = metric.metricKey;
  }
}

export function normalizeMetricLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function resolveKnownMetric(label: string): string | null {
  const normalized = normalizeMetricLabel(label);
  return aliasToMetricMap[normalized] || null;
}

export function getMetricSeed(metricKey: string): MetricDefinitionSeed | undefined {
  return metricDefinitionSeeds.find(function (metric) {
    return metric.metricKey === metricKey;
  });
}
