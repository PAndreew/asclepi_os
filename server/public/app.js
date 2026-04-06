async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  return response.json();
}

function byId(id) {
  return document.getElementById(id);
}

function renderJson(id, value) {
  byId(id).textContent = JSON.stringify(value, null, 2);
}

async function submitCheckin() {
  const payload = {
    period: byId('period').value,
    rawText: byId('rawText').value,
  };
  const result = await jsonFetch('/api/checkins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  renderJson('checkinResult', result);
  await loadDashboard();
}

async function saveReminders() {
  const morning = await jsonFetch('/api/reminders', {
    method: 'POST',
    body: JSON.stringify({ period: 'morning', timeOfDay: byId('morningTime').value, enabled: true }),
  });
  const evening = await jsonFetch('/api/reminders', {
    method: 'POST',
    body: JSON.stringify({ period: 'evening', timeOfDay: byId('eveningTime').value, enabled: true }),
  });
  renderJson('reminderResult', { morning, evening });
  await loadDashboard();
}

async function uploadDocument() {
  const file = byId('docFile').files[0];
  if (!file) {
    renderJson('documentResult', { error: 'Choose a file first.' });
    return;
  }
  const form = new FormData();
  form.append('file', file);
  form.append('note', byId('docNote').value || '');
  const response = await fetch('/api/documents', { method: 'POST', body: form });
  const result = await response.json();
  renderJson('documentResult', result);
  await loadDashboard();
}

function renderList(containerId, items, formatter) {
  const container = byId(containerId);
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p class="muted">Nothing yet.</p>';
    return;
  }
  items.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = formatter(item);
    container.appendChild(el);
  });
}

async function loadDashboard() {
  const data = await jsonFetch('/api/dashboard');
  const counts = data.summary.counts || {};
  byId('dashboardCounts').innerHTML = `
    <div class="stat"><span>${counts.entry_count || 0}</span><label>Entries</label></div>
    <div class="stat"><span>${counts.observation_count || 0}</span><label>Observations</label></div>
    <div class="stat"><span>${counts.alert_count || 0}</span><label>Alerts</label></div>
    <div class="stat"><span>${counts.document_count || 0}</span><label>Documents</label></div>
  `;

  renderList('alerts', data.alerts || [], (a) => `
    <strong>${a.level.toUpperCase()}</strong>
    <div>${a.title}</div>
    <small>${a.detail}</small>
  `);

  renderList('entries', data.entries || [], (e) => `
    <strong>${e.period}</strong>
    <div>${e.raw_text}</div>
    <small>${e.created_at}</small>
  `);
}

document.addEventListener('DOMContentLoaded', () => {
  byId('submitCheckin').addEventListener('click', submitCheckin);
  byId('saveReminders').addEventListener('click', saveReminders);
  byId('uploadDocument').addEventListener('click', uploadDocument);
  byId('refreshDashboard').addEventListener('click', loadDashboard);
  loadDashboard();
});
