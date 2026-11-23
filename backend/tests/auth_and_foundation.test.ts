import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/core/seed/seed.service.js';
import { qrService } from '../src/core/qr/qr.service.js';
import { storageService } from '../src/core/storage/storage.service.js';
import { paymentGateway } from '../src/core/payments/payment.service.js';
import { aiService } from '../src/core/ai/ai.service.js';
import { User } from '../src/core/models/user.model.js';
import { Society } from '../src/core/models/society.model.js';

let app: any;
let presidentToken: string;
let residentToken: string;
let tempUserToken: string;
let societyId: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDatabase();
  await User.deleteMany({});
  await Society.deleteMany({});
  await seedDatabase();
  app = createApp();

  // Login as President
  const presRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'president@onesociety.in', password: 'password123' });
  expect(presRes.status).toBe(200);
  presidentToken = presRes.body.accessToken;
  societyId = presRes.body.user.societyId;

  // Login as Resident (Rahul)
  const resRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'rahul@onesociety.in', password: 'password123' });
  expect(resRes.status).toBe(200);
  residentToken = resRes.body.accessToken;

  // Login as External Provider with temporary password (Ramesh Electrician)
  const tempRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'ramesh.electrician@onesociety.in', password: 'password123' });
  expect(tempRes.status).toBe(200);
  tempUserToken = tempRes.body.accessToken;
  expect(tempRes.body.user.mustChangePassword).toBe(true);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Phase 0 - Foundation Tests', () => {
  it('1. GET /api/v1/health returns status OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.project).toBe('OneSociety');
  });

  it('2. Enforces password change on first login for accounts created by President', async () => {
    // Attempt to access protected endpoint with mustChangePassword=true
    const blockedRes = await request(app)
      .get('/api/v1/society')
      .set('Authorization', `Bearer ${tempUserToken}`);
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // Change password
    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${tempUserToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newsecurepass123' });
    expect(changeRes.status).toBe(200);
    expect(changeRes.body.accessToken).toBeDefined();

    // Now protected endpoint should be accessible with the new token
    const allowedRes = await request(app)
      .get('/api/v1/society')
      .set('Authorization', `Bearer ${changeRes.body.accessToken}`);
    expect(allowedRes.status).toBe(200);
  });

  it('3. RBAC: Resident cannot access President-only route', async () => {
    const res = await request(app)
      .post('/api/v1/auth/create-user')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        name: 'Sneha Worker',
        email: 'sneha@worker.in',
        phone: '9876543299',
        role: 'Service Provider',
        temporaryPassword: 'tempPass123',
      });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Forbidden');
  });

  it('4. President can create user and requires password change', async () => {
    const res = await request(app)
      .post('/api/v1/auth/create-user')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        name: 'Sunil Plumber',
        email: 'sunil.plumber@onesociety.in',
        phone: '9876543298',
        role: 'Service Provider',
        temporaryPassword: 'tempPass123',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.mustChangePassword).toBe(true);
  });

  it('5. Magic-byte file validation rejects spoofed extensions', () => {
    // Fake PNG with text content
    const fakeBuffer = Buffer.from('Just plain text pretending to be png');
    const result = storageService.validateMagicBytes(fakeBuffer);
    expect(result.valid).toBe(false);

    // Real PNG magic bytes
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const validResult = storageService.validateMagicBytes(pngHeader);
    expect(validResult.valid).toBe(true);
    expect(validResult.detectedMime).toBe('image/png');
  });

  it('6. QR Pass Service: Single-use, expiration & duplicate rejection', async () => {
    const pass = await qrService.createVisitorPass({
      societyId,
      generatedBy: '65f000000000000000000001',
      guestName: 'Rohit Sharma',
      guestPhone: '9876500001',
      purpose: 'Guest visit',
      validityHours: 2,
      passType: 'VISITOR_INDIVIDUAL',
    });
    expect(pass.token).toMatch(/^OSQ-/);
    expect(pass.status).toBe('ACTIVE');

    // First check-in succeeds
    const check1 = await qrService.verifyAndCheckInPass({
      token: pass.token,
      verifierId: '65f000000000000000000002',
      verifierName: 'Security Guard Bahadur',
      societyId,
    });
    expect(check1.success).toBe(true);

    // Second check-in fails with single-use rejection
    const check2 = await qrService.verifyAndCheckInPass({
      token: pass.token,
      verifierId: '65f000000000000000000002',
      verifierName: 'Security Guard Bahadur',
      societyId,
    });
    expect(check2.success).toBe(false);
    expect(check2.message).toContain('already been used');
  });

  it('7. Simulated Payment Gateway: Idempotency & Escrow ledger tracking', async () => {
    const key = 'idem_key_test_12345';
    const hold1 = await paymentGateway.initiateHold({
      societyId,
      payerId: '65f000000000000000000001',
      module: 'SHARE_RENT',
      entityId: 'rent_booking_999',
      amount: 800,
      idempotencyKey: key,
    });
    expect(hold1.status).toBe('HOLD');
    expect(hold1.isSimulated).toBe(true);

    // Duplicate call with same idempotency key returns existing record
    const hold2 = await paymentGateway.initiateHold({
      societyId,
      payerId: '65f000000000000000000001',
      module: 'SHARE_RENT',
      entityId: 'rent_booking_999',
      amount: 800,
      idempotencyKey: key,
    });
    expect(hold2._id.toString()).toBe(hold1._id.toString());
  });

  it('8. AI Service: Priority rubric classifies safety hazards as High', async () => {
    const analysis = await aiService.analyzeComplaint({
      description: 'Person stuck in lift B2 between 3rd and 4th floor with sparks near motor',
    });
    expect(analysis.priority).toBe('HIGH');
    expect(analysis.suggestedProviderType).toBe('Lift Technician');
    expect(analysis.isEmergency).toBe(true);
    expect(analysis.confidence).toBeGreaterThan(0.8);
  });
});
