class ProviderProfileModel {
  final String id;
  final String userId;
  final String providerName;
  final String phone;
  final String providerType;
  final List<String> skills;
  final String bio;
  final double ratePerSlot;
  final String verificationStatus;
  final double ratingAverage;
  final int totalReviews;

  ProviderProfileModel({
    required this.id,
    required this.userId,
    required this.providerName,
    required this.phone,
    required this.providerType,
    required this.skills,
    required this.bio,
    required this.ratePerSlot,
    required this.verificationStatus,
    required this.ratingAverage,
    required this.totalReviews,
  });

  factory ProviderProfileModel.fromJson(Map<String, dynamic> json) {
    return ProviderProfileModel(
      id: json['_id'] ?? '',
      userId: json['userId'] ?? '',
      providerName: json['providerName'] ?? '',
      phone: json['phone'] ?? '',
      providerType: json['providerType'] ?? 'RESIDENT',
      skills: (json['skills'] as List? ?? []).map((e) => e.toString()).toList(),
      bio: json['bio'] ?? '',
      ratePerSlot: (json['ratePerSlot'] as num?)?.toDouble() ?? 500.0,
      verificationStatus: json['verificationStatus'] ?? 'APPROVED',
      ratingAverage: (json['ratingAverage'] as num?)?.toDouble() ?? 5.0,
      totalReviews: json['totalReviews'] ?? 0,
    );
  }
}

class SlotModel {
  final String id;
  final String providerId;
  final String providerName;
  final String serviceCategory;
  final String date;
  final String timeSlot;
  final bool isBooked;

  SlotModel({
    required this.id,
    required this.providerId,
    required this.providerName,
    required this.serviceCategory,
    required this.date,
    required this.timeSlot,
    required this.isBooked,
  });

  factory SlotModel.fromJson(Map<String, dynamic> json) {
    return SlotModel(
      id: json['_id'] ?? '',
      providerId: json['providerId'] ?? '',
      providerName: json['providerName'] ?? '',
      serviceCategory: json['serviceCategory'] ?? '',
      date: json['date'] ?? '',
      timeSlot: json['timeSlot'] ?? '',
      isBooked: json['isBooked'] ?? false,
    );
  }
}

class ServiceBookingModel {
  final String id;
  final String bookingId;
  final String residentName;
  final String flatNumber;
  final String providerName;
  final String serviceCategory;
  final String description;
  final String scheduledDate;
  final String timeSlot;
  final double escrowAmount;
  final String status;
  final int? rating;
  final String? reviewText;

  ServiceBookingModel({
    required this.id,
    required this.bookingId,
    required this.residentName,
    required this.flatNumber,
    required this.providerName,
    required this.serviceCategory,
    required this.description,
    required this.scheduledDate,
    required this.timeSlot,
    required this.escrowAmount,
    required this.status,
    this.rating,
    this.reviewText,
  });

  factory ServiceBookingModel.fromJson(Map<String, dynamic> json) {
    return ServiceBookingModel(
      id: json['_id'] ?? '',
      bookingId: json['bookingId'] ?? '',
      residentName: json['residentName'] ?? '',
      flatNumber: json['flatNumber'] ?? '',
      providerName: json['providerName'] ?? '',
      serviceCategory: json['serviceCategory'] ?? '',
      description: json['description'] ?? '',
      scheduledDate: json['scheduledDate'] ?? '',
      timeSlot: json['timeSlot'] ?? '',
      escrowAmount: (json['escrowAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'REQUESTED',
      rating: json['rating'],
      reviewText: json['reviewText'],
    );
  }
}
