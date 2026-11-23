import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../models/complaint_model.dart';

class ComplaintsState {
  final bool isLoading;
  final List<ComplaintModel> complaints;
  final String? errorMessage;
  final Map<String, dynamic>? analytics;

  ComplaintsState({
    this.isLoading = false,
    this.complaints = const [],
    this.errorMessage,
    this.analytics,
  });

  ComplaintsState copyWith({
    bool? isLoading,
    List<ComplaintModel>? complaints,
    String? errorMessage,
    Map<String, dynamic>? analytics,
  }) {
    return ComplaintsState(
      isLoading: isLoading ?? this.isLoading,
      complaints: complaints ?? this.complaints,
      errorMessage: errorMessage,
      analytics: analytics ?? this.analytics,
    );
  }
}

class ComplaintsNotifier extends StateNotifier<ComplaintsState> {
  ComplaintsNotifier() : super(ComplaintsState()) {
    loadComplaints();
  }

  Future<void> loadComplaints({
    String? filter,
    String? status,
    String? priority,
    String? search,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final queryParams = <String, dynamic>{};
      if (filter != null) queryParams['filter'] = filter;
      if (status != null && status != 'ALL') queryParams['status'] = status;
      if (priority != null && priority != 'ALL') queryParams['priority'] = priority;
      if (search != null && search.isNotEmpty) queryParams['search'] = search;

      final res = await ApiClient.dio.get('/complaints', queryParameters: queryParams);
      if (res.statusCode == 200) {
        final list = (res.data['complaints'] as List)
            .map((e) => ComplaintModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, complaints: list);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load complaints');
    }
  }

  Future<ComplaintModel?> raiseComplaint({
    required String title,
    required String description,
    required String block,
    required String commonArea,
    String? category,
    String? subcategory,
    List<String>? photos,
  }) async {
    try {
      final res = await ApiClient.dio.post('/complaints', data: {
        'title': title,
        'description': description,
        'block': block,
        'commonArea': commonArea,
        if (category != null) 'category': category,
        if (subcategory != null) 'subcategory': subcategory,
        if (photos != null) 'photos': photos,
      });

      if (res.statusCode == 201) {
        final newComplaint = ComplaintModel.fromJson(res.data['complaint']);
        state = state.copyWith(complaints: [newComplaint, ...state.complaints]);
        return newComplaint;
      }
    } catch (e) {
      // Handled in caller
    }
    return null;
  }

  Future<bool> reviewComplaint(String id, {
    String? priority,
    String? category,
    String? workSize,
    String? scopeFlag,
    String? internalNotes,
  }) async {
    try {
      final res = await ApiClient.dio.patch('/complaints/$id/review', data: {
        if (priority != null) 'priority': priority,
        if (category != null) 'category': category,
        if (workSize != null) 'workSize': workSize,
        if (scopeFlag != null) 'scopeFlag': scopeFlag,
        if (internalNotes != null) 'internalNotes': internalNotes,
      });
      if (res.statusCode == 200) {
        await loadComplaints();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> submitExpenseQuote(String id, {
    required String vendorName,
    required String vendorPhone,
    required double quotationAmount,
    required String action,
    String? comment,
  }) async {
    try {
      final res = await ApiClient.dio.post('/complaints/$id/expense-quote', data: {
        'vendorName': vendorName,
        'vendorPhone': vendorPhone,
        'quotationAmount': quotationAmount,
        'action': action,
        'comment': comment,
      });
      if (res.statusCode == 200) {
        await loadComplaints();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> assignComplaint(String id, {
    String? providerId,
    required String providerName,
    required String providerPhone,
    required String providerType,
    required bool isExternalVendor,
    double? estimatedCost,
    DateTime? expectedCompletionDate,
  }) async {
    try {
      final res = await ApiClient.dio.patch('/complaints/$id/assign', data: {
        if (providerId != null) 'providerId': providerId,
        'providerName': providerName,
        'providerPhone': providerPhone,
        'providerType': providerType,
        'isExternalVendor': isExternalVendor,
        if (estimatedCost != null) 'estimatedCost': estimatedCost,
        if (expectedCompletionDate != null)
          'expectedCompletionDate': expectedCompletionDate.toIso8601String(),
      });
      if (res.statusCode == 200) {
        await loadComplaints();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> respondToTask(String id, {
    required String action,
    String? declineReason,
  }) async {
    try {
      final res = await ApiClient.dio.patch('/complaints/$id/provider-respond', data: {
        'action': action,
        'declineReason': declineReason,
      });
      if (res.statusCode == 200) {
        await loadComplaints();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> resolveTask(String id, {
    required String resolutionNote,
    String? photoUrl,
  }) async {
    try {
      final res = await ApiClient.dio.patch('/complaints/$id/provider-resolve', data: {
        'resolutionNote': resolutionNote,
        'photoUrl': photoUrl,
      });
      if (res.statusCode == 200) {
        await loadComplaints();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> verifyComplaint(String id, {
    required bool isResolved,
    int? rating,
    String? feedback,
    String? reopenReason,
  }) async {
    try {
      final res = await ApiClient.dio.patch('/complaints/$id/verify', data: {
        'isResolved': isResolved,
        if (rating != null) 'rating': rating,
        if (feedback != null) 'feedback': feedback,
        if (reopenReason != null) 'reopenReason': reopenReason,
      });
      if (res.statusCode == 200) {
        await loadComplaints();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<void> loadAnalytics() async {
    try {
      final res = await ApiClient.dio.get('/complaints/analytics');
      if (res.statusCode == 200) {
        state = state.copyWith(analytics: res.data['analytics']);
      }
    } catch (_) {}
  }
}

final complaintsProvider = StateNotifierProvider<ComplaintsNotifier, ComplaintsState>((ref) {
  return ComplaintsNotifier();
});
