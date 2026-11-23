import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/group_buying_model.dart';

class GroupBuyingState {
  final bool isLoading;
  final List<GBDealModel> deals;
  final List<GBOrderModel> orders;
  final String? errorMessage;
  final String? successMessage;

  GroupBuyingState({
    this.isLoading = false,
    this.deals = const [],
    this.orders = const [],
    this.errorMessage,
    this.successMessage,
  });

  GroupBuyingState copyWith({
    bool? isLoading,
    List<GBDealModel>? deals,
    List<GBOrderModel>? orders,
    String? errorMessage,
    String? successMessage,
  }) {
    return GroupBuyingState(
      isLoading: isLoading ?? this.isLoading,
      deals: deals ?? this.deals,
      orders: orders ?? this.orders,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

class GroupBuyingNotifier extends StateNotifier<GroupBuyingState> {
  GroupBuyingNotifier() : super(GroupBuyingState());

  Future<void> fetchDeals() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.get('/group-buying/deals');
      if (res.statusCode == 200 && res.data['deals'] != null) {
        final list = (res.data['deals'] as List)
            .map((e) => GBDealModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, deals: list);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load deals');
    }
  }

  Future<bool> joinDeal(String dealId, int quantity) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/group-buying/deals/$dealId/join',
        data: {'quantity': quantity},
      );
      if (res.statusCode == 201) {
        await fetchDeals();
        await fetchMyOrders();
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Pledged $quantity units! Funds held in escrow [SIMULATED].',
        );
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Pledge failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<void> fetchMyOrders() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.get('/group-buying/orders');
      if (res.statusCode == 200 && res.data['orders'] != null) {
        final list = (res.data['orders'] as List)
            .map((e) => GBOrderModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, orders: list);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load orders');
    }
  }

  Future<bool> createDeal({
    required String title,
    required String category,
    required String description,
    required String unit,
    required List<Map<String, dynamic>> tiers,
    required int minTargetQty,
    required String deadline,
    required String deliveryDate,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/group-buying/deals',
        data: {
          'title': title,
          'category': category,
          'description': description,
          'unit': unit,
          'tiers': tiers,
          'minTargetQty': minTargetQty,
          'deadline': deadline,
          'deliveryDate': deliveryDate,
        },
      );
      if (res.statusCode == 201) {
        await fetchDeals();
        state = state.copyWith(successMessage: 'Group buying deal published to society!');
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Failed to create deal';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<bool> generateManifest(String dealId) async {
    try {
      final res = await ApiClient.dio.post('/group-buying/deals/$dealId/manifest');
      if (res.statusCode == 200) {
        await fetchDeals();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> verifyManifest(String token) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/group-buying/manifest/verify',
        data: {'manifestToken': token.trim().toUpperCase()},
      );
      if (res.statusCode == 200) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Delivery truck manifest verified at gate!',
        );
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Manifest verification failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<bool> confirmDelivery(String orderId, String token) async {
    try {
      final res = await ApiClient.dio.post(
        '/group-buying/orders/$orderId/confirm-delivery',
        data: {'token': token.trim().toUpperCase()},
      );
      if (res.statusCode == 200) {
        await fetchMyOrders();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

final groupBuyingProvider =
    StateNotifierProvider<GroupBuyingNotifier, GroupBuyingState>((ref) {
  return GroupBuyingNotifier();
});
