import mongoose, { ClientSession, Types } from 'mongoose';
import { Payment, IPayment, LedgerEntry, PaymentStatus } from '../models/payment.model.js';

export interface CreatePaymentParams {
  societyId: string | Types.ObjectId;
  payerId: string | Types.ObjectId;
  recipientId?: string | Types.ObjectId;
  module: 'COMPLAINTS' | 'SOCIETY_HELP' | 'SERVICE_HUB' | 'SHARE_RENT' | 'GROUP_BUYING';
  entityId: string;
  amount: number;
  idempotencyKey: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface IPaymentGateway {
  initiateHold(params: CreatePaymentParams, session?: ClientSession): Promise<IPayment>;
  releaseFunds(paymentId: string | Types.ObjectId, amount?: number, session?: ClientSession): Promise<IPayment>;
  refund(paymentId: string | Types.ObjectId, amount?: number, reason?: string, session?: ClientSession): Promise<IPayment>;
  executeDirectPayment(params: CreatePaymentParams, session?: ClientSession): Promise<IPayment>;
}

export class SimulatedPaymentGateway implements IPaymentGateway {
  public async initiateHold(params: CreatePaymentParams, session?: ClientSession): Promise<IPayment> {
    // Check idempotency
    const existing = await Payment.findOne({ idempotencyKey: params.idempotencyKey }).session(session || null);
    if (existing) {
      return existing;
    }

    const payment = new Payment({
      societyId: params.societyId,
      payerId: params.payerId,
      recipientId: params.recipientId,
      module: params.module,
      entityId: params.entityId,
      amount: params.amount,
      currency: 'INR',
      status: 'HOLD',
      idempotencyKey: params.idempotencyKey,
      isSimulated: true,
      notes: params.notes,
      metadata: params.metadata,
    });

    await payment.save({ session });

    const ledger = new LedgerEntry({
      societyId: params.societyId,
      paymentId: payment._id,
      entryType: 'HOLD',
      amount: params.amount,
      balanceAfter: params.amount,
      description: `[SIMULATED] Escrow hold created for ${params.module} (${params.entityId})`,
      isSimulated: true,
    });
    await ledger.save({ session });

    return payment;
  }

  public async releaseFunds(paymentId: string | Types.ObjectId, amount?: number, session?: ClientSession): Promise<IPayment> {
    const payment = await Payment.findById(paymentId).session(session || null);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const releaseAmount = amount !== undefined ? amount : payment.amount;
    payment.status = 'RELEASED';
    await payment.save({ session });

    const ledger = new LedgerEntry({
      societyId: payment.societyId,
      paymentId: payment._id,
      entryType: 'RELEASE',
      amount: releaseAmount,
      balanceAfter: 0,
      description: `[SIMULATED] Escrow funds released to recipient for ${payment.module} (${payment.entityId})`,
      isSimulated: true,
    });
    await ledger.save({ session });

    return payment;
  }

  public async refund(paymentId: string | Types.ObjectId, amount?: number, reason = 'Cancelled/Returned', session?: ClientSession): Promise<IPayment> {
    const payment = await Payment.findById(paymentId).session(session || null);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const refundAmount = amount !== undefined ? amount : payment.amount;
    const isPartial = refundAmount < payment.amount;

    payment.status = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';
    await payment.save({ session });

    const ledger = new LedgerEntry({
      societyId: payment.societyId,
      paymentId: payment._id,
      entryType: isPartial ? 'DEDUCTION' : 'REFUND',
      amount: refundAmount,
      balanceAfter: payment.amount - refundAmount,
      description: `[SIMULATED] ${isPartial ? 'Partial deduction and refund' : 'Full refund'} processed. Reason: ${reason}`,
      isSimulated: true,
    });
    await ledger.save({ session });

    return payment;
  }

  public async executeDirectPayment(params: CreatePaymentParams, session?: ClientSession): Promise<IPayment> {
    const existing = await Payment.findOne({ idempotencyKey: params.idempotencyKey }).session(session || null);
    if (existing) {
      return existing;
    }

    const payment = new Payment({
      societyId: params.societyId,
      payerId: params.payerId,
      recipientId: params.recipientId,
      module: params.module,
      entityId: params.entityId,
      amount: params.amount,
      currency: 'INR',
      status: 'RELEASED',
      idempotencyKey: params.idempotencyKey,
      isSimulated: true,
      notes: params.notes,
      metadata: params.metadata,
    });

    await payment.save({ session });

    const ledger = new LedgerEntry({
      societyId: params.societyId,
      paymentId: payment._id,
      entryType: 'MAINTENANCE_PAYMENT',
      amount: params.amount,
      balanceAfter: 0,
      description: `[SIMULATED] Direct payment completed for ${params.module} (${params.entityId})`,
      isSimulated: true,
    });
    await ledger.save({ session });

    return payment;
  }
}

export const paymentGateway: IPaymentGateway = new SimulatedPaymentGateway();

export const paymentService = {
  async processSimulatedPayment(params: {
    societyId: string | Types.ObjectId;
    payerId: string | Types.ObjectId;
    recipientId?: string | Types.ObjectId;
    amount: number;
    type: 'HOLD' | 'RELEASE' | 'REFUND' | 'MAINTENANCE_PAYMENT';
    description: string;
    idempotencyKey: string;
  }): Promise<IPayment> {
    const existing = await Payment.findOne({ idempotencyKey: params.idempotencyKey });
    if (existing) return existing;

    const payment = new Payment({
      societyId: new Types.ObjectId(params.societyId.toString()),
      payerId: new Types.ObjectId(params.payerId.toString()),
      recipientId: params.recipientId ? new Types.ObjectId(params.recipientId.toString()) : undefined,
      module: 'SOCIETY_HELP',
      entityId: params.idempotencyKey,
      amount: params.amount,
      currency: 'INR',
      status: params.type === 'HOLD' ? 'HOLD' : 'RELEASED',
      idempotencyKey: params.idempotencyKey,
      isSimulated: true,
      notes: params.description,
    });
    await payment.save();

    const ledger = new LedgerEntry({
      societyId: payment.societyId,
      paymentId: payment._id,
      entryType: params.type,
      amount: params.amount,
      balanceAfter: params.type === 'HOLD' ? params.amount : 0,
      description: `[SIMULATED] ${params.description}`,
      isSimulated: true,
    });
    await ledger.save();

    return payment;
  },
};
