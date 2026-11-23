class TimelineItem {
  final String status;
  final String actorName;
  final String actorRole;
  final String? note;
  final String? photoUrl;
  final DateTime timestamp;

  TimelineItem({
    required this.status,
    required this.actorName,
    required this.actorRole,
    this.note,
    this.photoUrl,
    required this.timestamp,
  });

  factory TimelineItem.fromJson(Map<String, dynamic> json) {
    return TimelineItem(
      status: json['status'] ?? '',
      actorName: json['actorName'] ?? '',
      actorRole: json['actorRole'] ?? '',
      note: json['note'],
      photoUrl: json['photoUrl'],
      timestamp: DateTime.tryParse(json['timestamp'] ?? '') ?? DateTime.now(),
    );
  }
}

class ExpenseApproval {
  final String? vendorName;
  final String? vendorPhone;
  final double? quotationAmount;
  final String? quotationFileUrl;
  final String? status;
  final String? comment;

  ExpenseApproval({
    this.vendorName,
    this.vendorPhone,
    this.quotationAmount,
    this.quotationFileUrl,
    this.status,
    this.comment,
  });

  factory ExpenseApproval.fromJson(Map<String, dynamic> json) {
    return ExpenseApproval(
      vendorName: json['vendorName'],
      vendorPhone: json['vendorPhone'],
      quotationAmount: (json['quotationAmount'] as num?)?.toDouble(),
      quotationFileUrl: json['quotationFileUrl'],
      status: json['status'],
      comment: json['comment'],
    );
  }
}

class Assignment {
  final String? providerName;
  final String? providerPhone;
  final String? providerType;
  final bool isExternalVendor;
  final double? estimatedCost;
  final DateTime? expectedCompletionDate;

  Assignment({
    this.providerName,
    this.providerPhone,
    this.providerType,
    required this.isExternalVendor,
    this.estimatedCost,
    this.expectedCompletionDate,
  });

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      providerName: json['providerName'],
      providerPhone: json['providerPhone'],
      providerType: json['providerType'],
      isExternalVendor: json['isExternalVendor'] ?? false,
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble(),
      expectedCompletionDate: json['expectedCompletionDate'] != null
          ? DateTime.tryParse(json['expectedCompletionDate'])
          : null,
    );
  }
}

class AIAnalysis {
  final String category;
  final String subcategory;
  final String priority;
  final String location;
  final String suggestedProviderType;
  final double? confidence;
  final bool isEmergency;
  final String scopeFlag;
  final String summary;

  AIAnalysis({
    required this.category,
    required this.subcategory,
    required this.priority,
    required this.location,
    required this.suggestedProviderType,
    this.confidence,
    required this.isEmergency,
    required this.scopeFlag,
    required this.summary,
  });

  factory AIAnalysis.fromJson(Map<String, dynamic> json) {
    return AIAnalysis(
      category: json['category'] ?? '',
      subcategory: json['subcategory'] ?? '',
      priority: json['priority'] ?? 'LOW',
      location: json['location'] ?? '',
      suggestedProviderType: json['suggestedProviderType'] ?? '',
      confidence: (json['confidence'] as num?)?.toDouble(),
      isEmergency: json['isEmergency'] ?? false,
      scopeFlag: json['scopeFlag'] ?? 'IN_SCOPE',
      summary: json['summary'] ?? '',
    );
  }
}

class ComplaintModel {
  final String id;
  final String complaintId;
  final String reporterId;
  final String reporterName;
  final String reporterPhone;
  final String reporterFlatNumber;
  final String title;
  final String description;
  final List<String> photos;
  final String category;
  final String subcategory;
  final String block;
  final String commonArea;
  final String priority;
  final String status;
  final String scopeFlag;
  final bool isEmergency;
  final String? workSize;
  final ExpenseApproval? expenseApproval;
  final Assignment? assignment;
  final AIAnalysis? aiAnalysis;
  final List<TimelineItem> timeline;
  final int reopenCount;
  final int? rating;
  final String? feedback;
  final DateTime createdAt;

  ComplaintModel({
    required this.id,
    required this.complaintId,
    required this.reporterId,
    required this.reporterName,
    required this.reporterPhone,
    required this.reporterFlatNumber,
    required this.title,
    required this.description,
    required this.photos,
    required this.category,
    required this.subcategory,
    required this.block,
    required this.commonArea,
    required this.priority,
    required this.status,
    required this.scopeFlag,
    required this.isEmergency,
    this.workSize,
    this.expenseApproval,
    this.assignment,
    this.aiAnalysis,
    required this.timeline,
    required this.reopenCount,
    this.rating,
    this.feedback,
    required this.createdAt,
  });

  factory ComplaintModel.fromJson(Map<String, dynamic> json) {
    final loc = json['location'] as Map<String, dynamic>? ?? {};
    return ComplaintModel(
      id: json['_id'] ?? json['id'] ?? '',
      complaintId: json['complaintId'] ?? '',
      reporterId: json['reporterId'] is Map ? json['reporterId']['_id'] : (json['reporterId'] ?? ''),
      reporterName: json['reporterName'] ?? 'Resident',
      reporterPhone: json['reporterPhone'] ?? '',
      reporterFlatNumber: json['reporterFlatNumber'] ?? 'Common',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      photos: (json['photos'] as List?)?.map((e) => e.toString()).toList() ?? [],
      category: json['category'] ?? 'General',
      subcategory: json['subcategory'] ?? 'General',
      block: loc['block'] ?? '',
      commonArea: loc['commonArea'] ?? '',
      priority: json['priority'] ?? 'LOW',
      status: json['status'] ?? 'SUBMITTED',
      scopeFlag: json['scopeFlag'] ?? 'IN_SCOPE',
      isEmergency: json['isEmergency'] ?? false,
      workSize: json['workSize'],
      expenseApproval: json['expenseApproval'] != null ? ExpenseApproval.fromJson(json['expenseApproval']) : null,
      assignment: json['assignment'] != null ? Assignment.fromJson(json['assignment']) : null,
      aiAnalysis: json['aiAnalysis'] != null ? AIAnalysis.fromJson(json['aiAnalysis']) : null,
      timeline: (json['timeline'] as List?)?.map((e) => TimelineItem.fromJson(e)).toList() ?? [],
      reopenCount: json['reopenCount'] ?? 0,
      rating: json['rating'],
      feedback: json['feedback'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
