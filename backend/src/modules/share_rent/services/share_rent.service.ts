import crypto from 'crypto';
import { Types } from 'mongoose';
import { SRItem, ISRItem, ItemCategory } from '../models/sr_item.model.js';
import { SRRental, ISRRental, ReturnCondition } from '../models/sr_rental.model.js';
import { User } from '../../../core/models/user.model.js';
import { paymentService } from '../../../core/payments/payment.service.js';
import { socketService } from '../../../core/socket/socket.service.js';

let rentalSeq = 1000;

export class ShareRentService {
  /**
   * List available items in society
   */
  public async getItems(societyId: string, category?: string): Promise<ISRItem[]> {
    const filter: any = { societyId: new Types.ObjectId(societyId), isAvailable: true };
    if (category) filter.category = category;
    return SRItem.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Resident lists an item for rent
   */
  public async createItem(
    societyId: string,
    ownerId: string,
    title: string,
    category: ItemCategory,
    description: string,
    dailyRate: number,
    securityDeposit: number,
    photos: string[] = []
  ): Promise<ISRItem> {
    const owner = await User.findById(ownerId);
    if (!owner) throw new Error('Owner not found');

    const item = new SRItem({
      societyId: new Types.ObjectId(societyId),
      ownerId: new Types.ObjectId(ownerId),
      ownerName: owner.name,
      ownerFlatNumber: owner.flatNumber || 'A-101',
      title,
      category,
      description,
      dailyRate,
      securityDeposit,
      photos,
      isAvailable: true,
    });

    await item.save();
    return item;
  }

  /**
   * 1. REQUESTED: Borrower requests item rental
   */
  public async requestRental(
    societyId: string,
    borrowerId: string,
    itemId: string,
    startDate: string,
    endDate: string
  ): Promise<ISRRental> {
    const borrower = await User.findById(borrowerId);
    if (!borrower) throw new Error('Borrower not found');

    const item = await SRItem.findOne({
      _id: new Types.ObjectId(itemId),
      societyId: new Types.ObjectId(societyId),
      isAvailable: true,
    });
    if (!item) throw new Error('Item is not available for rental');

    if (item.ownerId.toString() === borrowerId) {
      throw new Error('You cannot rent your own item');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const rentalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const rentalFee = rentalDays * item.dailyRate;
    const securityDeposit = item.securityDeposit;
    const totalAmount = rentalFee + securityDeposit;

    rentalSeq++;
    const rentalId = `#SR-${rentalSeq}`;

    const rental = new SRRental({
      rentalId,
      societyId: new Types.ObjectId(societyId),
      itemId: item._id,
      itemTitle: item.title,
      ownerId: item.ownerId,
      ownerName: item.ownerName,
      ownerFlatNumber: item.ownerFlatNumber,
      borrowerId: new Types.ObjectId(borrowerId),
      borrowerName: borrower.name,
      borrowerFlatNumber: borrower.flatNumber || 'A-101',
      startDate,
      endDate,
      rentalDays,
      dailyRate: item.dailyRate,
      rentalFee,
      securityDeposit,
      totalAmount,
      status: 'REQUESTED',
    });

    await rental.save();

    // Notify owner
    socketService.emitToUser(item.ownerId.toString(), 'share_rent:request_received', {
      rentalId: rental.rentalId,
      itemTitle: rental.itemTitle,
      borrowerName: rental.borrowerName,
      rentalDays: rental.rentalDays,
    });

    return rental;
  }

  private getFilter(idStr: string) {
    const decoded = decodeURIComponent(idStr).trim();
    const cleanId = decoded.replace('#', '');
    return {
      $or: [
        { rentalId: decoded },
        { rentalId: idStr },
        { rentalId: `#${cleanId}` },
        { rentalId: cleanId },
        ...(Types.ObjectId.isValid(cleanId) ? [{ _id: new Types.ObjectId(cleanId) }] : []),
      ],
    };
  }

  /**
   * 2. APPROVED: Owner approves rental request
   */
  public async approveRental(societyId: string, rentalIdStr: string, ownerId: string): Promise<ISRRental> {
    const rental = await SRRental.findOne({
      ...this.getFilter(rentalIdStr),
      societyId: new Types.ObjectId(societyId),
      ownerId: new Types.ObjectId(ownerId),
      status: 'REQUESTED',
    });
    if (!rental) throw new Error('Rental request not found or unauthorized');

    rental.status = 'APPROVED';
    await rental.save();

    socketService.emitToUser(rental.borrowerId.toString(), 'share_rent:request_approved', {
      rentalId: rental.rentalId,
      itemTitle: rental.itemTitle,
    });

    return rental;
  }

  /**
   * 3. CHECKOUT: Borrower pays rental fee + security deposit into simulated escrow hold
   */
  public async checkoutRental(societyId: string, rentalIdStr: string, borrowerId: string): Promise<ISRRental> {
    const rental = await SRRental.findOne({
      ...this.getFilter(rentalIdStr),
      societyId: new Types.ObjectId(societyId),
      borrowerId: new Types.ObjectId(borrowerId),
      status: 'APPROVED',
    });
    if (!rental) throw new Error('Rental not ready for checkout');

    // Simulated escrow hold for total amount
    const escrow = await paymentService.processSimulatedPayment({
      societyId,
      payerId: borrowerId,
      amount: rental.totalAmount,
      type: 'HOLD',
      description: `Escrow hold for Rental ${rental.rentalId} (Fee: ₹${rental.rentalFee} + Deposit: ₹${rental.securityDeposit}) [SIMULATED]`,
      idempotencyKey: `ESCROW-SR-${rental._id}-${Date.now()}`,
    });

    const handoverToken = `SR-PASS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    rental.status = 'CHECKOUT';
    rental.escrowHoldId = escrow.idempotencyKey;
    rental.handoverToken = handoverToken;
    await rental.save();

    return rental;
  }

  /**
   * 4. IN_USE: Owner verifies handover token at item pickup
   */
  public async confirmHandover(
    societyId: string,
    rentalIdStr: string,
    ownerId: string,
    token: string
  ): Promise<ISRRental> {
    const rental = await SRRental.findOne({
      ...this.getFilter(rentalIdStr),
      societyId: new Types.ObjectId(societyId),
      ownerId: new Types.ObjectId(ownerId),
      status: 'CHECKOUT',
    });
    if (!rental) throw new Error('Rental not found in checkout status');

    if (rental.handoverToken !== token.trim().toUpperCase()) {
      throw new Error('Invalid handover token');
    }

    rental.status = 'IN_USE';
    rental.handoverAt = new Date();
    await rental.save();

    // Mark item unavailable
    await SRItem.findByIdAndUpdate(rental.itemId, { isAvailable: false });

    return rental;
  }

  /**
   * 5. RETURN INSPECTION: Owner inspects return (GOOD -> auto-refund; DAMAGED -> dispute)
   */
  public async returnInspection(
    societyId: string,
    rentalIdStr: string,
    ownerId: string,
    condition: ReturnCondition,
    notes?: string,
    disputeReason?: string
  ): Promise<ISRRental> {
    const rental = await SRRental.findOne({
      ...this.getFilter(rentalIdStr),
      societyId: new Types.ObjectId(societyId),
      ownerId: new Types.ObjectId(ownerId),
      status: 'IN_USE',
    });
    if (!rental) throw new Error('Rental not currently in use');

    rental.returnCondition = condition;
    rental.returnNotes = notes;
    rental.returnedAt = new Date();

    if (condition === 'GOOD' || condition === 'MINOR_WEAR') {
      // 1. Refund security deposit to borrower
      await paymentService.processSimulatedPayment({
        societyId,
        payerId: rental.borrowerId.toString(),
        amount: rental.securityDeposit,
        type: 'REFUND',
        description: `Refund security deposit for Rental ${rental.rentalId} [SIMULATED]`,
        idempotencyKey: `REFUND-DEP-${rental._id}`,
      });

      // 2. Release rental fee to owner
      await paymentService.processSimulatedPayment({
        societyId,
        payerId: rental.borrowerId.toString(),
        amount: rental.rentalFee,
        type: 'RELEASE',
        description: `Release rental fee for ${rental.rentalId} to owner ${rental.ownerName} [SIMULATED]`,
        idempotencyKey: `RELEASE-FEE-${rental._id}`,
      });

      rental.status = 'COMPLETED';
      rental.settledAt = new Date();
      // Item is available again
      await SRItem.findByIdAndUpdate(rental.itemId, { isAvailable: true });
    } else {
      // Damaged condition -> Raise Dispute
      rental.status = 'DISPUTED';
      rental.disputeReason = disputeReason || 'Item damaged during rental period';
    }

    await rental.save();
    return rental;
  }

  /**
   * 6. DISPUTE RESOLUTION: President reviews damage & deducts from deposit
   */
  public async resolveDispute(
    societyId: string,
    rentalIdStr: string,
    deductionAmount: number
  ): Promise<ISRRental> {
    const rental = await SRRental.findOne({
      ...this.getFilter(rentalIdStr),
      societyId: new Types.ObjectId(societyId),
      status: 'DISPUTED',
    });
    if (!rental) throw new Error('Disputed rental not found');

    const damageDeduction = Math.min(rental.securityDeposit, deductionAmount);
    const refundToBorrower = rental.securityDeposit - damageDeduction;

    // Refund remainder to borrower
    if (refundToBorrower > 0) {
      await paymentService.processSimulatedPayment({
        societyId,
        payerId: rental.borrowerId.toString(),
        amount: refundToBorrower,
        type: 'REFUND',
        description: `Dispute settlement partial deposit refund for ${rental.rentalId} [SIMULATED]`,
        idempotencyKey: `DISP-REFUND-${rental._id}`,
      });
    }

    // Release rental fee + damage compensation to owner
    await paymentService.processSimulatedPayment({
      societyId,
      payerId: rental.borrowerId.toString(),
      amount: rental.rentalFee + damageDeduction,
      type: 'RELEASE',
      description: `Dispute settlement fee + compensation to owner for ${rental.rentalId} [SIMULATED]`,
      idempotencyKey: `DISP-RELEASE-${rental._id}`,
    });

    rental.disputeDeduction = damageDeduction;
    rental.status = 'COMPLETED';
    rental.settledAt = new Date();
    await rental.save();

    await SRItem.findByIdAndUpdate(rental.itemId, { isAvailable: true });
    return rental;
  }

  /**
   * Get user's rentals (as borrower or owner)
   */
  public async getMyRentals(societyId: string, userId: string): Promise<{ borrowed: ISRRental[]; owned: ISRRental[] }> {
    const [borrowed, owned] = await Promise.all([
      SRRental.find({
        societyId: new Types.ObjectId(societyId),
        borrowerId: new Types.ObjectId(userId),
      }).sort({ createdAt: -1 }),
      SRRental.find({
        societyId: new Types.ObjectId(societyId),
        ownerId: new Types.ObjectId(userId),
      }).sort({ createdAt: -1 }),
    ]);
    return { borrowed, owned };
  }
}

export const shareRentService = new ShareRentService();
