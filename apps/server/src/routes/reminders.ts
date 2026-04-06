import { Router } from 'express';
import { db } from '../lib/db.js';

export const remindersRouter = Router();

remindersRouter.get('/', (_req, res) => {
  const reminders = db.prepare(
    'SELECT id, label, schedule_time as scheduleTime, period, enabled FROM reminders ORDER BY schedule_time ASC'
  ).all();
  res.json(reminders);
});

remindersRouter.post('/', (req, res) => {
  const { label, scheduleTime, period } = req.body as {
    label?: string;
    scheduleTime?: string;
    period?: string;
  };

  if (!label || !scheduleTime || !period) {
    return res.status(400).json({ error: 'label, scheduleTime and period are required' });
  }

  const result = db.prepare(
    'INSERT INTO reminders (label, schedule_time, period, enabled) VALUES (?, ?, ?, 1)'
  ).run(label, scheduleTime, period);

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});
