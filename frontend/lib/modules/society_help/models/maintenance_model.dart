class MaintBillModel {
  final String id;
  final String flatNumber;
  final String? residentName;
  final String billingMonth;
  final double amount;
  final DateTime dueDate;
  final String status;
  final String? paymentMethod;
  final DateTime? paidAt;
  final String? receiptNumber;
  final String? transactionId;

  MaintBillModel({
    required this.id,
    required this.flatNumber,
    this.residentName,
    required this.billingMonth,
    required this.amount,
    required this.dueDate,
    required this.status,
    this.paymentMethod,
    this.paidAt,
    this.receiptNumber,
    this.transactionId,
  });

  bool get isPaid => status == 'PAID';

  factory MaintBillModel.fromJson(Map<String, dynamic> json) {
    return MaintBillModel(
      id: json['_id'] ?? '',
      flatNumber: json['flatNumber'] ?? '',
      residentName: json['residentName'],
      billingMonth: json['billingMonth'] ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      dueDate: DateTime.tryParse(json['dueDate'] ?? '') ?? DateTime.now(),
      status: json['status'] ?? 'PENDING',
      paymentMethod: json['paymentMethod'],
      paidAt: json['paidAt'] != null ? DateTime.tryParse(json['paidAt']) : null,
      receiptNumber: json['receiptNumber'],
      transactionId: json['transactionId'],
    );
  }
}

class MaintExpenseModel {
  final String id;
  final String title;
  final String category;
  final double amount;
  final DateTime expenseDate;
  final String? vendorName;

  MaintExpenseModel({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    required this.expenseDate,
    this.vendorName,
  });

  factory MaintExpenseModel.fromJson(Map<String, dynamic> json) {
    return MaintExpenseModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      category: json['category'] ?? 'MISC',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      expenseDate: DateTime.tryParse(json['expenseDate'] ?? '') ?? DateTime.now(),
      vendorName: json['vendorName'],
    );
  }
}

class MaintMonthlySummaryModel {
  final String id;
  final String billingMonth;
  final double openingBalance;
  final double actualCollections;
  final double pendingCollections;
  final double totalExpenses;
  final double closingBalance;
  final bool isClosed;

  MaintMonthlySummaryModel({
    required this.id,
    required this.billingMonth,
    required this.openingBalance,
    required this.actualCollections,
    required this.pendingCollections,
    required this.totalExpenses,
    required this.closingBalance,
    required this.isClosed,
  });

  factory MaintMonthlySummaryModel.fromJson(Map<String, dynamic> json) {
    return MaintMonthlySummaryModel(
      id: json['_id'] ?? '',
      billingMonth: json['billingMonth'] ?? '',
      openingBalance: (json['openingBalance'] as num?)?.toDouble() ?? 0.0,
      actualCollections: (json['actualCollections'] as num?)?.toDouble() ?? 0.0,
      pendingCollections: (json['pendingCollections'] as num?)?.toDouble() ?? 0.0,
      totalExpenses: (json['totalExpenses'] as num?)?.toDouble() ?? 0.0,
      closingBalance: (json['closingBalance'] as num?)?.toDouble() ?? 0.0,
      isClosed: json['isClosed'] ?? false,
    );
  }
}
