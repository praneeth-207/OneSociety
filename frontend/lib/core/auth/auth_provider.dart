import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';

class UserModel {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String societyId;
  final String? flatNumber;
  final bool mustChangePassword;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.societyId,
    this.flatNumber,
    required this.mustChangePassword,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'Resident',
      societyId: json['societyId'] is Map ? json['societyId']['_id'] : (json['societyId'] ?? ''),
      flatNumber: json['flatNumber'],
      mustChangePassword: json['mustChangePassword'] ?? false,
    );
  }
}

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final bool mustChangePassword;
  final UserModel? user;
  final String? errorMessage;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.mustChangePassword = false,
    this.user,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    bool? mustChangePassword,
    UserModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState()) {
    checkInitialAuth();
  }

  Future<void> checkInitialAuth() async {
    state = state.copyWith(isLoading: true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      if (token == null) {
        state = state.copyWith(isLoading: false, isAuthenticated: false);
        return;
      }

      final response = await ApiClient.dio.get('/auth/me');
      if (response.statusCode == 200) {
        final user = UserModel.fromJson(response.data['user']);
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          mustChangePassword: user.mustChangePassword,
          user: user,
        );
      } else {
        state = state.copyWith(isLoading: false, isAuthenticated: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, isAuthenticated: false);
    }
  }

  Future<bool> login(String identifier, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final trimmed = identifier.trim();
      final response = await ApiClient.dio.post(
        '/auth/login',
        data: {
          'identifier': trimmed,
          'phone': trimmed,
          'email': trimmed,
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['accessToken']);
        await prefs.setString('refresh_token', data['refreshToken']);

        final user = UserModel.fromJson(data['user']);
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          mustChangePassword: user.mustChangePassword,
          user: user,
        );
        return true;
      }
      return false;
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? 'Login failed. Please check credentials.';
      state = state.copyWith(isLoading: false, errorMessage: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'An unexpected error occurred.');
      return false;
    }
  }

  Future<bool> changePassword(String currentPassword, String newPassword) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await ApiClient.dio.post(
        '/auth/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );

      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', response.data['accessToken']);

        if (state.user != null) {
          final updatedUser = UserModel(
            id: state.user!.id,
            name: state.user!.name,
            email: state.user!.email,
            phone: state.user!.phone,
            role: state.user!.role,
            societyId: state.user!.societyId,
            flatNumber: state.user!.flatNumber,
            mustChangePassword: false,
          );
          state = state.copyWith(
            isLoading: false,
            mustChangePassword: false,
            user: updatedUser,
          );
        }
        return true;
      }
      return false;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to update password';
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to update password');
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
