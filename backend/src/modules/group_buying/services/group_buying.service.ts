import crypto from 'crypto';
import { Types } from 'mongoose';
import { GBDeal, IGBDeal, IDealTier } from '../models/gb_deal.model.js';
import { GBOrder, IGBOrder } from '../models/gb_order.model.js';
import { User } from '../../../core/models/user.model.js';
import { paymentService } from '../../../core/payments/payment.service.js';
import { socketService } from '../../../core/socket/socket.service.js';

let dealSeq = 1000;
let orderSeq = 1000;

export class GroupBuyingService {
  /**
   * Supplier creates a group buying deal with tiered pricing
   */
  public async createDeal(
    societyId: string,
    supplierId: string,
    title: string,
    category: string,
    description: string,
    unit: string,
    tiers: IDealTier[],
    minTargetQty: number,
    deadline: Date,
    deliveryDate: Date
  ): Promise<IGBDeal> {
    const supplier = await User.findById(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    // Sort tiers by minQty ascending
    const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
    const initialPrice = sortedTiers[0].pricePerUnit;

    const dealCount = await GBDeal.countDocuments();
    const dealId = `#GB-${1000 + dealCount + 1}`;

    const deal = new GBDeal({
      dealId,
      societyId: new Types.ObjectId(societyId),
      supplierId: new Types.ObjectId(supplierId),
      supplierName: supplier.name,
      title,
      category,
      description,
      unit,
      tiers: sortedTiers,
      minTargetQty,
      currentTotalQty: 0,
      currentPrice: initialPrice,
      status: 'OPEN',
      deadline,
      deliveryDate,
    });

    await deal.save();
    return deal;
  }

  /**
   * List active deals for society
   */
  public async getDeals(societyId: string): Promise<IGBDeal[]> {
    return GBDeal.find({
      societyId: new Types.ObjectId(societyId),
    }).sort({ createdAt: -1 });
  }

  private getFilter(idStr: string) {
    const decoded = decodeURIComponent(idStr).trim();
    const cleanId = decoded.replace('#', '');
    return {
      $or: [
        { dealId: decoded },
        { dealId: idStr },
        { dealId: `#${cleanId}` },
        { dealId: cleanId },
        ...(Types.ObjectId.isValid(cleanId) ? [{ _id: new Types.ObjectId(cleanId) }] : []),
      ],
    };
  }

  private getOrderFilter(idStr: string) {
    const decoded = decodeURIComponent(idStr).trim();
    const cleanId = decoded.replace('#', '');
    return {
      $or: [
        { orderId: decoded },
        { orderId: idStr },
        { orderId: `#${cleanId}` },
        { orderId: cleanId },
        ...(Types.ObjectId.isValid(cleanId) ? [{ _id: new Types.ObjectId(cleanId) }] : []),
      ],
    };
  }

  /**
   * Resident joins deal: pledges quantity, simulated escrow hold, live progress update
   */
  public async joinDeal(
    societyId: string,
    residentId: string,
    dealIdStr: string,
    quantity: number
  ): Promise<IGBOrder> {
    const resident = await User.findById(residentId);
    if (!resident) throw new Error('Resident not found');

    const deal = await GBDeal.findOne({
      ...this.getFilter(dealIdStr),
      societyId: new Types.ObjectId(societyId),
      status: { $in: ['OPEN', 'TARGET_REACHED'] },
    });
    if (!deal) throw new Error('Deal not available for pledging');

    if (new Date() > deal.deadline) {
      throw new Error('Deal deadline has passed');
    }

    const priceAtPledge = deal.currentPrice;
    const totalPledged = quantity * priceAtPledge;

    // Simulated escrow hold
    const orderCount = await GBOrder.countDocuments();
    const orderId = `#GBO-${1000 + orderCount + 1}`;
    const escrow = await paymentService.processSimulatedPayment({
      societyId,
      payerId: residentId,
      amount: totalPledged,
      type: 'HOLD',
      description: `Escrow pledge for ${quantity}x ${deal.title} (${orderId}) [SIMULATED]`,
      idempotencyKey: `ESCROW-GB-${deal._id}-${Date.now()}`,
    });

    const doorDeliveryToken = `GB-DEL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const order = new GBOrder({
      orderId,
      societyId: new Types.ObjectId(societyId),
      dealId: deal._id,
      dealTitle: deal.title,
      residentId: new Types.ObjectId(residentId),
      residentName: resident.name,
      flatNumber: resident.flatNumber || 'A-101',
      quantity,
      initialPledgedPrice: priceAtPledge,
      finalEffectivePrice: priceAtPledge,
      totalPledgedAmount: totalPledged,
      escrowHoldId: escrow.idempotencyKey,
      doorDeliveryToken,
      status: 'PLEDGED',
    });
    await order.save();

    // Update Deal total quantity & calculate tier price
    deal.currentTotalQty += quantity;

    let effectivePrice = deal.tiers[0].pricePerUnit;
    for (const tier of deal.tiers) {
      if (deal.currentTotalQty >= tier.minQty) {
        effectivePrice = tier.pricePerUnit;
      }
    }
    deal.currentPrice = effectivePrice;

    if (deal.currentTotalQty >= deal.minTargetQty && deal.status === 'OPEN') {
      deal.status = 'TARGET_REACHED';
    }
    await deal.save();

    // Broadcast live update to all society residents
    socketService.emitToSociety(societyId, 'group_buying:deal_updated', {
      dealId: deal.dealId,
      currentTotalQty: deal.currentTotalQty,
      currentPrice: deal.currentPrice,
      status: deal.status,
    });

    return order;
  }

  /**
   * Supplier generates Society Gate Delivery Manifest
   */
  public async generateManifest(societyId: string, dealIdStr: string, supplierId: string): Promise<IGBDeal> {
    const deal = await GBDeal.findOne({
      ...this.getFilter(dealIdStr),
      societyId: new Types.ObjectId(societyId),
      supplierId: new Types.ObjectId(supplierId),
    });
    if (!deal) throw new Error('Deal not found or unauthorized');

    deal.manifestQrToken = `GB-MAN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    deal.status = 'DISPATCHED';
    await deal.save();

    return deal;
  }

  /**
   * Security Guard verifies delivery truck manifest at society gate
   */
  public async verifyManifestAtGate(societyId: string, manifestToken: string): Promise<IGBDeal> {
    const deal = await GBDeal.findOne({
      societyId: new Types.ObjectId(societyId),
      manifestQrToken: manifestToken.trim().toUpperCase(),
    });

    if (!deal) throw new Error('Invalid Delivery Manifest Token');

    deal.manifestScannedAt = new Date();
    await deal.save();

    return deal;
  }

  /**
   * Resident / Delivery partner confirms door-to-door delivery
   */
  public async confirmDoorDelivery(
    societyId: string,
    orderIdStr: string,
    token: string
  ): Promise<IGBOrder> {
    const order = await GBOrder.findOne({
      ...this.getOrderFilter(orderIdStr),
      societyId: new Types.ObjectId(societyId),
    });
    if (!order) throw new Error('Order not found');

    if (order.doorDeliveryToken !== token.trim().toUpperCase()) {
      throw new Error('Invalid delivery confirmation token');
    }

    order.status = 'DELIVERED';
    order.deliveredAt = new Date();
    await order.save();

    return order;
  }

  /**
   * Settle deal & refund retroactive price drop difference to residents
   */
  public async settleDeal(societyId: string, dealIdStr: string): Promise<{ settledOrders: number }> {
    const deal = await GBDeal.findOne({
      ...this.getFilter(dealIdStr),
      societyId: new Types.ObjectId(societyId),
    });
    if (!deal) throw new Error('Deal not found');

    const orders = await GBOrder.find({
      dealId: deal._id,
      status: { $in: ['PLEDGED', 'DELIVERED'] },
    });

    let totalSupplierPayout = 0;
    for (const ord of orders) {
      ord.finalEffectivePrice = deal.currentPrice;
      const actualCost = ord.quantity * deal.currentPrice;
      const savings = ord.totalPledgedAmount - actualCost;

      // Refund retroactive price drop difference to resident
      if (savings > 0) {
        await paymentService.processSimulatedPayment({
          societyId,
          payerId: ord.residentId.toString(),
          amount: savings,
          type: 'REFUND',
          description: `Tier price drop refund for ${deal.title} (${ord.orderId}) [SIMULATED]`,
          idempotencyKey: `REFUND-GB-DIFF-${ord._id}`,
        });
        ord.refundDifference = savings;
      }

      totalSupplierPayout += actualCost;
      ord.status = 'SETTLED';
      await ord.save();
    }

    // Release payout to supplier
    await paymentService.processSimulatedPayment({
      societyId,
      payerId: deal.supplierId.toString(),
      amount: totalSupplierPayout,
      type: 'RELEASE',
      description: `Settlement revenue for Deal ${deal.dealId} (${deal.title}) to ${deal.supplierName} [SIMULATED]`,
      idempotencyKey: `SETTLE-GB-SUPP-${deal._id}`,
    });

    deal.status = 'SETTLED';
    await deal.save();

    return { settledOrders: orders.length };
  }

  /**
   * Get user's orders
   */
  public async getMyOrders(societyId: string, residentId: string): Promise<IGBOrder[]> {
    return GBOrder.find({
      societyId: new Types.ObjectId(societyId),
      residentId: new Types.ObjectId(residentId),
    }).sort({ createdAt: -1 });
  }
}

export const groupBuyingService = new GroupBuyingService();
