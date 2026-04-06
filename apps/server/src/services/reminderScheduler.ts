import { db } from '../lib/db.js';

let lastCheckedMinute = '';

export function startReminderScheduler() {
  setInterval(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentMinute = `${hh}:${mm}`;

    if (currentMinute === lastCheckedMinute) {
      return;
    }

    lastCheckedMinute = currentMinute;
    const reminders = db.prepare(
      'SELECT label, schedule_time as scheduleTime, period FROM reminders WHERE enabled = 1'
    ).all() as Array<{ label: string; scheduleTime: string; period: string }>;

    for (const reminder of reminders) {
      if (reminder.scheduleTime === currentMinute) {
        console.log(`[reminder] ${reminder.label} (${reminder.period})`);
      }
    }
  }, 15_000);
}
