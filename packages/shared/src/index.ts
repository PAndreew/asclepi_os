export type CheckInPeriod = 'morning' | 'evening' | 'freeform';

export interface RawEntry {
  id: number;
  period: CheckInPeriod;
  rawText: string;
  source: 'chat' | 'checkin' | 'upload';
  createdAt: string;
}

export interface StructuredObservation {
  id: number;
  rawEntryId: number;
  category: string;
  metric: string;
  valueText: string | null;
  valueNumber: number | null;
  unit: string | null;
  confidence: number;
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
}
