import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  const uri = env.NODE_ENV === 'test' ? 'mongodb://127.0.0.1:27017/onesociety_test' : env.MONGODB_URI;
  try {
    await mongoose.connect(uri);
    console.log(`Connected to MongoDB at ${uri}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
