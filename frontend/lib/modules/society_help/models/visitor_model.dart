class VisitPassModel {
  final String id;
  final String passToken;
  final String visitorName;
  final String visitorPhone;
  final String visitorType;
  final String passType;
  final int expectedCount;
  final int admittedCount;
  final int validityHours;
  final DateTime validFrom;
  final DateTime validUntil;
  final String status;
  final String? flatNumber;
  final String? replacedByToken;
  final DateTime? usedAt;

  VisitPassModel({
    required this.id,
    required this.passToken,
    required this.visitorName,
    required this.visitorPhone,
    required this.visitorType,
    required this.passType,
    required this.expectedCount,
    required this.admittedCount,
    required this.validityHours,
    required this.validFrom,
    required this.validUntil,
    required this.status,
    this.flatNumber,
    this.replacedByToken,
    this.usedAt,
  });

  bool get isExpired => DateTime.now().isAfter(validUntil) || status == 'EXPIRED';
  bool get isActive => status == 'ACTIVE' && !isExpired;

  factory VisitPassModel.fromJson(Map<String, dynamic> json) {
    return VisitPassModel(
      id: json['_id'] ?? '',
      passToken: json['passToken'] ?? '',
      visitorName: json['visitorName'] ?? '',
      visitorPhone: json['visitorPhone'] ?? '',
      visitorType: json['visitorType'] ?? 'GUEST',
      passType: json['passType'] ?? 'INDIVIDUAL',
      expectedCount: json['expectedCount'] ?? 1,
      admittedCount: json['admittedCount'] ?? 0,
      validityHours: json['validityHours'] ?? 2,
      validFrom: DateTime.tryParse(json['validFrom'] ?? '') ?? DateTime.now(),
      validUntil: DateTime.tryParse(json['validUntil'] ?? '') ?? DateTime.now(),
      status: json['status'] ?? 'ACTIVE',
      flatNumber: json['flatNumber'],
      replacedByToken: json['replacedByToken'],
      usedAt: json['usedAt'] != null ? DateTime.tryParse(json['usedAt']) : null,
    );
  }
}

class VisitRequestModel {
  final String id;
  final String flatNumber;
  final String visitorName;
  final String visitorPhone;
  final String purpose;
  final String? vehicleNumber;
  final String status;
  final String? passToken;
  final DateTime createdAt;

  VisitRequestModel({
    required this.id,
    required this.flatNumber,
    required this.visitorName,
    required this.visitorPhone,
    required this.purpose,
    this.vehicleNumber,
    required this.status,
    this.passToken,
    required this.createdAt,
  });

  factory VisitRequestModel.fromJson(Map<String, dynamic> json) {
    return VisitRequestModel(
      id: json['_id'] ?? '',
      flatNumber: json['flatNumber'] ?? '',
      visitorName: json['visitorName'] ?? '',
      visitorPhone: json['visitorPhone'] ?? '',
      purpose: json['purpose'] ?? '',
      vehicleNumber: json['vehicleNumber'],
      status: json['status'] ?? 'PENDING',
      passToken: json['passToken'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
