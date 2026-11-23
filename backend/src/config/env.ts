import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/onesociety'),
  JWT_SECRET: z.string().default('super_secret_jwt_access_key_onesociety_2026'),
  JWT_REFRESH_SECRET: z.string().default('super_secret_jwt_refresh_key_onesociety_2026'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  UPLOAD_DIR: z.string().default('./uploads'),
  AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
  AI_API_KEY: z.string().optional().default(''),
  SIMULATED_PAYMENTS: z.string().default('true').transform((val) => val === 'true'),
});

export const env = envSchema.parse(process.env);
