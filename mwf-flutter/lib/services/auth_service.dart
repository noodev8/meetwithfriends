import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/constants/api_constants.dart';
import 'package:meetwithfriends/models/api_response.dart';
import 'package:meetwithfriends/models/user.dart';
import 'package:meetwithfriends/services/api_service.dart';
import 'package:meetwithfriends/services/storage_service.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  final storageService = ref.watch(storageServiceProvider);
  return AuthService(apiService: apiService, storageService: storageService);
});

class AuthService {
  AuthService({
    required ApiService apiService,
    required StorageService storageService,
  }) : _apiService = apiService,
       _storageService = storageService;

  final ApiService _apiService;
  final StorageService _storageService;

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      ApiConstants.login,
      data: {'email': email, 'password': password},
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final data = response.data!;
      final token = data['token'] as String?;
      final userJson = data['user'] as Map<String, dynamic>?;

      if (token != null && userJson != null) {
        await _storageService.saveToken(token);
        final user = User.fromJson(userJson);
        await _storageService.saveUserId(user.id);
        return AuthResult.success(user);
      }
    }

    return AuthResult.error(
      response.returnCode,
      response.message ?? 'Login failed',
    );
  }

  Future<AuthResult> register({
    required String email,
    required String password,
    required String displayName,
    String? firstName,
    String? lastName,
  }) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      ApiConstants.register,
      data: {
        'email': email,
        'password': password,
        'display_name': displayName,
        if (firstName != null) 'first_name': firstName,
        if (lastName != null) 'last_name': lastName,
      },
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final data = response.data!;
      final token = data['token'] as String?;
      final userJson = data['user'] as Map<String, dynamic>?;

      if (token != null && userJson != null) {
        await _storageService.saveToken(token);
        final user = User.fromJson(userJson);
        await _storageService.saveUserId(user.id);
        return AuthResult.success(user);
      }
    }

    return AuthResult.error(
      response.returnCode,
      response.message ?? 'Registration failed',
    );
  }

  Future<void> logout() async {
    await _storageService.clearAll();
  }

  Future<AuthResult> getCurrentUser() async {
    final hasToken = await _storageService.hasToken();
    if (!hasToken) {
      return AuthResult.error(ReturnCode.unauthorized, 'Not authenticated');
    }

    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.currentUser,
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final userJson = response.data!['user'] as Map<String, dynamic>?;
      if (userJson != null) {
        final user = User.fromJson(userJson);
        return AuthResult.success(user);
      }
    }

    if (response.isUnauthorized) {
      await _storageService.clearAll();
    }

    return AuthResult.error(
      response.returnCode,
      response.message ?? 'Failed to get user',
    );
  }

  Future<ApiResponse<void>> forgotPassword(String email) async {
    return _apiService.post(
      ApiConstants.forgotPassword,
      data: {'email': email},
    );
  }

  Future<ApiResponse<void>> resetPassword({
    required String token,
    required String password,
  }) async {
    return _apiService.post(
      ApiConstants.resetPassword,
      data: {'token': token, 'password': password},
    );
  }

  Future<bool> hasStoredToken() async {
    return _storageService.hasToken();
  }
}

class AuthResult {
  const AuthResult._({
    required this.isSuccess,
    this.user,
    this.errorCode,
    this.errorMessage,
  });

  factory AuthResult.success(User user) {
    return AuthResult._(isSuccess: true, user: user);
  }

  factory AuthResult.error(String code, String message) {
    return AuthResult._(
      isSuccess: false,
      errorCode: code,
      errorMessage: message,
    );
  }

  final bool isSuccess;
  final User? user;
  final String? errorCode;
  final String? errorMessage;
}
