import { Router } from 'express';
import multer from 'multer';
import { storageService } from './storage.service.js';
import { authenticate } from '../auth/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export const fileRouter = Router();

fileRouter.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const saved = await storageService.saveFile(req.file.buffer, req.file.originalname);
    res.status(201).json({ success: true, file: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

fileRouter.get('/:fileName', (req, res) => {
  try {
    const filePath = storageService.getFilePath(req.params.fileName);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});
