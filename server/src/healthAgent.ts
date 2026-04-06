import type { HealthDb } from './db.js';
import { deriveAlerts } from './alerts.js';
import { extractObservations } from './extract.js';
import { ModelGateway } from './modelGateway.js';

export class HealthAgent {
  constructor(
    private readonly db: HealthDb,
    private readonly modelGateway: ModelGateway,
  ) {}

  async ingestCheckin(period: 'morning' | 'evening' | 'ad_hoc', rawText: string) {
    const rawEntryId = this.db.insertRawEntry({ period, rawText });
    const extracted = extractObservations(rawText);
    for (const obs of extracted) {
      this.db.insertObservation({
        rawEntryId,
        kind: obs.kind,
        label: obs.label,
        valueText: obs.valueText,
        valueNumber: obs.valueNumber,
        unit: obs.unit,
        severity: obs.severity,
        confidence: obs.confidence,
      });
    }

    const alerts = deriveAlerts(extracted);
    for (const alert of alerts) {
      this.db.insertAlert({ rawEntryId, level: alert.level, title: alert.title, detail: alert.detail });
    }

    const summary = await this.modelGateway.summarizeHealthEntry(rawText);

    return {
      rawEntryId,
      extracted,
      alerts,
      summary,
    };
  }

  getDashboard() {
    return {
      summary: this.db.getSummary(),
      entries: this.db.getRecentEntries(10),
      observations: this.db.getRecentObservations(20),
      alerts: this.db.getRecentAlerts(10),
      reminders: this.db.getReminders(),
    };
  }
}
