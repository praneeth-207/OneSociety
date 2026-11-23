import { Types } from 'mongoose';
import { SHProviderProfile, ISHProviderProfile } from '../models/sh_provider_profile.model.js';
import { SHSlot, ISHSlot } from '../models/sh_slot.model.js';
import { SHBooking, ISHBooking, BookingStatus } from '../models/sh_booking.model.js';
import { User } from '../../../core/models/user.model.js';
import { paymentService } from '../../../core/payments/payment.service.js';
import { socketService } from '../../../core/socket/socket.service.js';

let bookingSeq = 1000;

export class ServiceHubService {
  /**
   * Register or update service provider profile
   */
  public async upsertProfile(
    societyId: string,
    userId: string,
    skills: string[],
    bio: string,
    ratePerSlot: number,
    providerType: 'RESIDENT' | 'EXTERNAL',
    idProofUrl?: string,
    verificationStatus?: 'PENDING' | 'APPROVED'
  ): Promise<ISHProviderProfile> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let profile = await SHProviderProfile.findOne({
      societyId: new Types.ObjectId(societyId),
      userId: new Types.ObjectId(userId),
    });

    const status = verificationStatus || (providerType === 'RESIDENT' ? 'APPROVED' : 'APPROVED');

    if (!profile) {
      profile = new SHProviderProfile({
        societyId: new Types.ObjectId(societyId),
        userId: new Types.ObjectId(userId),
        providerName: user.name,
        phone: user.phone,
        providerType,
        skills,
        bio,
        ratePerSlot,
        verificationStatus: status,
        idProofUrl,
      });
    } else {
      profile.skills = skills;
      profile.bio = bio;
      profile.ratePerSlot = ratePerSlot;
      if (verificationStatus) profile.verificationStatus = verificationStatus;
      if (idProofUrl) profile.idProofUrl = idProofUrl;
    }

    await profile.save();
    return profile;
  }

  /**
   * Get available approved providers for a society
   */
  public async getProviders(societyId: string, skillCategory?: string): Promise<ISHProviderProfile[]> {
    const filter: any = {
      societyId: new Types.ObjectId(societyId),
      verificationStatus: 'APPROVED',
    };
    if (skillCategory) {
      filter.skills = { $in: [skillCategory] };
    }
    return SHProviderProfile.find(filter).sort({ ratingAverage: -1 });
  }

  /**
   * Generate dedicated housemaid time slots for a date
   */
  public async generateSlotsForDate(
    societyId: string,
    providerId: string,
    date: string, // 'YYYY-MM-DD'
    category: string = 'HOUSEMAID'
  ): Promise<ISHSlot[]> {
    const provider = await User.findById(providerId);
    if (!provider) throw new Error('Provider not found');

    const defaultSlots = [
      '07:00 - 08:00',
      '08:00 - 09:00',
      '09:00 - 10:00',
      '10:00 - 11:00',
      '16:00 - 17:00',
      '17:00 - 18:00',
    ];

    const slots: ISHSlot[] = [];
    for (const timeSlot of defaultSlots) {
      let slot = await SHSlot.findOne({
        societyId: new Types.ObjectId(societyId),
        providerId: new Types.ObjectId(providerId),
        date,
        timeSlot,
      });

      if (!slot) {
        slot = new SHSlot({
          societyId: new Types.ObjectId(societyId),
          providerId: new Types.ObjectId(providerId),
          providerName: provider.name,
          serviceCategory: category,
          date,
          timeSlot,
          isBooked: false,
        });
        await slot.save();
      }
      slots.push(slot);
    }

    return slots;
  }

  /**
   * Get available unbooked slots
   */
  public async getAvailableSlots(societyId: string, providerId: string, date: string): Promise<ISHSlot[]> {
    return SHSlot.find({
      societyId: new Types.ObjectId(societyId),
      providerId: new Types.ObjectId(providerId),
      date,
    }).sort({ timeSlot: 1 });
  }

  /**
   * Book a slot with simulated escrow hold
   */
  public async bookSlot(
    societyId: string,
    residentId: string,
    slotId: string,
    description: string
  ): Promise<ISHBooking> {
    const resident = await User.findById(residentId);
    if (!resident) throw new Error('Resident not found');

    const slot = await SHSlot.findOne({
      _id: new Types.ObjectId(slotId),
      societyId: new Types.ObjectId(societyId),
    });

    if (!slot) throw new Error('Slot not found');
    if (slot.isBooked) throw new Error('This time slot is already booked');

    const profile = await SHProviderProfile.findOne({
      societyId: new Types.ObjectId(societyId),
      userId: slot.providerId,
    });
    const amount = profile?.ratePerSlot || 500;

    // Process Simulated Escrow Hold
    bookingSeq++;
    const bookingId = `#SH-${bookingSeq}`;
    const escrowHold = await paymentService.processSimulatedPayment({
      societyId,
      payerId: residentId,
      amount,
      type: 'HOLD',
      description: `Escrow hold for Service Booking ${bookingId} (${slot.providerName}) [SIMULATED]`,
      idempotencyKey: `ESCROW-SH-${slot._id}-${Date.now()}`,
    });

    const booking = new SHBooking({
      bookingId,
      societyId: new Types.ObjectId(societyId),
      residentId: new Types.ObjectId(residentId),
      residentName: resident.name,
      flatNumber: resident.flatNumber || 'A-101',
      providerId: slot.providerId,
      providerName: slot.providerName,
      serviceCategory: slot.serviceCategory,
      description,
      scheduledDate: slot.date,
      timeSlot: slot.timeSlot,
      slotId: slot._id,
      escrowAmount: amount,
      escrowHoldId: escrowHold.idempotencyKey,
      status: 'REQUESTED',
    });
    await booking.save();

    // Mark slot booked
    slot.isBooked = true;
    slot.bookedByResidentId = new Types.ObjectId(residentId);
    slot.bookedFlatNumber = resident.flatNumber || 'A-101';
    slot.bookingId = booking._id as any;
    await slot.save();

    // Notify provider via Socket.IO
    socketService.emitToUser(slot.providerId.toString(), 'service:booking_received', {
      bookingId: booking.bookingId,
      service: booking.serviceCategory,
      flatNumber: booking.flatNumber,
      timeSlot: booking.timeSlot,
      scheduledDate: booking.scheduledDate,
    });

    return booking;
  }

  private getBookingFilter(idStr: string) {
    const decoded = decodeURIComponent(idStr).trim();
    const cleanId = decoded.replace('#', '');
    return {
      $or: [
        { bookingId: decoded },
        { bookingId: idStr },
        { bookingId: `#${cleanId}` },
        { bookingId: cleanId },
        ...(Types.ObjectId.isValid(cleanId) ? [{ _id: new Types.ObjectId(cleanId) }] : []),
      ],
    };
  }

  /**
   * Provider updates booking status (ACCEPTED, IN_PROGRESS, COMPLETED)
   */
  public async updateBookingStatus(
    societyId: string,
    bookingIdStr: string,
    providerId: string,
    status: BookingStatus
  ): Promise<ISHBooking> {
    const booking = await SHBooking.findOne({
      ...this.getBookingFilter(bookingIdStr),
      societyId: new Types.ObjectId(societyId),
      providerId: new Types.ObjectId(providerId),
    });

    if (!booking) throw new Error('Booking not found or unauthorized');

    booking.status = status;
    if (status === 'COMPLETED') {
      booking.completedAt = new Date();
    }
    await booking.save();

    // Notify resident
    socketService.emitToUser(booking.residentId.toString(), 'service:booking_updated', {
      bookingId: booking.bookingId,
      status: booking.status,
    });

    return booking;
  }

  /**
   * Resident settles completed service and rates provider
   */
  public async settleAndRate(
    societyId: string,
    bookingIdStr: string,
    residentId: string,
    rating: number,
    reviewText?: string
  ): Promise<ISHBooking> {
    const booking = await SHBooking.findOne({
      ...this.getBookingFilter(bookingIdStr),
      societyId: new Types.ObjectId(societyId),
      residentId: new Types.ObjectId(residentId),
      status: 'COMPLETED',
    });

    if (!booking) throw new Error('Booking must be in COMPLETED status to settle escrow');

    // Release escrow hold
    await paymentService.processSimulatedPayment({
      societyId,
      payerId: residentId,
      amount: booking.escrowAmount,
      type: 'RELEASE',
      description: `Settled escrow payout for ${booking.bookingId} to ${booking.providerName} [SIMULATED]`,
      idempotencyKey: `SETTLE-SH-${booking._id}`,
    });

    booking.status = 'SETTLED';
    booking.rating = rating;
    booking.reviewText = reviewText;
    await booking.save();

    // Update provider profile rating average
    const profile = await SHProviderProfile.findOne({
      societyId: new Types.ObjectId(societyId),
      userId: booking.providerId,
    });

    if (profile) {
      const newTotal = profile.totalReviews + 1;
      profile.ratingAverage = Number(
        (((profile.ratingAverage * profile.totalReviews) + rating) / newTotal).toFixed(1)
      );
      profile.totalReviews = newTotal;
      await profile.save();
    }

    return booking;
  }

  /**
   * Get resident's bookings or provider's tasks
   */
  public async getBookings(societyId: string, userId: string, isProvider: boolean): Promise<ISHBooking[]> {
    const filter: any = { societyId: new Types.ObjectId(societyId) };
    if (isProvider) {
      filter.providerId = new Types.ObjectId(userId);
    } else {
      filter.residentId = new Types.ObjectId(userId);
    }
    return SHBooking.find(filter).sort({ createdAt: -1 });
  }
}

export const serviceHubService = new ServiceHubService();
