import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/core/seed/seed.service.js';
import { SHProviderProfile } from '../src/modules/service_hub/models/sh_provider_profile.model.js';
import { SHSlot } from '../src/modules/service_hub/models/sh_slot.model.js';
import { SHBooking } from '../src/modules/service_hub/models/sh_booking.model.js';
import { User } from '../src/core/models/user.model.js';

const app = createApp();

describe('Module 3: Service Hub', () => {
  let resident1Token: string;
  let resident2Token: string;
  let providerToken: string;
  let providerUserId: string;

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();

    // Resident 1 (A-101)
    const r1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543211', password: 'password123' });
    resident1Token = r1.body.accessToken;

    // Resident 2 (A-201)
    const r2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543212', password: 'password123' });
    resident2Token = r2.body.accessToken;

    // External Provider (Ramesh Electrician)
    const hash = await bcrypt.hash('password123', 10);
    await User.updateOne({ phone: '9876543230' }, { mustChangePassword: false, passwordHash: hash });
    const prov = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543230', password: 'password123' });
    providerToken = prov.body.accessToken;
    providerUserId = prov.body.user.id;
  });

  afterAll(async () => {
    await SHProviderProfile.deleteMany({});
    await SHSlot.deleteMany({});
    await SHBooking.deleteMany({});
    await disconnectDatabase();
  });

  it('1. Provider registers profile & skills', async () => {
    const res = await request(app)
      .post('/api/v1/service-hub/profile')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        skills: ['HOUSEMAID', 'CLEANING'],
        bio: 'Experienced home cleaning and housekeeping assistant',
        ratePerSlot: 400,
        providerType: 'EXTERNAL',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.skills).toContain('HOUSEMAID');
  });

  it('2. Fetch slots and book housemaid time slot with simulated escrow hold', async () => {
    // Generate/fetch slots for today
    const today = new Date().toISOString().slice(0, 10);
    const slotsRes = await request(app)
      .get(`/api/v1/service-hub/providers/${providerUserId}/slots?date=${today}&category=HOUSEMAID`)
      .set('Authorization', `Bearer ${resident1Token}`);

    expect(slotsRes.status).toBe(200);
    expect(slotsRes.body.slots.length).toBeGreaterThanOrEqual(4);

    const slotToBook = slotsRes.body.slots.find((s: any) => s.timeSlot === '08:00 - 09:00');
    expect(slotToBook).toBeDefined();

    // Resident 1 books slot
    const bookRes = await request(app)
      .post('/api/v1/service-hub/bookings')
      .set('Authorization', `Bearer ${resident1Token}`)
      .send({
        slotId: slotToBook._id,
        description: 'Living room and kitchen dusting & cleaning',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.booking.bookingId).toMatch(/^#SH-/);
    expect(bookRes.body.booking.status).toBe('REQUESTED');
    expect(bookRes.body.booking.escrowAmount).toBe(400);
    expect(bookRes.body.booking.escrowHoldId).toBeDefined();

    // 2b. Conflict Prevention: Resident 2 attempts to book the same slot -> rejected
    const conflictRes = await request(app)
      .post('/api/v1/service-hub/bookings')
      .set('Authorization', `Bearer ${resident2Token}`)
      .send({
        slotId: slotToBook._id,
        description: 'Conflict booking attempt',
      });

    expect(conflictRes.status).toBe(400);
    expect(conflictRes.body.message).toContain('already booked');
  });

  it('3. Provider accepts, starts, and completes service task', async () => {
    const listRes = await request(app)
      .get('/api/v1/service-hub/bookings')
      .set('Authorization', `Bearer ${providerToken}`);

    expect(listRes.status).toBe(200);
    const booking = listRes.body.bookings[0];
    expect(booking).toBeDefined();

    const encId = encodeURIComponent(booking.bookingId);
    // Accept
    const acceptRes = await request(app)
      .patch(`/api/v1/service-hub/bookings/${encId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'ACCEPTED' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.booking.status).toBe('ACCEPTED');

    // Start
    const inProgressRes = await request(app)
      .patch(`/api/v1/service-hub/bookings/${encId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(inProgressRes.status).toBe(200);
    expect(inProgressRes.body.booking.status).toBe('IN_PROGRESS');

    // Complete
    const completeRes = await request(app)
      .patch(`/api/v1/service-hub/bookings/${encId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'COMPLETED' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.booking.status).toBe('COMPLETED');
  });

  it('4. Resident verifies service, settles escrow, and rates 5 stars', async () => {
    const listRes = await request(app)
      .get('/api/v1/service-hub/bookings')
      .set('Authorization', `Bearer ${resident1Token}`);

    const booking = listRes.body.bookings[0];
    const encId = encodeURIComponent(booking.bookingId);

    const settleRes = await request(app)
      .post(`/api/v1/service-hub/bookings/${encId}/settle`)
      .set('Authorization', `Bearer ${resident1Token}`)
      .send({
        rating: 5,
        reviewText: 'Punctual, thorough, and very polite. Excellent work!',
      });

    expect(settleRes.status).toBe(200);
    expect(settleRes.body.booking.status).toBe('SETTLED');
    expect(settleRes.body.booking.rating).toBe(5);

    // Verify provider profile received rating update
    const profileRes = await request(app)
      .get('/api/v1/service-hub/providers')
      .set('Authorization', `Bearer ${resident1Token}`);

    const provProfile = profileRes.body.providers.find(
      (p: any) => p.userId.toString() === providerUserId.toString()
    );
    expect(provProfile).toBeDefined();
    expect(provProfile.totalReviews).toBe(1);
    expect(provProfile.ratingAverage).toBe(5);
  });
});
