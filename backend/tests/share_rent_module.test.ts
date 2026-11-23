import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/core/seed/seed.service.js';
import { SRItem } from '../src/modules/share_rent/models/sr_item.model.js';
import { SRRental } from '../src/modules/share_rent/models/sr_rental.model.js';

const app = createApp();

describe('Module 2: Share & Rent', () => {
  let ownerToken: string;
  let borrowerToken: string;
  let presidentToken: string;
  let itemId: string;

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();

    // Owner: Rahul (9876543211)
    const oRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543211', password: 'password123' });
    ownerToken = oRes.body.accessToken;

    // Borrower: Amrutha (9876543212)
    const bRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543212', password: 'password123' });
    borrowerToken = bRes.body.accessToken;

    // President (9876543210)
    const pRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543210', password: 'password123' });
    presidentToken = pRes.body.accessToken;
  });

  afterAll(async () => {
    await SRItem.deleteMany({});
    await SRRental.deleteMany({});
    await disconnectDatabase();
  });

  it('1. Resident lists item for peer-to-peer rental', async () => {
    const res = await request(app)
      .post('/api/v1/share-rent/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Bosch Professional Cordless Hammer Drill',
        category: 'TOOLS',
        description: 'Complete 18V drilling kit with masonry and wood drill bits',
        dailyRate: 150,
        securityDeposit: 1500,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item.title).toContain('Bosch');
    expect(res.body.item.isAvailable).toBe(true);
    itemId = res.body.item._id;
  });

  it('2. Complete 6-card rental lifecycle: Request -> Approve -> Checkout -> In-Use -> Return -> Settle', async () => {
    // 2a. Borrower requests 2-day rental
    const reqRes = await request(app)
      .post('/api/v1/share-rent/rentals')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        itemId,
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      });

    expect(reqRes.status).toBe(201);
    expect(reqRes.body.rental.rentalId).toMatch(/^#SR-/);
    expect(reqRes.body.rental.status).toBe('REQUESTED');
    expect(reqRes.body.rental.rentalFee).toBe(300); // 2 days * 150
    expect(reqRes.body.rental.securityDeposit).toBe(1500);
    expect(reqRes.body.rental.totalAmount).toBe(1800);

    const rentalId = encodeURIComponent(reqRes.body.rental.rentalId);

    // 2b. Owner approves request
    const appRes = await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();

    expect(appRes.status).toBe(200);
    expect(appRes.body.rental.status).toBe('APPROVED');

    // 2c. Borrower checks out & pays into simulated escrow hold
    const chkRes = await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/checkout`)
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send();

    expect(chkRes.status).toBe(200);
    expect(chkRes.body.rental.status).toBe('CHECKOUT');
    expect(chkRes.body.rental.escrowHoldId).toBeDefined();
    expect(chkRes.body.rental.handoverToken).toMatch(/^SR-PASS-/);

    const handoverToken = chkRes.body.rental.handoverToken;

    // 2d. Handover token verification at item pickup
    const handRes = await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/handover`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ token: handoverToken });

    expect(handRes.status).toBe(200);
    expect(handRes.body.rental.status).toBe('IN_USE');

    // Item should now be marked unavailable
    const itemCheck = await SRItem.findById(itemId);
    expect(itemCheck?.isAvailable).toBe(false);

    // 2e. Return inspection (Good condition -> auto deposit refund & fee release)
    const retRes = await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/return`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        condition: 'GOOD',
        notes: 'Returned in clean and working condition with all drill bits intact',
      });

    expect(retRes.status).toBe(200);
    expect(retRes.body.rental.status).toBe('COMPLETED');

    // Item is available again
    const finalItem = await SRItem.findById(itemId);
    expect(finalItem?.isAvailable).toBe(true);
  });

  it('3. Dispute flow: Damaged item triggers dispute and President settles deduction', async () => {
    // Borrower requests another rental
    const reqRes = await request(app)
      .post('/api/v1/share-rent/rentals')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        itemId,
        startDate: '2026-12-05',
        endDate: '2026-12-06',
      });

    const rentalId = encodeURIComponent(reqRes.body.rental.rentalId);

    await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const chkRes = await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/checkout`)
      .set('Authorization', `Bearer ${borrowerToken}`);

    await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/handover`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ token: chkRes.body.rental.handoverToken });

    // Return with DAMAGED condition -> Status: DISPUTED
    const retRes = await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/return`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        condition: 'DAMAGED',
        disputeReason: 'Motor casing cracked and Chuck jammed',
      });

    expect(retRes.status).toBe(200);
    expect(retRes.body.rental.status).toBe('DISPUTED');

    // President resolves dispute with ₹500 damage compensation deduction
    const resolveRes = await request(app)
      .post(`/api/v1/share-rent/rentals/${rentalId}/resolve-dispute`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({ deductionAmount: 500 });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.rental.status).toBe('COMPLETED');
    expect(resolveRes.body.rental.disputeDeduction).toBe(500);
  });
});
