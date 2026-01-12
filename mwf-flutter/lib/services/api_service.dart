import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/constants/api_constants.dart';
import 'package:meetwithfriends/models/api_response.dart';
import 'package:meetwithfriends/services/storage_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  final storageService = ref.watch(storageServiceProvider);
  return ApiService(storageService: storageService);
});

class ApiService {
  ApiService({required StorageService storageService})
    : _storageService = storageService {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(_AuthInterceptor(_storageService));
    _dio.interceptors.add(_LoggingInterceptor());
  }

  late final Dio _dio;
  final StorageService _storageService;

  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleDioError<T>(e);
    }
  }

  Future<ApiResponse<T>> post<T>(
    String path, {
    Map<String, dynamic>? data,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(path, data: data);
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleDioError<T>(e);
    }
  }

  Future<ApiResponse<T>> put<T>(
    String path, {
    Map<String, dynamic>? data,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(path, data: data);
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleDioError<T>(e);
    }
  }

  Future<ApiResponse<T>> delete<T>(
    String path, {
    Map<String, dynamic>? data,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        path,
        data: data,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleDioError<T>(e);
    }
  }

  ApiResponse<T> _handleResponse<T>(
    Response<Map<String, dynamic>> response,
    T Function(Map<String, dynamic>)? fromJson,
  ) {
    final data = response.data;
    if (data == null) {
      return ApiResponse<T>.error(ReturnCode.serverError);
    }

    final returnCode = data['return_code'] as String? ?? ReturnCode.serverError;

    if (returnCode == ReturnCode.success && fromJson != null) {
      try {
        final parsedData = fromJson(data);
        return ApiResponse<T>(
          returnCode: returnCode,
          message: data['message'] as String?,
          data: parsedData,
        );
      } on Exception {
        return ApiResponse<T>.error(
          ReturnCode.serverError,
          message: 'Failed to parse response',
        );
      }
    }

    return ApiResponse<T>(
      returnCode: returnCode,
      message: data['message'] as String?,
    );
  }

  ApiResponse<T> _handleDioError<T>(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiResponse<T>.error(
          ReturnCode.networkError,
          message: 'Connection timeout. Please try again.',
        );
      case DioExceptionType.connectionError:
        return ApiResponse<T>.error(
          ReturnCode.networkError,
          message: 'Unable to connect. Check your internet connection.',
        );
      case DioExceptionType.badResponse:
        final response = e.response;
        if (response?.statusCode == 401) {
          return ApiResponse<T>.error(ReturnCode.unauthorized);
        }
        if (response?.statusCode == 403) {
          return ApiResponse<T>.error(ReturnCode.forbidden);
        }
        if (response?.statusCode == 404) {
          return ApiResponse<T>.error(ReturnCode.notFound);
        }
        return ApiResponse<T>.error(
          ReturnCode.serverError,
          message: 'Server error. Please try again later.',
        );
      case DioExceptionType.cancel:
        return ApiResponse<T>.error(
          ReturnCode.networkError,
          message: 'Request cancelled.',
        );
      case DioExceptionType.unknown:
      case DioExceptionType.badCertificate:
        return ApiResponse<T>.error(
          ReturnCode.networkError,
          message: 'An unexpected error occurred.',
        );
    }
  }
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._storageService);

  final StorageService _storageService;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storageService.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

class _LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Log request in debug mode
    // ignore: avoid_print
    // print('API Request: ${options.method} ${options.path}');
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    // Log response in debug mode
    // ignore: avoid_print
    // print('API Response: ${response.statusCode}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Log error in debug mode
    // ignore: avoid_print
    // print('API Error: ${err.message}');
    handler.next(err);
  }
}
