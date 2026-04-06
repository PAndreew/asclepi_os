import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { db } from '../lib/db.js';

const uploadsDir = path.resolve(process.cwd(), 'apps/server/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });
export const documentsRouter = Router();

documentsRouter.get('/', (_req, res) => {
  const documents = db.prepare(
    'SELECT id, original_name as originalName, mime_type as mimeType, extraction_status as extractionStatus, created_at as createdAt FROM documents ORDER BY id DESC'
  ).all();
  res.json(documents);
});

documentsRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file upload is required' });
  }

  const result = db.prepare(
    'INSERT INTO documents (original_name, mime_type, file_path, extraction_status) VALUES (?, ?, ?, ?)'
  ).run(req.file.originalname, req.file.mimetype, req.file.path, 'pending');

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    originalName: req.file.originalname,
    status: 'pending',
    message: 'Document stored. Extraction pipeline scaffold is ready for the next step.',
  });
});
