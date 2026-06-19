import { connectDB } from './config/db';
import { env } from './config/env';
import app from './app';

async function startWithDevFallback(): Promise<void> {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');
  } catch {
    if (env.NODE_ENV === 'production') throw new Error('Cannot connect to MongoDB in production.');

    console.log('MongoDB unavailable — starting in-memory server for development...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    await connectDB(mongod.getUri());
    console.log('Connected to in-memory MongoDB (dev mode).');

    const { seedData } = await import('./seed');
    await seedData();
    console.log('Dev database seeded — credentials: hr.admin@company.com / Password@123');

    process.on('SIGTERM', () => void mongod.stop());
    process.on('SIGINT', () => void mongod.stop());
  }
}

async function start(): Promise<void> {
  try {
    await startWithDevFallback();
    app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
