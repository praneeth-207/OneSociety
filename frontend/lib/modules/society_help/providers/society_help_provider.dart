import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/visitor_model.dart';
import '../models/maintenance_model.dart';

class SocietyHelpState {
  final bool isLoading;
  final List<VisitPassModel> passes;
  final List<VisitRequestModel> pendingRequests;
  final List<MaintBillModel> bills;
  final List<MaintExpenseModel> expenses;
  final MaintMonthlySummaryModel? summary;
  final String? errorMessage;
  final String? successMessage;

  SocietyHelpState({
    this.isLoading = false,
    this.passes = const [],
    this.pendingRequests = const [],
    this.bills = const [],
    this.expenses = const [],
    this.summary,
    this.errorMessage,
    this.successMessage,
  });

  SocietyHelpState copyWith({
    bool? isLoading,
    List<VisitPassModel>? passes,
    List<VisitRequestModel>? pendingRequests,
    List<MaintBillModel>? bills,
    List<MaintExpenseModel>? expenses,
    MaintMonthlySummaryModel? summary,
    String? errorMessage,
    String? successMessage,
  }) {
    return SocietyHelpState(
      isLoading: isLoading ?? this.isLoading,
      passes: passes ?? this.passes,
      pendingRequests: pendingRequests ?? this.pendingRequests,
      bills: bills ?? this.bills,
      expenses: expenses ?? this.expenses,
      summary: summary ?? this.summary,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

class SocietyHelpNotifier extends StateNotifier<SocietyHelpState> {
  SocietyHelpNotifier() : super(SocietyHelpState());

  Future<void> fetchVisitorPasses() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.get('/society-help/visitors/passes');
      if (res.statusCode == 200 && res.data['passes'] != null) {
        final list = (res.data['passes'] as List)
            .map((e) => VisitPassModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, passes: list);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load passes');
    }
  }

  Future<VisitPassModel?> createPass({
    required String visitorName,
    required String visitorPhone,
    required String visitorType,
    required String passType,
    required int validityHours,
    int? expectedCount,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/society-help/visitors/passes',
        data: {
          'visitorName': visitorName,
          'visitorPhone': visitorPhone,
          'visitorType': visitorType,
          'passType': passType,
          'validityHours': validityHours,
          if (expectedCount != null) 'expectedCount': expectedCount,
        },
      );

      if (res.statusCode == 201) {
        final pass = VisitPassModel.fromJson(res.data['pass']);
        state = state.copyWith(
          isLoading: false,
          passes: [pass, ...state.passes],
          successMessage: 'QR Pass created for ${pass.visitorName}',
        );
        return pass;
      }
      return null;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to create pass');
      return null;
    }
  }

  Future<bool> renewPass(String passId, int validityHours) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/society-help/visitors/passes/$passId/renew',
        data: {'validityHours': validityHours},
      );

      if (res.statusCode == 200) {
        await fetchVisitorPasses();
        state = state.copyWith(successMessage: 'Pass renewed successfully');
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to renew pass');
      return false;
    }
  }

  Future<Map<String, dynamic>?> verifyAndAdmitPass(String token) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/society-help/visitors/verify',
        data: {'token': token.trim().toUpperCase()},
      );

      state = state.copyWith(isLoading: false);
      return res.data;
    } catch (e) {
      String msg = 'Verification failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return null;
    }
  }

  Future<bool> createUnexpectedRequest({
    required String flatNumber,
    required String visitorName,
    required String visitorPhone,
    required String purpose,
    String? vehicleNumber,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/society-help/visitors/unexpected',
        data: {
          'flatNumber': flatNumber,
          'visitorName': visitorName,
          'visitorPhone': visitorPhone,
          'purpose': purpose,
          if (vehicleNumber != null && vehicleNumber.isNotEmpty) 'vehicleNumber': vehicleNumber,
        },
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Entry request sent to Flat $flatNumber',
      );
      return res.statusCode == 201;
    } catch (e) {
      String msg = 'Failed to send request';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<bool> respondToUnexpectedRequest(String requestId, String action) async {
    try {
      final res = await ApiClient.dio.post(
        '/society-help/visitors/unexpected/$requestId/respond',
        data: {'action': action},
      );

      if (res.statusCode == 200) {
        state = state.copyWith(
          pendingRequests: state.pendingRequests.where((r) => r.id != requestId).toList(),
          successMessage: action == 'APPROVE' ? 'Visitor entry approved!' : 'Visitor entry denied.',
        );
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<void> fetchMaintenanceOverview(String month) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.get('/society-help/maintenance/overview?month=$month');
      if (res.statusCode == 200) {
        final bills = (res.data['bills'] as List? ?? [])
            .map((e) => MaintBillModel.fromJson(e))
            .toList();
        final expenses = (res.data['expenses'] as List? ?? [])
            .map((e) => MaintExpenseModel.fromJson(e))
            .toList();
        final summary = res.data['summary'] != null
            ? MaintMonthlySummaryModel.fromJson(res.data['summary'])
            : null;

        state = state.copyWith(
          isLoading: false,
          bills: bills,
          expenses: expenses,
          summary: summary,
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load maintenance records');
    }
  }

  Future<bool> payBillSimulated(String billId, String month) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post('/society-help/maintenance/bills/$billId/pay');
      if (res.statusCode == 200) {
        await fetchMaintenanceOverview(month);
        state = state.copyWith(successMessage: 'Payment verified! Receipt: ${res.data['receiptNumber']}');
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Payment failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<bool> generateBills(String month, double amount, String dueDate) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/society-help/maintenance/bills/generate',
        data: {'billingMonth': month, 'amount': amount, 'dueDate': dueDate},
      );

      if (res.statusCode == 201) {
        await fetchMaintenanceOverview(month);
        state = state.copyWith(successMessage: res.data['message']);
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Bill generation failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<bool> closeOrSummarizeMonth(String month) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post('/society-help/maintenance/summary/$month/close');
      if (res.statusCode == 200) {
        await fetchMaintenanceOverview(month);
        state = state.copyWith(successMessage: 'Financial balance sheet closed and carried forward');
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to close month');
      return false;
    }
  }
}

final societyHelpProvider =
    StateNotifierProvider<SocietyHelpNotifier, SocietyHelpState>((ref) {
  return SocietyHelpNotifier();
});
