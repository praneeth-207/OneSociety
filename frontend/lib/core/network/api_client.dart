import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static late Dio dio;

  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api/v1';
    } else {
      // Android Emulator loopback or local network IP
      return 'http://10.0.2.2:5000/api/v1';
    }
  }

  static Future<void> init() async {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('access_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // If token expired (401), try refresh
          if (error.response?.statusCode == 401 && !error.requestOptions.path.contains('/auth/login')) {
            final prefs = await SharedPreferences.getInstance();
            final refreshToken = prefs.getString('refresh_token');

            if (refreshToken != null) {
              try {
                final refreshResponse = await Dio().post(
                  '$baseUrl/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );

                if (refreshResponse.statusCode == 200) {
                  final newAccessToken = refreshResponse.data['accessToken'];
                  await prefs.setString('access_token', newAccessToken);

                  // Retry original request
                  final opts = error.requestOptions;
                  opts.headers['Authorization'] = 'Bearer $newAccessToken';
                  final cloneReq = await dio.fetch(opts);
                  return handler.resolve(cloneReq);
                }
              } catch (_) {
                await prefs.clear();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}
