import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(uri?: string): Promise<void> {
  const mongoUri = uri || env.MONGODB_URI;
  await mongoose.connect(mongoUri);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
