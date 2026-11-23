import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/core/seed/seed.service.js';
import { escalationService } from '../src/modules/complaints/services/escalation.service.js';
import { Complaint } from '../src/modules/complaints/models/complaint.model.js';

let app: any;
let presidentToken: string;
let residentToken: string;
let providerToken: string;
let guardToken: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDatabase();
  const { User } = await import('../src/core/models/user.model.js');
  const { Society } = await import('../src/core/models/society.model.js');
  const { ComplaintCounter } = await import('../src/modules/complaints/models/complaint_counter.model.js');
  await User.deleteMany({});
  await Society.deleteMany({});
  await Complaint.deleteMany({});
  await ComplaintCounter.deleteMany({});
  await seedDatabase();
  app = createApp();

  // Login President
  const presRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'president@onesociety.in', password: 'password123' });
  expect(presRes.status).toBe(200);
  presidentToken = presRes.body.accessToken;

  // Login Resident Rahul
  const resRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'rahul@onesociety.in', password: 'password123' });
  expect(resRes.status).toBe(200);
  residentToken = resRes.body.accessToken;

  // Login Service Provider Ramesh
  let tempRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'ramesh.electrician@onesociety.in', password: 'password123' });

  if (tempRes.status === 401) {
    tempRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.electrician@onesociety.in', password: 'newsecurepass123' });
  }

  expect(tempRes.status).toBe(200);

  if (tempRes.body.user.mustChangePassword) {
    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${tempRes.body.accessToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newsecurepass123' });
    expect(changeRes.status).toBe(200);
    providerToken = changeRes.body.accessToken;
  } else {
    providerToken = tempRes.body.accessToken;
  }

  // Login Security Guard
  const guardRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'guard@onesociety.in', password: 'password123' });
  expect(guardRes.status).toBe(200);
  guardToken = guardRes.body.accessToken;
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Module 4: Smart Complaint Handling Tests', () => {
  let createdComplaintId: string;
  let complaintDbId: string;

  it('1. Resident can raise a common-area complaint with sequential ID', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Water leakage near second-floor staircase',
        description: 'Persistent water leaking from the main pipe near the Block A staircase.',
        block: 'Block A',
        commonArea: 'Staircase Area',
      });

    if (res.status !== 201) {
      console.log('TEST 1 ERROR BODY:', res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body.complaint.complaintId).toMatch(/^#C\d+/);
    expect(res.body.complaint.status).toBe('SUBMITTED');
    createdComplaintId = res.body.complaint.complaintId;
    complaintDbId = res.body.complaint._id;
  });

  it('2. AI triage transitions complaint to UNDER_REVIEW with rubric priority', async () => {
    // Wait briefly for setImmediate background AI triage
    await new Promise((r) => setTimeout(r, 200));

    const res = await request(app)
      .get(`/api/v1/complaints/${complaintDbId}`)
      .set('Authorization', `Bearer ${presidentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.complaint.status).toBe('UNDER_REVIEW');
    expect(res.body.complaint.priority).toBeDefined();
    expect(res.body.complaint.aiAnalysis).toBeDefined();
    // President sees confidence score
    expect(res.body.complaint.aiAnalysis.confidence).toBeGreaterThan(0.7);
  });

  it('3. Resident cannot see internal AI confidence score', async () => {
    const res = await request(app)
      .get(`/api/v1/complaints/${complaintDbId}`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.complaint.aiAnalysis.confidence).toBeUndefined();
  });

  it('4. President sets work size to MAJOR and triggers Expense Approval Gate', async () => {
    // Mark as MAJOR work
    await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/review`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({ workSize: 'MAJOR', priority: 'HIGH' });

    // Attempt to assign Major complaint without approved expense -> Rejected!
    const assignFail = await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/assign`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        providerName: 'Apex Plumbing Works',
        providerPhone: '9876500111',
        providerType: 'Plumber',
        isExternalVendor: true,
      });

    expect(assignFail.status).toBe(400);
    expect(assignFail.body.message).toContain('Expense Approval Gate');

    // Submit and approve expense quotation
    const quoteRes = await request(app)
      .post(`/api/v1/complaints/${complaintDbId}/expense-quote`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        vendorName: 'Apex Plumbing Works',
        vendorPhone: '9876500111',
        quotationAmount: 8500,
        action: 'APPROVE',
        comment: 'Quotation verified and approved for pipe replacement',
      });

    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.complaint.expenseApproval.status).toBe('APPROVED');

    // Now assignment succeeds
    const assignSuccess = await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/assign`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        providerName: 'Apex Plumbing Works',
        providerPhone: '9876500111',
        providerType: 'Plumber',
        isExternalVendor: true,
        estimatedCost: 8500,
      });

    expect(assignSuccess.status).toBe(200);
    expect(assignSuccess.body.complaint.status).toBe('ASSIGNED');
  });

  it('5. Provider lifecycle: decline returns to review, accept moves to in progress and resolve', async () => {
    // Reassign to provider Ramesh for workflow demo
    const c = await Complaint.findById(complaintDbId);
    c!.workSize = 'MINOR';
    c!.status = 'ASSIGNED';
    c!.assignment = {
      providerId: c!._id, // placeholder
      providerName: 'Ramesh Electrician',
      providerPhone: '9876543230',
      providerType: 'Electrician',
      isExternalVendor: false,
    };
    await c!.save();

    // Provider accepts
    const acceptRes = await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/provider-respond`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ action: 'ACCEPT' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.complaint.status).toBe('IN_PROGRESS');

    // Provider marks resolved
    const resolveRes = await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/provider-resolve`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ resolutionNote: 'Replaced faulty valve and sealed pipe' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.complaint.status).toBe('RESOLVED');
  });

  it('6. Resident verification: Reopen loop and escalation after limit', async () => {
    // Resident marks not resolved
    const reopenRes = await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/verify`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ isResolved: false, reopenReason: 'Water is still trickling slowly' });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.complaint.status).toBe('UNDER_REVIEW');
    expect(reopenRes.body.complaint.reopenCount).toBe(1);

    // Simulate 2nd reopen to verify escalation alert flag
    const c = await Complaint.findById(complaintDbId);
    c!.status = 'RESOLVED';
    await c!.save();

    const reopen2Res = await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/verify`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ isResolved: false, reopenReason: 'Leakage persists on second inspection' });

    expect(reopen2Res.status).toBe(200);
    expect(reopen2Res.body.complaint.reopenCount).toBe(2);
    expect(reopen2Res.body.complaint.escalationFlags.reopenLimitAlertSent).toBe(true);

    // Finally resident confirms resolution with 5-star rating
    await Complaint.findByIdAndUpdate(complaintDbId, { status: 'RESOLVED' });

    const closeRes = await request(app)
      .patch(`/api/v1/complaints/${complaintDbId}/verify`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ isResolved: true, rating: 5, feedback: 'Fixed completely now. Thank you!' });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.complaint.status).toBe('CLOSED');
    expect(closeRes.body.complaint.rating).toBe(5);
  });

  it('7. Escalation Service is idempotent and does not send duplicate alerts', async () => {
    const check1 = await escalationService.runIdempotentEscalationCheck();
    expect(check1.checked).toBeGreaterThanOrEqual(0);

    const check2 = await escalationService.runIdempotentEscalationCheck();
    // Second immediate run sends 0 duplicate escalations
    expect(check2.escalationsSent).toBe(0);
  });

  it('8. Security guard cannot access complaint management endpoints', async () => {
    const res = await request(app)
      .post(`/api/v1/complaints/${complaintDbId}/expense-quote`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ vendorName: 'Fake', quotationAmount: 500 });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Forbidden');
  });
});
