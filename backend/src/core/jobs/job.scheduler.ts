import cron from 'node-cron';
import { QRPass } from '../models/qr_pass.model.js';

export type JobHandler = () => Promise<void>;

export class JobScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  public init(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run every minute: check QR Pass Expiry
    this.registerJob('qr_pass_expiry', '* * * * *', async () => {
      const now = new Date();
      await QRPass.updateMany(
        {
          status: 'ACTIVE',
          expiresAt: { $lt: now },
        },
        {
          $set: { status: 'EXPIRED' },
        }
      );
    });

    console.log('Background Job Scheduler initialized with idempotent tasks.');
  }

  public registerJob(name: string, cronExpression: string, handler: JobHandler): void {
    if (this.jobs.has(name)) {
      this.jobs.get(name)?.stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        await handler();
      } catch (err) {
        console.error(`Error executing background job ${name}:`, err);
      }
    });

    this.jobs.set(name, task);
  }

  public stopAll(): void {
    for (const [name, task] of this.jobs.entries()) {
      task.stop();
    }
    this.jobs.clear();
    this.isRunning = false;
  }
}

export const jobScheduler = new JobScheduler();
