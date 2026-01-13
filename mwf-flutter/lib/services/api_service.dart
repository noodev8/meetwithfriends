import 'package:dio/dio.dart';

class ApiService {
  static const String baseUrl = 'http://192.168.1.136:3018/api';

  final Dio _dio;

  ApiService() : _dio = Dio(BaseOptions(
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
