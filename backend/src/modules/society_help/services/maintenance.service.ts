import { Types } from 'mongoose';
import { MaintBill, IMaintBill, MaintPaymentMethod } from '../models/maint_bill.model.js';
import { MaintExpense, IMaintExpense, ExpenseCategory } from '../models/maint_expense.model.js';
import { MaintMonthlySummary, IMaintMonthlySummary } from '../models/maint_monthly_summary.model.js';
import { Flat } from '../../../core/models/flat.model.js';
import { paymentService } from '../../../core/payments/payment.service.js';

export class MaintenanceService {
  /**
   * President generates monthly maintenance bills for all flats
   */
  public async generateMonthlyBills(
    societyId: string,
    billingMonth: string, // 'YYYY-MM'
    amount: number,
    dueDate: Date
  ): Promise<{ generatedCount: number; message: string }> {
    const flats = await Flat.find({ societyId: new Types.ObjectId(societyId) }).populate('residentId');

    let count = 0;
    for (const flat of flats) {
      const existing = await MaintBill.findOne({
        societyId: new Types.ObjectId(societyId),
        flatId: flat._id,
        billingMonth,
      });

      if (!existing) {
        const resident = flat.residentId as any;
        const bill = new MaintBill({
          societyId: new Types.ObjectId(societyId),
          flatId: flat._id,
          flatNumber: flat.flatNumber,
          residentId: resident?._id,
          residentName: resident?.name || 'Unassigned',
          billingMonth,
          amount,
          dueDate,
          status: 'PENDING',
        });
        await bill.save();
        count++;
      }
    }

    return {
      generatedCount: count,
      message: `Generated ${count} maintenance bills for month ${billingMonth}`,
    };
  }

  /**
   * Resident pays bill via Simulated Payment Gateway
   */
  public async payBillSimulated(
    societyId: string,
    billId: string,
    residentId: string
  ): Promise<{ success: boolean; bill: IMaintBill; receiptNumber: string }> {
    const bill = await MaintBill.findOne({
      _id: new Types.ObjectId(billId),
      societyId: new Types.ObjectId(societyId),
      status: { $in: ['PENDING', 'OVERDUE'] },
    });

    if (!bill) {
      throw new Error('Bill not found or already paid');
    }

    // Process through simulated payment ledger with idempotency
    const idempotencyKey = `MAINT-${bill._id}-${bill.billingMonth}`;
    const payment = await paymentService.processSimulatedPayment({
      societyId,
      payerId: residentId,
      amount: bill.amount,
      type: 'MAINTENANCE_PAYMENT',
      description: `Maintenance Bill ${bill.billingMonth} for Flat ${bill.flatNumber} [SIMULATED]`,
      idempotencyKey,
    });

    const receiptNumber = `RCPT-${bill.billingMonth.replace('-', '')}-${bill.flatNumber}`;

    bill.status = 'PAID';
    bill.paymentMethod = 'SIMULATED_ONLINE';
    bill.paidAt = new Date();
    bill.receiptNumber = receiptNumber;
    bill.transactionId = payment.idempotencyKey;
    await bill.save();

    return {
      success: true,
      bill,
      receiptNumber,
    };
  }

  /**
   * President records offline cash or cheque payment
   */
  public async recordOfflinePayment(
    societyId: string,
    billId: string,
    presidentId: string,
    method: 'OFFLINE_CASH' | 'OFFLINE_CHEQUE',
    notes?: string
  ): Promise<IMaintBill> {
    const bill = await MaintBill.findOne({
      _id: new Types.ObjectId(billId),
      societyId: new Types.ObjectId(societyId),
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    if (bill.status === 'PAID') {
      throw new Error('Bill is already marked as paid');
    }

    bill.status = 'PAID';
    bill.paymentMethod = method;
    bill.paidAt = new Date();
    bill.receiptNumber = `RCPT-OFF-${Date.now().toString().slice(-6)}`;
    bill.offlineNotes = notes;
    bill.verifiedByPresidentId = new Types.ObjectId(presidentId);
    await bill.save();

    return bill;
  }

  /**
   * President logs society expenditure
   */
  public async recordExpense(
    societyId: string,
    presidentId: string,
    title: string,
    category: ExpenseCategory,
    amount: number,
    billingMonth: string,
    vendorName?: string,
    receiptUrl?: string
  ): Promise<IMaintExpense> {
    const expense = new MaintExpense({
      societyId: new Types.ObjectId(societyId),
      billingMonth,
      title,
      category,
      amount,
      expenseDate: new Date(),
      vendorName,
      receiptUrl,
      recordedById: new Types.ObjectId(presidentId),
    });

    await expense.save();
    return expense;
  }

  /**
   * Strict carry-forward financial math:
   * available_balance = prev_closing_balance + actual_collections
   * closing_balance = available_balance - total_expenses
   * pending_collections tracked separately without inflating closing balance.
   */
  public async calculateAndCloseMonth(
    societyId: string,
    billingMonth: string,
    presidentId: string,
    closeMonth = false
  ): Promise<IMaintMonthlySummary> {
    // 1. Determine previous month's closing balance (opening balance)
    const [yearStr, monthStr] = billingMonth.split('-');
    let prevYear = parseInt(yearStr, 10);
    let prevMonth = parseInt(monthStr, 10) - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevBillingMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

    const prevSummary = await MaintMonthlySummary.findOne({
      societyId: new Types.ObjectId(societyId),
      billingMonth: prevBillingMonth,
    });
    const openingBalance = prevSummary ? prevSummary.closingBalance : 0;

    // 2. Aggregate Collections for this month
    const bills = await MaintBill.find({
      societyId: new Types.ObjectId(societyId),
      billingMonth,
    });

    let actualCollections = 0;
    let pendingCollections = 0;
    for (const b of bills) {
      if (b.status === 'PAID') {
        actualCollections += b.amount;
      } else {
        pendingCollections += b.amount;
      }
    }

    // 3. Aggregate Expenses for this month
    const expenses = await MaintExpense.find({
      societyId: new Types.ObjectId(societyId),
      billingMonth,
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 4. Mathematical Carry-Forward Balance
    const availableBalance = openingBalance + actualCollections;
    const closingBalance = availableBalance - totalExpenses;

    // 5. Upsert Summary (Idempotent to avoid duplicate additions)
    let summary = await MaintMonthlySummary.findOne({
      societyId: new Types.ObjectId(societyId),
      billingMonth,
    });

    if (!summary) {
      summary = new MaintMonthlySummary({
        societyId: new Types.ObjectId(societyId),
        billingMonth,
        openingBalance,
        actualCollections,
        pendingCollections,
        totalExpenses,
        closingBalance,
        isClosed: closeMonth,
        closedAt: closeMonth ? new Date() : undefined,
        closedById: closeMonth ? new Types.ObjectId(presidentId) : undefined,
      });
    } else {
      summary.openingBalance = openingBalance;
      summary.actualCollections = actualCollections;
      summary.pendingCollections = pendingCollections;
      summary.totalExpenses = totalExpenses;
      summary.closingBalance = closingBalance;
      if (closeMonth && !summary.isClosed) {
        summary.isClosed = true;
        summary.closedAt = new Date();
        summary.closedById = new Types.ObjectId(presidentId);
      }
    }

    await summary.save();
    return summary;
  }

  /**
   * Get maintenance dashboard data for Resident or President
   */
  public async getMaintenanceOverview(societyId: string, billingMonth: string, residentId?: string): Promise<any> {
    const filter: any = { societyId: new Types.ObjectId(societyId), billingMonth };
    if (residentId) {
      filter.residentId = new Types.ObjectId(residentId);
    }

    const [bills, expenses, summary] = await Promise.all([
      MaintBill.find(filter).sort({ flatNumber: 1 }),
      MaintExpense.find({ societyId: new Types.ObjectId(societyId), billingMonth }).sort({ expenseDate: -1 }),
      MaintMonthlySummary.findOne({ societyId: new Types.ObjectId(societyId), billingMonth }),
    ]);

    return { bills, expenses, summary };
  }
}

export const maintenanceService = new MaintenanceService();
