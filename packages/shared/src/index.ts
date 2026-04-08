export type CheckInPeriod = 'morning' | 'evening' | 'freeform';

export interface RawEntry {
  id: number;
  period: CheckInPeriod;
  rawText: string;
  source: 'chat' | 'checkin' | 'upload';
  createdAt: string;
}

export interface Observation {
  id: number;
  rawEntryId: number;
  category: string;
  metric: string;
  metricDisplayName?: string;
  sourceMetricLabel?: string | null;
  valueType?: 'number' | 'text' | 'boolean';
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean?: boolean | null;
  unit: string | null;
  unitOriginal?: string | null;
  confidence: number;
  status?: string;
  provenanceJson?: string | null;
  observedAt?: string;
  createdAt: string;
}

export type StructuredObservation = Observation;

export interface MetricDefinition {
  metricKey: string;
  displayName: string;
  category: string;
  valueType: 'number' | 'text' | 'boolean';
  canonicalUnit: string | null;
  description: string;
  alertEnabled: boolean;
  aliasCount?: number;
}

export interface MetricAlias {
  id: number;
  alias: string;
  normalizedAlias: string;
  metricKey: string;
  sourceType: string;
  createdAt: string;
}

export interface MetricCandidate {
  id: number;
  rawEntryId: number;
  candidateLabel: string;
  normalizedKey: string;
  sampleValueText: string | null;
  sampleUnit: string | null;
  reason: string;
  confidence: number;
  status: string;
  provenanceJson?: string | null;
  createdAt: string;
}

export interface AlertRecord {
  id: number;
  rawEntryId: number | null;
  level: 'info' | 'attention' | 'urgent';
  title: string;
  body: string;
  ruleKey?: string | null;
  metricKey?: string | null;
  provenanceJson?: string | null;
  createdAt: string;
}

export interface Reminder {
  id: number;
  label: string;
  scheduleTime: string;
  period: CheckInPeriod;
  enabled: boolean;
}

export interface DocumentRecord {
  id: number;
  originalName: string;
  mimeType: string;
  extractionStatus: 'pending' | 'processing' | 'done' | 'error';
  createdAt: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
}

export interface HealthSummary {
  entriesLast7Days: number;
  observationsLast7Days: number;
  symptomMentionsLast7Days: number;
  averageSleepHoursLast7Days: number | null;
  pendingMetricCandidates?: number;
}
