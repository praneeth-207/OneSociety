class SRItemModel {
  final String id;
  final String ownerName;
  final String ownerFlatNumber;
  final String title;
  final String category;
  final String description;
  final double dailyRate;
  final double securityDeposit;
  final bool isAvailable;

  SRItemModel({
    required this.id,
    required this.ownerName,
    required this.ownerFlatNumber,
    required this.title,
    required this.category,
    required this.description,
    required this.dailyRate,
    required this.securityDeposit,
    required this.isAvailable,
  });

  factory SRItemModel.fromJson(Map<String, dynamic> json) {
    return SRItemModel(
      id: json['_id'] ?? '',
      ownerName: json['ownerName'] ?? '',
      ownerFlatNumber: json['ownerFlatNumber'] ?? '',
      title: json['title'] ?? '',
      category: json['category'] ?? 'OTHER',
      description: json['description'] ?? '',
      dailyRate: (json['dailyRate'] as num?)?.toDouble() ?? 50.0,
      securityDeposit: (json['securityDeposit'] as num?)?.toDouble() ?? 500.0,
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}

class SRRentalModel {
  final String id;
  final String rentalId;
  final String itemTitle;
  final String ownerName;
  final String ownerFlatNumber;
  final String borrowerName;
  final String borrowerFlatNumber;
  final String startDate;
  final String endDate;
  final int rentalDays;
  final double dailyRate;
  final double rentalFee;
  final double securityDeposit;
  final double totalAmount;
  final String status;
  final String? handoverToken;
  final String? returnCondition;
  final String? disputeReason;

  SRRentalModel({
    required this.id,
    required this.rentalId,
    required this.itemTitle,
    required this.ownerName,
    required this.ownerFlatNumber,
    required this.borrowerName,
    required this.borrowerFlatNumber,
    required this.startDate,
    required this.endDate,
    required this.rentalDays,
    required this.dailyRate,
    required this.rentalFee,
    required this.securityDeposit,
    required this.totalAmount,
    required this.status,
    this.handoverToken,
    this.returnCondition,
    this.disputeReason,
  });

  factory SRRentalModel.fromJson(Map<String, dynamic> json) {
    return SRRentalModel(
      id: json['_id'] ?? '',
      rentalId: json['rentalId'] ?? '',
      itemTitle: json['itemTitle'] ?? '',
      ownerName: json['ownerName'] ?? '',
      ownerFlatNumber: json['ownerFlatNumber'] ?? '',
      borrowerName: json['borrowerName'] ?? '',
      borrowerFlatNumber: json['borrowerFlatNumber'] ?? '',
      startDate: json['startDate'] ?? '',
      endDate: json['endDate'] ?? '',
      rentalDays: json['rentalDays'] ?? 1,
      dailyRate: (json['dailyRate'] as num?)?.toDouble() ?? 0.0,
      rentalFee: (json['rentalFee'] as num?)?.toDouble() ?? 0.0,
      securityDeposit: (json['securityDeposit'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'REQUESTED',
      handoverToken: json['handoverToken'],
      returnCondition: json['returnCondition'],
      disputeReason: json['disputeReason'],
    );
  }
}
