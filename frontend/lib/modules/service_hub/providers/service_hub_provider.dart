import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/service_hub_model.dart';

class ServiceHubState {
  final bool isLoading;
  final List<ProviderProfileModel> providers;
  final List<SlotModel> availableSlots;
  final List<ServiceBookingModel> bookings;
  final String? errorMessage;
  final String? successMessage;

  ServiceHubState({
    this.isLoading = false,
    this.providers = const [],
    this.availableSlots = const [],
    this.bookings = const [],
    this.errorMessage,
    this.successMessage,
  });

  ServiceHubState copyWith({
    bool? isLoading,
    List<ProviderProfileModel>? providers,
    List<SlotModel>? availableSlots,
    List<ServiceBookingModel>? bookings,
    String? errorMessage,
    String? successMessage,
  }) {
    return ServiceHubState(
      isLoading: isLoading ?? this.isLoading,
      providers: providers ?? this.providers,
      availableSlots: availableSlots ?? this.availableSlots,
      bookings: bookings ?? this.bookings,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

class ServiceHubNotifier extends StateNotifier<ServiceHubState> {
  ServiceHubNotifier() : super(ServiceHubState());

  Future<void> fetchProviders([String? category]) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final url = category != null ? '/service-hub/providers?category=$category' : '/service-hub/providers';
      final res = await ApiClient.dio.get(url);
      if (res.statusCode == 200 && res.data['providers'] != null) {
        final list = (res.data['providers'] as List)
            .map((e) => ProviderProfileModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, providers: list);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load providers');
    }
  }

  Future<void> fetchSlots(String providerUserId, String date, [String category = 'HOUSEMAID']) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.get(
        '/service-hub/providers/$providerUserId/slots?date=$date&category=$category',
      );
      if (res.statusCode == 200 && res.data['slots'] != null) {
        final list = (res.data['slots'] as List)
            .map((e) => SlotModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, availableSlots: list);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load slots');
    }
  }

  Future<bool> bookSlot(String slotId, String description) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/service-hub/bookings',
        data: {'slotId': slotId, 'description': description},
      );
      if (res.statusCode == 201) {
        await fetchMyBookings();
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Service booked! Escrow payment held safely in escrow [SIMULATED]',
        );
        return true;
      }
      return false;
    } catch (e) {
      String msg = 'Booking failed';
      if (e is DioException) {
        msg = e.response?.data?['message']?.toString() ?? msg;
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<void> fetchMyBookings() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.get('/service-hub/bookings');
      if (res.statusCode == 200 && res.data['bookings'] != null) {
        final list = (res.data['bookings'] as List)
            .map((e) => ServiceBookingModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, bookings: list);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load bookings');
    }
  }

  Future<bool> updateStatus(String bookingId, String status) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.patch(
        '/service-hub/bookings/$bookingId/status',
        data: {'status': status},
      );
      if (res.statusCode == 200) {
        await fetchMyBookings();
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to update status');
      return false;
    }
  }

  Future<bool> settleAndRate(String bookingId, int rating, String reviewText) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await ApiClient.dio.post(
        '/service-hub/bookings/$bookingId/settle',
        data: {'rating': rating, 'reviewText': reviewText},
      );
      if (res.statusCode == 200) {
        await fetchMyBookings();
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Service settled! Escrow payout released to provider.',
        );
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to settle booking');
      return false;
    }
  }
}

final serviceHubProvider =
    StateNotifierProvider<ServiceHubNotifier, ServiceHubState>((ref) {
  return ServiceHubNotifier();
});
