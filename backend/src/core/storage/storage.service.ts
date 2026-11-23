import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env.js';

export interface UploadedFileResult {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  filePath: string;
}

// Magic bytes definitions
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
};

export class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public validateMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
    if (buffer.length < 8) {
      return { valid: false };
    }

    // Check PNG
    if (MAGIC_BYTES['image/png'].every((byte, idx) => buffer[idx] === byte)) {
      return { valid: true, detectedMime: 'image/png' };
    }

    // Check JPEG
    if (MAGIC_BYTES['image/jpeg'].every((byte, idx) => buffer[idx] === byte)) {
      return { valid: true, detectedMime: 'image/jpeg' };
    }

    // Check PDF
    if (MAGIC_BYTES['application/pdf'].every((byte, idx) => buffer[idx] === byte)) {
      return { valid: true, detectedMime: 'application/pdf' };
    }

    // Check WEBP (RIFF .... WEBP)
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { valid: true, detectedMime: 'image/webp' };
    }

    return { valid: false };
  }

  public async saveFile(buffer: Buffer, originalName: string, maxSize = 10 * 1024 * 1024): Promise<UploadedFileResult> {
    if (buffer.length > maxSize) {
      throw new Error(`File size ${buffer.length} exceeds allowed maximum of ${maxSize} bytes.`);
    }

    const validation = this.validateMagicBytes(buffer);
    if (!validation.valid || !validation.detectedMime) {
      throw new Error('Invalid file type detected. Only JPEG, PNG, WEBP, and PDF files are accepted.');
    }

    const fileId = crypto.randomUUID();
    const ext = validation.detectedMime === 'application/pdf' ? 'pdf' : validation.detectedMime.split('/')[1];
    const safeFileName = `${fileId}.${ext}`;
    const destinationPath = path.join(this.uploadDir, safeFileName);

    await fs.promises.writeFile(destinationPath, buffer);

    return {
      fileId,
      originalName: path.basename(originalName).replace(/[^a-zA-Z0-9.-]/g, '_'),
      mimeType: validation.detectedMime,
      size: buffer.length,
      url: `/api/v1/files/${safeFileName}`,
      filePath: destinationPath,
    };
  }

  public getFilePath(fileName: string): string {
    const safeName = path.basename(fileName);
    const fullPath = path.join(this.uploadDir, safeName);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }
    return fullPath;
  }
}

export const storageService = new StorageService();
