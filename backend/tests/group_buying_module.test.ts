import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/core/seed/seed.service.js';
import { GBDeal } from '../src/modules/group_buying/models/gb_deal.model.js';
import { GBOrder } from '../src/modules/group_buying/models/gb_order.model.js';

const app = createApp();

describe('Module 1: Group Buying', () => {
  let supplierToken: string;
  let resident1Token: string;
  let resident2Token: string;
  let securityToken: string;
  let dealId: string;

  beforeAll(async () => {
    await connectDatabase();
    await seedDatabase();

    // Supplier (9876543240)
    const sRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543240', password: 'password123' });
    supplierToken = sRes.body.accessToken;

    // Resident 1 (9876543211)
    const r1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543211', password: 'password123' });
    resident1Token = r1.body.accessToken;

    // Resident 2 (9876543212)
    const r2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543212', password: 'password123' });
    resident2Token = r2.body.accessToken;

    // Security Guard (9876543220)
    const sec = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '9876543220', password: 'password123' });
    securityToken = sec.body.accessToken;
  });

  afterAll(async () => {
    await GBDeal.deleteMany({});
    await GBOrder.deleteMany({});
    await disconnectDatabase();
  });

  it('1. Supplier creates group buying deal with 3-tier bulk pricing', async () => {
    const res = await request(app)
      .post('/api/v1/group-buying/deals')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        title: 'Premium Ratnagiri Alphonso Mangoes',
        category: 'Fruits & Produce',
        description: 'Direct orchard harvest, naturally ripened, export grade Alphonso mangoes',
        unit: 'Box (12 pcs)',
        tiers: [
          { minQty: 1, maxQty: 19, pricePerUnit: 800 },
          { minQty: 20, maxQty: 49, pricePerUnit: 700 },
          { minQty: 50, pricePerUnit: 600 },
        ],
        minTargetQty: 20,
        deadline: '2026-12-10',
        deliveryDate: '2026-12-12',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.deal.dealId).toMatch(/^#GB-/);
    expect(res.body.deal.currentPrice).toBe(800);
    expect(res.body.deal.status).toBe('OPEN');
    dealId = res.body.deal.dealId;
  });

  it('2. Residents pledge quantities, unlocking Tier 2 and triggering TARGET_REACHED', async () => {
    const encDealId = encodeURIComponent(dealId);
    // Resident 1 pledges 10 boxes @ 800 = 8000
    const o1Res = await request(app)
      .post(`/api/v1/group-buying/deals/${encDealId}/join`)
      .set('Authorization', `Bearer ${resident1Token}`)
      .send({ quantity: 10 });

    expect(o1Res.status).toBe(201);
    expect(o1Res.body.order.quantity).toBe(10);
    expect(o1Res.body.order.totalPledgedAmount).toBe(8000);

    // Resident 2 pledges 15 boxes (Total = 25 boxes, crossing 20 target)
    const o2Res = await request(app)
      .post(`/api/v1/group-buying/deals/${encDealId}/join`)
      .set('Authorization', `Bearer ${resident2Token}`)
      .send({ quantity: 15 });

    expect(o2Res.status).toBe(201);

    // Check deal status: Tier 2 price (700) unlocked, status TARGET_REACHED
    const dealsRes = await request(app)
      .get('/api/v1/group-buying/deals')
      .set('Authorization', `Bearer ${resident1Token}`);

    const deal = dealsRes.body.deals.find((d: any) => d.dealId === dealId);
    expect(deal.currentTotalQty).toBe(25);
    expect(deal.currentPrice).toBe(700); // Tier 2 unlocked!
    expect(deal.status).toBe('TARGET_REACHED');
  });

  it('3. Supplier generates delivery manifest & Security Guard scans at society gate', async () => {
    const encDealId = encodeURIComponent(dealId);
    // Supplier dispatches & creates manifest QR
    const manRes = await request(app)
      .post(`/api/v1/group-buying/deals/${encDealId}/manifest`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send();

    expect(manRes.status).toBe(200);
    expect(manRes.body.deal.manifestQrToken).toMatch(/^GB-MAN-/);
    expect(manRes.body.deal.status).toBe('DISPATCHED');

    const manifestToken = manRes.body.deal.manifestQrToken;

    // Security Guard verifies manifest at gate
    const gateRes = await request(app)
      .post('/api/v1/group-buying/manifest/verify')
      .set('Authorization', `Bearer ${securityToken}`)
      .send({ manifestToken });

    expect(gateRes.status).toBe(200);
    expect(gateRes.body.deal.manifestScannedAt).toBeDefined();
  });

  it('4. Confirm door delivery, settle deal, and verify retroactive price drop refund', async () => {
    const encDealId = encodeURIComponent(dealId);
    // Get orders
    const ordRes = await request(app)
      .get('/api/v1/group-buying/orders')
      .set('Authorization', `Bearer ${resident1Token}`);

    const order1 = ordRes.body.orders[0];
    const encOrderId = encodeURIComponent(order1.orderId);

    // Confirm door delivery with token
    const delRes = await request(app)
      .post(`/api/v1/group-buying/orders/${encOrderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${resident1Token}`)
      .send({ token: order1.doorDeliveryToken });

    expect(delRes.status).toBe(200);
    expect(delRes.body.order.status).toBe('DELIVERED');

    // Supplier settles deal
    const settleRes = await request(app)
      .post(`/api/v1/group-buying/deals/${encDealId}/settle`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send();

    expect(settleRes.status).toBe(200);
    expect(settleRes.body.settledOrders).toBe(2);

    // Verify retroactive price difference refund (₹100 refund per box)
    const finalOrdRes = await request(app)
      .get('/api/v1/group-buying/orders')
      .set('Authorization', `Bearer ${resident1Token}`);

    const settledOrder1 = finalOrdRes.body.orders[0];
    expect(settledOrder1.status).toBe('SETTLED');
    expect(settledOrder1.refundDifference).toBe(1000); // 10 boxes * (800 - 700)
    expect(settledOrder1.finalEffectivePrice).toBe(700);
  });
});
