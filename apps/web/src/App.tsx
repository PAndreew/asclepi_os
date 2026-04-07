import { useEffect, useMemo, useState } from 'react';
import type { DocumentRecord, HealthSummary, RawEntry, Reminder, StructuredObservation, UserProfile } from '@asclepios/shared';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8787/api';

type Page = 'home' | 'journal' | 'insights' | 'profile';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function periodLabel(period: RawEntry['period']) {
  if (period === 'freeform') return 'Open note';
  return period.charAt(0).toUpperCase() + period.slice(1);
}

export function App() {
  const [page, setPage] = useState<Page>('home');
  const [rawText, setRawText] = useState('I slept 7 hours, mild headache in the morning, blood pressure 128 over 82.');
  const [period, setPeriod] = useState<'morning' | 'evening' | 'freeform'>('morning');
  const [entries, setEntries] = useState<RawEntry[]>([]);
  const [observations, setObservations] = useState<StructuredObservation[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
  const [profileDraft, setProfileDraft] = useState<UserProfile>({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [lastSummary, setLastSummary] = useState('');
  const [submitError, setSubmitError] = useState('');

  async function loadData() {
    const [entriesRes, observationsRes, summaryRes, remindersRes, documentsRes, profileRes] = await Promise.all([
      fetch(`${API_BASE}/checkins`),
      fetch(`${API_BASE}/observations`),
      fetch(`${API_BASE}/reports/summary`),
      fetch(`${API_BASE}/reminders`),
      fetch(`${API_BASE}/documents`),
      fetch(`${API_BASE}/profile`),
    ]);

    const loadedEntries = await entriesRes.json() as RawEntry[];
    const loadedObservations = await observationsRes.json() as StructuredObservation[];
    const loadedSummary = await summaryRes.json() as HealthSummary;
    const loadedReminders = await remindersRes.json() as Reminder[];
    const loadedDocuments = await documentsRes.json() as DocumentRecord[];
    const loadedProfile = await profileRes.json() as UserProfile;

    setEntries(loadedEntries.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    setObservations(loadedObservations.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    setSummary(loadedSummary);
    setReminders(loadedReminders);
    setDocuments(loadedDocuments.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    setProfile(loadedProfile);
    setProfileDraft(loadedProfile);
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
      setPage('journal');
      await loadData();
    } catch {
      setSubmitError('Could not reach the server. Is it running?');
    }
  }

  async function saveProfile() {
    await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileDraft),
    });
    setProfile(profileDraft);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
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

  const latestObservation = observations[0];
  const latestEntry = entries[0];

  const activityData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        count: 0,
      };
    });

    for (const entry of entries) {
      const key = new Date(entry.createdAt).toISOString().slice(0, 10);
      const day = days.find((item) => item.key === key);
      if (day) day.count += 1;
    }

    const maxCount = Math.max(1, ...days.map((item) => item.count));
    return days.map((item) => ({
      ...item,
      height: `${28 + (item.count / maxCount) * 92}px`,
    }));
  }, [entries]);

  const topMetrics = useMemo(() => observations.slice(0, 6), [observations]);

  const greeting = profile.firstName ? `Hi, ${profile.firstName}!` : 'Hi there!';

  return (
    <div className="app-shell">

        <header className="navbar">
          <span className="nav-logo">Asclepios</span>
          <div className="topbar-icons">
            <button className="icon-button" aria-label="Profile" onClick={() => setPage('profile')}>◌</button>
            <button className="icon-button" aria-label="Notifications">◔</button>
          </div>
        </header>

        {page === 'home' && (
          <main className="page home-page">
            <h1 className="greeting">{greeting}</h1>

            <div className="stat-row">
              <div className="stat-tile">
                <span className="label">Entries</span>
                <strong>{summary?.entriesLast7Days ?? '—'}</strong>
                <span className="subtle">last 7 days</span>
              </div>
              <div className="stat-tile">
                <span className="label">Latest insight</span>
                <strong>
                  {latestObservation?.valueNumber ?? latestObservation?.valueText ?? 'Stable'}
                  {latestObservation?.unit ? ` ${latestObservation.unit}` : ''}
                </strong>
                <span className="subtle">{latestObservation?.metric ?? 'No observations yet'}</span>
              </div>
            </div>

            <section className="chat-card card-soft">
              <div className="section-heading">
                <div>
                  <h3>Daily check-in</h3>
                </div>
                <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="freeform">Freeform</option>
                </select>
              </div>

              <div className="chat-thread">
                <div className="chat-bubble assistant">
                  Tell me how your day feels so far — symptoms, sleep, mood, medication, or anything else you want to log.
                </div>
                {latestEntry && (
                  <div className="chat-bubble user">
                    <span className="bubble-meta">Last saved · {formatDateTime(latestEntry.createdAt)}</span>
                    {latestEntry.rawText}
                  </div>
                )}
              </div>

              <label className="input-label">
                Your note
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={5}
                  placeholder="I slept 7 hours, feel rested, and my headache is lighter than yesterday..."
                />
              </label>

              <div className="action-row">
                <button className="primary-button" onClick={submitCheckIn}>Save check-in</button>
                <button className="secondary-button" onClick={() => setPage('journal')}>Open journal</button>
              </div>

              {lastSummary && (
                <div className="status-card success">
                  <strong>Agent summary</strong>
                  <p>{lastSummary}</p>
                </div>
              )}
              {submitError && (
                <div className="status-card error">
                  <strong>Couldn&apos;t save</strong>
                  <p>{submitError}</p>
                </div>
              )}
            </section>

            <section className="home-grid">
              <div className="mini-card">
                <p className="eyebrow">Reminders</p>
                <ul className="simple-list compact-list">
                  {reminders.length ? reminders.map((reminder) => (
                    <li key={reminder.id}>
                      <strong>{reminder.scheduleTime}</strong>
                      <span>{reminder.label}</span>
                    </li>
                  )) : <li>No reminders yet.</li>}
                </ul>
              </div>

              <div className="mini-card accent-card">
                <p className="eyebrow">Weekly snapshot</p>
                <div className="summary-big">{summary?.symptomMentionsLast7Days ?? 0}</div>
                <p>symptom mentions noted in the last 7 days.</p>
              </div>
            </section>
          </main>
        )}

        {page === 'journal' && (
          <main className="page">
            <section className="section-card">
              <div className="section-heading journal-header">
                <div>
                  <p className="eyebrow">Journal</p>
                  <h2>Previous conversations</h2>
                </div>
                <span className="soft-pill">{entries.length} saved</span>
              </div>

              <div className="list-view">
                {entries.length ? entries.map((entry) => (
                  <article className="journal-item" key={entry.id}>
                    <div className="journal-topline">
                      <span className="soft-pill">{periodLabel(entry.period)}</span>
                      <span className="subtle">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p>{entry.rawText}</p>
                  </article>
                )) : (
                  <div className="empty-state">No conversations yet. Save a daily check-in from Home to start your journal.</div>
                )}
              </div>
            </section>
          </main>
        )}

        {page === 'insights' && (
          <main className="page insights-page">
            <section className="section-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Table & visualisation</p>
                  <h2>Health overview</h2>
                </div>
                <span className="soft-pill">Last 7 days</span>
              </div>

              <div className="metric-grid">
                <div className="metric-tile">
                  <span>Entries</span>
                  <strong>{summary?.entriesLast7Days ?? '—'}</strong>
                </div>
                <div className="metric-tile">
                  <span>Observations</span>
                  <strong>{summary?.observationsLast7Days ?? '—'}</strong>
                </div>
                <div className="metric-tile">
                  <span>Symptoms</span>
                  <strong>{summary?.symptomMentionsLast7Days ?? '—'}</strong>
                </div>
                <div className="metric-tile">
                  <span>Sleep average</span>
                  <strong>{summary?.averageSleepHoursLast7Days?.toFixed(1) ?? '—'}</strong>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-title-row">
                  <h3>Check-in activity</h3>
                  <span className="subtle">Past week</span>
                </div>
                <div className="mini-chart" aria-label="Weekly activity chart">
                  {activityData.map((item) => (
                    <div className="bar-group" key={item.key}>
                      <div className="bar" style={{ height: item.height }} title={`${item.label}: ${item.count} entries`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="table-card">
                <div className="chart-title-row">
                  <h3>Recent observations</h3>
                  <span className="subtle">Latest extracted metrics</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Confidence</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMetrics.length ? topMetrics.map((observation) => (
                        <tr key={observation.id}>
                          <td>{observation.metric}</td>
                          <td>
                            {observation.valueNumber ?? observation.valueText ?? '—'}
                            {observation.unit ? ` ${observation.unit}` : ''}
                          </td>
                          <td>{Math.round(observation.confidence * 100)}%</td>
                          <td>{formatDate(observation.createdAt)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4}>No observations yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="section-heading docs-heading">
                <h3>Documents</h3>
                <label className="upload-button">
                  Upload
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadDocument(file).catch(console.error);
                    }}
                  />
                </label>
              </div>
              <ul className="simple-list">
                {documents.length ? documents.map((document) => (
                  <li key={document.id}>
                    <div>
                      <strong>{document.originalName}</strong>
                      <span>{formatDateTime(document.createdAt)}</span>
                    </div>
                    <span className={`status-tag ${document.extractionStatus}`}>{document.extractionStatus}</span>
                  </li>
                )) : <li>No uploads yet.</li>}
              </ul>
            </section>
          </main>
        )}

        {page === 'profile' && (
          <main className="page">
            <section className="section-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Account</p>
                  <h2>Your profile</h2>
                </div>
              </div>

              <div className="profile-form">
                <label className="field-label">
                  First name
                  <input
                    type="text"
                    value={profileDraft.firstName}
                    onChange={(e) => setProfileDraft({ ...profileDraft, firstName: e.target.value })}
                    placeholder="Emma"
                  />
                </label>
                <label className="field-label">
                  Last name
                  <input
                    type="text"
                    value={profileDraft.lastName}
                    onChange={(e) => setProfileDraft({ ...profileDraft, lastName: e.target.value })}
                    placeholder="Johnson"
                  />
                </label>
                <label className="field-label">
                  Date of birth
                  <input
                    type="date"
                    value={profileDraft.dateOfBirth}
                    onChange={(e) => setProfileDraft({ ...profileDraft, dateOfBirth: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  Email
                  <input
                    type="email"
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                    placeholder="emma@example.com"
                  />
                </label>

                <button className="primary-button" onClick={saveProfile}>Save profile</button>

                {profileSaved && (
                  <div className="status-card success" style={{ marginTop: '14px' }}>
                    <strong>Saved</strong>
                    <p>Your profile has been updated.</p>
                  </div>
                )}
              </div>
            </section>
          </main>
        )}

        <nav className="bottom-nav" aria-label="Primary">
          <button className={page === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('home')}>
            <span className="nav-icon">⌂</span>
            <span>Home</span>
          </button>
          <button className={page === 'journal' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('journal')}>
            <span className="nav-icon">☰</span>
            <span>Journal</span>
          </button>
          <button className={page === 'insights' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('insights')}>
            <span className="nav-icon">▦</span>
            <span>Visualise</span>
          </button>
        </nav>
    </div>
  );
}
