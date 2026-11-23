import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/share_rent_model.dart';

class ShareRentState {
  final bool isLoading;
  final List<SRItemModel> items;
  final List<SRRentalModel> borrowedRentals;
  final List<SRRentalModel> ownedRentals;
  final String? errorMessage;
  final String? successMessage;

  ShareRentState({
    this.isLoading = false,
    this.items = const [],
    this.borrowedRentals = const [],
    this.ownedRentals = const [],
    this.errorMessage,
    this.successMessage,
  });

  ShareRentState copyWith({
    bool? isLoading,
    List<SRItemModel>? items,
    List<SRRentalModel>? borrowedRentals,
    List<SRRentalModel>? ownedRentals,
    String? errorMessage,
    String? successMessage,
  }) {
    return ShareRentState(
      isLoading: isLoading ?? this.isLoading,
      items: items ?? this.items,
      borrowedRentals: borrowedRentals ?? this.borrowedRentals,
      ownedRentals: ownedRentals ?? this.ownedRentals,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

class ShareRentNotifier extends StateNotifier<ShareRentState> {
  ShareRentNotifier() : super(ShareRentState());

  Future<void> fetchItems([String? category]) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final url = category != null ? '/share-rent/items?category=$category' : '/share-rent/items';
      final res = await ApiClient.dio.get(url);
      if (res.statusCode == 200 && res.data['items'] != null) {
        final list = (res.data['items'] as List)
            .map((e) => SRItemModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, items: list);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load items');
    }
  }

  Future<bool> createItem({
    required String title,
    required String category,
    required String description,
    required double dailyRate,
    required double securityDeposit,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/share-rent/items',
        data: {
          'title': title,
          'category': category,
          'description': description,
          'dailyRate': dailyRate,
          'securityDeposit': securityDeposit,
        },
      );
      if (res.statusCode == 201) {
        await fetchItems();
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Item listed successfully in society marketplace!',
        );
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Failed to list item';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<bool> requestRental(String itemId, String startDate, String endDate) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/share-rent/rentals',
        data: {'itemId': itemId, 'startDate': startDate, 'endDate': endDate},
      );
      if (res.statusCode == 201) {
        await fetchMyRentals();
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Rental request submitted to owner for approval!',
        );
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Request failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<void> fetchMyRentals() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.get('/share-rent/rentals');
      if (res.statusCode == 200) {
        final borrowed = (res.data['borrowed'] as List? ?? [])
            .map((e) => SRRentalModel.fromJson(e))
            .toList();
        final owned = (res.data['owned'] as List? ?? [])
            .map((e) => SRRentalModel.fromJson(e))
            .toList();
        state = state.copyWith(
          isLoading: false,
          borrowedRentals: borrowed,
          ownedRentals: owned,
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load rentals');
    }
  }

  Future<bool> approveRental(String rentalId) async {
    try {
      final res = await ApiClient.dio.post('/share-rent/rentals/$rentalId/approve');
      if (res.statusCode == 200) {
        await fetchMyRentals();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> checkoutRental(String rentalId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post('/share-rent/rentals/$rentalId/checkout');
      if (res.statusCode == 200) {
        await fetchMyRentals();
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Escrow payment processed [SIMULATED]! Pickup token generated.',
        );
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Checkout failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<bool> confirmHandover(String rentalId, String token) async {
    try {
      final res = await ApiClient.dio.post(
        '/share-rent/rentals/$rentalId/handover',
        data: {'token': token.trim().toUpperCase()},
      );
      if (res.statusCode == 200) {
        await fetchMyRentals();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> returnInspection(String rentalId, String condition, [String? notes, String? disputeReason]) async {
    try {
      final res = await ApiClient.dio.post(
        '/share-rent/rentals/$rentalId/return',
        data: {
          'condition': condition,
          if (notes != null) 'notes': notes,
          if (disputeReason != null) 'disputeReason': disputeReason,
        },
      );
      if (res.statusCode == 200) {
        await fetchMyRentals();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

final shareRentProvider =
    StateNotifierProvider<ShareRentNotifier, ShareRentState>((ref) {
  return ShareRentNotifier();
});
