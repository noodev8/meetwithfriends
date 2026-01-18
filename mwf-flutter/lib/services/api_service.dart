import 'package:dio/dio.dart';

class ApiService {
  // Switch between local dev and VPS - see docs/FLUTTER-API.md
  // static const String baseUrl = 'http://192.168.1.136:3019/api';  // Local dev
  static const String baseUrl = 'https://meetwithfriends.noodev8.com/api';  // VPS

  // Singleton instance
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  final Dio _dio;

  ApiService._internal() : _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
    },
  ));

  void setToken(String? token) {
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(path, data: data);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null) {
        return e.response!.data as Map<String, dynamic>;
      }
      return {
        'return_code': 'NETWORK_ERROR',
        'message': e.message ?? 'Network error occurred',
      };
    }
  }

  Future<Map<String, dynamic>> get(String path) async {
    try {
      final response = await _dio.get(path);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response != null) {
        return e.response!.data as Map<String, dynamic>;
      }
      return {
        'return_code': 'NETWORK_ERROR',
        'message': e.message ?? 'Network error occurred',
      };
    }
  }
}
