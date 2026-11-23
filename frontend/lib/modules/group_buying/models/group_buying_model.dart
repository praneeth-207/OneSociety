class DealTierModel {
  final int minQty;
  final int? maxQty;
  final double pricePerUnit;

  DealTierModel({
    required this.minQty,
    this.maxQty,
    required this.pricePerUnit,
  });

  factory DealTierModel.fromJson(Map<String, dynamic> json) {
    return DealTierModel(
      minQty: json['minQty'] ?? 1,
      maxQty: json['maxQty'],
      pricePerUnit: (json['pricePerUnit'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class GBDealModel {
  final String id;
  final String dealId;
  final String supplierName;
  final String title;
  final String category;
  final String description;
  final String unit;
  final List<DealTierModel> tiers;
  final int minTargetQty;
  final int currentTotalQty;
  final double currentPrice;
  final String status;
  final DateTime deadline;
  final DateTime deliveryDate;
  final String? manifestQrToken;

  GBDealModel({
    required this.id,
    required this.dealId,
    required this.supplierName,
    required this.title,
    required this.category,
    required this.description,
    required this.unit,
    required this.tiers,
    required this.minTargetQty,
    required this.currentTotalQty,
    required this.currentPrice,
    required this.status,
    required this.deadline,
    required this.deliveryDate,
    this.manifestQrToken,
  });

  double get progressPercentage => (currentTotalQty / minTargetQty).clamp(0.0, 1.0);

  factory GBDealModel.fromJson(Map<String, dynamic> json) {
    return GBDealModel(
      id: json['_id'] ?? '',
      dealId: json['dealId'] ?? '',
      supplierName: json['supplierName'] ?? '',
      title: json['title'] ?? '',
      category: json['category'] ?? '',
      description: json['description'] ?? '',
      unit: json['unit'] ?? 'Box',
      tiers: (json['tiers'] as List? ?? []).map((t) => DealTierModel.fromJson(t)).toList(),
      minTargetQty: json['minTargetQty'] ?? 20,
      currentTotalQty: json['currentTotalQty'] ?? 0,
      currentPrice: (json['currentPrice'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'OPEN',
      deadline: DateTime.tryParse(json['deadline'] ?? '') ?? DateTime.now(),
      deliveryDate: DateTime.tryParse(json['deliveryDate'] ?? '') ?? DateTime.now(),
      manifestQrToken: json['manifestQrToken'],
    );
  }
}

class GBOrderModel {
  final String id;
  final String orderId;
  final String dealTitle;
  final int quantity;
  final double initialPledgedPrice;
  final double finalEffectivePrice;
  final double totalPledgedAmount;
  final double refundDifference;
  final String status;
  final String? doorDeliveryToken;

  GBOrderModel({
    required this.id,
    required this.orderId,
    required this.dealTitle,
    required this.quantity,
    required this.initialPledgedPrice,
    required this.finalEffectivePrice,
    required this.totalPledgedAmount,
    required this.refundDifference,
    required this.status,
    this.doorDeliveryToken,
  });

  factory GBOrderModel.fromJson(Map<String, dynamic> json) {
    return GBOrderModel(
      id: json['_id'] ?? '',
      orderId: json['orderId'] ?? '',
      dealTitle: json['dealTitle'] ?? '',
      quantity: json['quantity'] ?? 1,
      initialPledgedPrice: (json['initialPledgedPrice'] as num?)?.toDouble() ?? 0.0,
      finalEffectivePrice: (json['finalEffectivePrice'] as num?)?.toDouble() ?? 0.0,
      totalPledgedAmount: (json['totalPledgedAmount'] as num?)?.toDouble() ?? 0.0,
      refundDifference: (json['refundDifference'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'PLEDGED',
      doorDeliveryToken: json['doorDeliveryToken'],
    );
  }
}
