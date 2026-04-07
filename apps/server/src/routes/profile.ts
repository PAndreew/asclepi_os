import { Router } from 'express';
import { db } from '../lib/db.js';

export const profileRouter = Router();

profileRouter.get('/', (_req, res) => {
  const row = db.prepare('SELECT * FROM profile WHERE id = 1').get() as Record<string, string> | undefined;
  if (!row) {
    res.json({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
    return;
  }
  res.json({
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    email: row.email,
  });
});

profileRouter.put('/', (req, res) => {
  const { firstName = '', lastName = '', dateOfBirth = '', email = '' } = req.body as {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    email?: string;
  };

  db.prepare(`
    INSERT INTO profile (id, first_name, last_name, date_of_birth, email, updated_at)
    VALUES (1, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      date_of_birth = excluded.date_of_birth,
      email = excluded.email,
      updated_at = excluded.updated_at
  `).run(firstName, lastName, dateOfBirth, email);

  res.json({ ok: true });
});
