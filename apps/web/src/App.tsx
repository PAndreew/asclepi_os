import { useEffect, useState } from 'react';
import type { DocumentRecord, HealthSummary, RawEntry, Reminder, StructuredObservation } from '@asclepios/shared';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8787/api';

export function App() {
  const [rawText, setRawText] = useState('I slept 7 hours, mild headache in the morning, blood pressure 128 over 82.');
  const [period, setPeriod] = useState<'morning' | 'evening' | 'freeform'>('morning');
  const [entries, setEntries] = useState<RawEntry[]>([]);
  const [observations, setObservations] = useState<StructuredObservation[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [lastSummary, setLastSummary] = useState('');
  const [submitError, setSubmitError] = useState('');

  async function loadData() {
    const [entriesRes, observationsRes, summaryRes, remindersRes, documentsRes] = await Promise.all([
      fetch(`${API_BASE}/checkins`),
      fetch(`${API_BASE}/observations`),
      fetch(`${API_BASE}/reports/summary`),
      fetch(`${API_BASE}/reminders`),
      fetch(`${API_BASE}/documents`),
    ]);

    setEntries(await entriesRes.json());
    setObservations(await observationsRes.json());
    setSummary(await summaryRes.json());
    setReminders(await remindersRes.json());
    setDocuments(await documentsRes.json());
  }

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  async function submitCheckIn() {
    setSubmitError('');
    try {
      const response = await fetch(`${API_BASE}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, period, source: 'checkin' }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        setSubmitError(err.error ?? `Server error ${response.status}`);
        return;
      }

      const data = await response.json() as { summary?: string };
      setLastSummary(data.summary || 'Saved.');
      setRawText('');
      await loadData();
    } catch (err) {
      setSubmitError('Could not reach the server. Is it running?');
    }
  }

  async function uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    await loadData();
  }

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <h1>Asclepios</h1>
          <p>Local-first personal health tracking and analysis.</p>
        </div>
        <div className="badge">Phase 1 MVP</div>
      </header>

      <section className="grid two">
        <div className="card">
          <h2>Daily check-in</h2>
          <label>
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="freeform">Freeform</option>
            </select>
          </label>
          <label>
            Raw entry
            <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={6} />
          </label>
          <button onClick={submitCheckIn}>Save check-in</button>
          {lastSummary && <p className="muted"><strong>Agent summary:</strong> {lastSummary}</p>}
          {submitError && <p className="muted" style={{ color: 'red' }}>{submitError}</p>}
        </div>

        <div className="card">
          <h2>Weekly snapshot</h2>
          {summary ? (
            <ul className="stats">
              <li><strong>{summary.entriesLast7Days}</strong><span>entries</span></li>
              <li><strong>{summary.observationsLast7Days}</strong><span>observations</span></li>
              <li><strong>{summary.symptomMentionsLast7Days}</strong><span>symptom mentions</span></li>
              <li><strong>{summary.averageSleepHoursLast7Days ?? '—'}</strong><span>avg sleep hours</span></li>
            </ul>
          ) : (
            <p>Loading…</p>
          )}
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Reminders</h2>
          <ul>
            {reminders.map((reminder) => (
              <li key={reminder.id}>{reminder.scheduleTime} — {reminder.label}</li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Documents</h2>
          <input type="file" accept="application/pdf,image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadDocument(file).catch(console.error);
          }} />
          <ul>
            {documents.map((document) => (
              <li key={document.id}>{document.originalName} — {document.extractionStatus}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Recent entries</h2>
          <ul className="timeline">
            {entries.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.period}</strong>
                <span>{entry.createdAt}</span>
                <p>{entry.rawText}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Extracted observations</h2>
          <ul className="timeline">
            {observations.map((observation) => (
              <li key={observation.id}>
                <strong>{observation.metric}</strong>
                <span>{observation.createdAt}</span>
                <p>
                  {observation.valueNumber ?? observation.valueText ?? 'not set'}
                  {observation.unit ? ` ${observation.unit}` : ''}
                  {' '}· confidence {Math.round(observation.confidence * 100)}%
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
