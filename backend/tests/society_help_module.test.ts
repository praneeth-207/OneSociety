import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/core/seed/seed.service.js';
import { VisitPass } from '../src/modules/society_help/models/visit_pass.model.js';
import { VisitRequest } from '../src/modules/society_help/models/visit_request.model.js';
import { MaintBill } from '../src/modules/society_help/models/maint_bill.model.js';
import { MaintExpense } from '../src/modules/society_help/models/maint_expense.model.js';
import { MaintMonthlySummary } from '../src/modules/society_help/models/maint_monthly_summary.model.js';

const app = createApp();

describe('Module 5: Society Help (Visitor Management & Maintenance)', () => {
  let presidentToken: string;
  let residentToken: string;
  let securityToken: string;

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();

    // Login with Phone Number for each role
    const presRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543210', password: 'password123' });
    presidentToken = presRes.body.accessToken;

    const resRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543211', password: 'password123' });
    residentToken = resRes.body.accessToken;

    const secRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543220', password: 'password123' });
    securityToken = secRes.body.accessToken;
  });

  afterAll(async () => {
    await VisitPass.deleteMany({});
    await VisitRequest.deleteMany({});
    await MaintBill.deleteMany({});
    await MaintExpense.deleteMany({});
    await MaintMonthlySummary.deleteMany({});
    await disconnectDatabase();
  });

  it('1. Resident generates a pre-planned individual QR pass (2 hours)', async () => {
    const res = await request(app)
      .post('/api/v1/society-help/visitors/passes')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Aditya Swamy',
        visitorPhone: '9123456789',
        visitorType: 'GUEST',
        passType: 'INDIVIDUAL',
        validityHours: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.pass.passToken).toMatch(/^VP-/);
    expect(res.body.pass.status).toBe('ACTIVE');
    expect(res.body.pass.flatNumber).toBe('A-201');
  });

  it('2. Security Guard verifies and admits visitor using token', async () => {
    // Generate a pass first
    const createRes = await request(app)
      .post('/api/v1/society-help/visitors/passes')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Swiggy Delivery Partner',
        visitorPhone: '9988776655',
        visitorType: 'DELIVERY',
        passType: 'INDIVIDUAL',
        validityHours: 1,
      });

    const token = createRes.body.pass.passToken;

    // Security verifies
    const verifyRes = await request(app)
      .post('/api/v1/society-help/visitors/verify')
      .set('Authorization', `Bearer ${securityToken}`)
      .send({ token });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.pass.status).toBe('USED');
    expect(verifyRes.body.pass.admittedCount).toBe(1);

    // 2b. Attempt to reuse single-use pass should fail
    const reuseRes = await request(app)
      .post('/api/v1/society-help/visitors/verify')
      .set('Authorization', `Bearer ${securityToken}`)
      .send({ token });

    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.message).toContain('already been used');
  });

  it('3. Pass renewal invalidates old pass token', async () => {
    const createRes = await request(app)
      .post('/api/v1/society-help/visitors/passes')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Karthik Guest',
        visitorPhone: '9000011111',
        visitorType: 'GUEST',
        passType: 'INDIVIDUAL',
        validityHours: 1,
      });

    const oldPassId = createRes.body.pass._id;
    const oldToken = createRes.body.pass.passToken;

    // Resident renews pass for 4 hours
    const renewRes = await request(app)
      .post(`/api/v1/society-help/visitors/passes/${oldPassId}/renew`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ validityHours: 4 });

    expect(renewRes.status).toBe(200);
    expect(renewRes.body.pass.passToken).not.toBe(oldToken);
    expect(renewRes.body.pass.status).toBe('ACTIVE');

    // Trying to use old token should fail with renewed notification
    const tryOldRes = await request(app)
      .post('/api/v1/society-help/visitors/verify')
      .set('Authorization', `Bearer ${securityToken}`)
      .send({ token: oldToken });

    expect(tryOldRes.status).toBe(400);
    expect(tryOldRes.body.message).toContain('renewed');

    // Using new token succeeds
    const tryNewRes = await request(app)
      .post('/api/v1/society-help/visitors/verify')
      .set('Authorization', `Bearer ${securityToken}`)
      .send({ token: renewRes.body.pass.passToken });

    expect(tryNewRes.status).toBe(200);
    expect(tryNewRes.body.pass.status).toBe('USED');
  });

  it('4. Security Guard requests approval for unexpected visitor & Resident approves', async () => {
    // Guard submits entry request
    const reqRes = await request(app)
      .post('/api/v1/society-help/visitors/unexpected')
      .set('Authorization', `Bearer ${securityToken}`)
      .send({
        flatNumber: 'A-201',
        visitorName: 'Carpenter Rajesh',
        visitorPhone: '9848022338',
        purpose: 'Wooden Door Repair',
        vehicleNumber: 'TS 09 AB 1234',
      });

    expect(reqRes.status).toBe(201);
    expect(reqRes.body.request.status).toBe('PENDING');
    const requestId = reqRes.body.request._id;

    // Resident responds to approve
    const approveRes = await request(app)
      .post(`/api/v1/society-help/visitors/unexpected/${requestId}/respond`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ action: 'APPROVE' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.request.status).toBe('APPROVED');
    expect(approveRes.body.request.passToken).toMatch(/^UN-/);
  });

  it('5. President generates monthly maintenance bills for all flats', async () => {
    const res = await request(app)
      .post('/api/v1/society-help/maintenance/bills/generate')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        billingMonth: '2026-11',
        amount: 2500,
        dueDate: '2026-11-30',
      });

    expect(res.status).toBe(201);
    expect(res.body.generatedCount).toBeGreaterThanOrEqual(20);
  });

  it('6. Resident pays maintenance bill via simulated payment gateway', async () => {
    // Find bill for resident's flat (A-101)
    const billsRes = await request(app)
      .get('/api/v1/society-help/maintenance/overview?month=2026-11')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(billsRes.status).toBe(200);
    const myBill = billsRes.body.bills[0];
    expect(myBill).toBeDefined();
    expect(myBill.status).toBe('PENDING');

    // Resident pays online
    const payRes = await request(app)
      .post(`/api/v1/society-help/maintenance/bills/${myBill._id}/pay`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send();

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.bill.status).toBe('PAID');
    expect(payRes.body.bill.paymentMethod).toBe('SIMULATED_ONLINE');
    expect(payRes.body.receiptNumber).toContain('RCPT-202611-');
  });

  it('7. Carry-forward financial calculation & closing balance math', async () => {
    // President records an expense
    await request(app)
      .post('/api/v1/society-help/maintenance/expenses')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        billingMonth: '2026-11',
        title: 'Monthly Lift AMC & Servicing',
        category: 'AMC',
        amount: 1500,
        vendorName: 'Otis Elevator Services',
      });

    // Run summary calculation
    const summaryRes = await request(app)
      .post('/api/v1/society-help/maintenance/summary/2026-11/close')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send();

    expect(summaryRes.status).toBe(200);
    const summary = summaryRes.body.summary;
    expect(summary.actualCollections).toBe(2500); // 1 paid bill
    expect(summary.totalExpenses).toBe(1500); // 1 expense of 1500
    // available = opening (0) + collections (2500) = 2500
    // closing = available (2500) - expenses (1500) = 1000
    expect(summary.closingBalance).toBe(1000);
  });

  it('8. Security Personnel is strictly blocked from maintenance and finances (RBAC)', async () => {
    const res = await request(app)
      .get('/api/v1/society-help/maintenance/overview?month=2026-11')
      .set('Authorization', `Bearer ${securityToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Forbidden: Access denied');
  });
});
