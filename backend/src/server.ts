import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { socketService } from './core/socket/socket.service.js';
import { jobScheduler } from './core/jobs/job.scheduler.js';
import { seedDatabase } from './core/seed/seed.service.js';

async function bootstrap() {
  try {
    await connectDatabase();
    await seedDatabase();

    const app = createApp();
    const server = http.createServer(app);

    socketService.init(server);
    jobScheduler.init();

    server.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 OneSociety Backend Server running on port ${env.PORT}`);
      console.log(`🌐 Environment: ${env.NODE_ENV}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
