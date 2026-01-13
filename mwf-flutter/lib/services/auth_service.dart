import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api;
  final FlutterSecureStorage _storage;

  static const String _tokenKey = 'auth_token';

  AuthService({ApiService? api, FlutterSecureStorage? storage})
      : _api = api ?? ApiService(),
        _storage = storage ?? const FlutterSecureStorage();

  /// Register a new user
  Future<AuthResult> register(String name, String email, String password) async {
    final response = await _api.post('/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });

    if (response['return_code'] == 'SUCCESS') {
      final token = response['token'] as String;
      await _storage.write(key: _tokenKey, value: token);
      _api.setToken(token);
      return AuthResult(
        success: true,
        user: response['user'] as Map<String, dynamic>?,
      );
    }

    return AuthResult(
      success: false,
      error: response['message'] as String? ?? 'Registration failed',
    );
  }

  /// Login with email and password
  Future<AuthResult> login(String email, String password) async {
    final response = await _api.post('/auth/login', {
      'email': email,
      'password': password,
    });

    if (response['return_code'] == 'SUCCESS') {
      final token = response['token'] as String;
      await _storage.write(key: _tokenKey, value: token);
      _api.setToken(token);
      return AuthResult(
        success: true,
        user: response['user'] as Map<String, dynamic>?,
      );
    }

    return AuthResult(
      success: false,
      error: response['message'] as String? ?? 'Login failed',
    );
  }

  /// Request password reset email
  Future<AuthResult> forgotPassword(String email) async {
    final response = await _api.post('/auth/forgot_password', {
      'email': email,
    });

    if (response['return_code'] == 'SUCCESS') {
      return AuthResult(success: true);
    }

    return AuthResult(
      success: false,
      error: response['message'] as String? ?? 'Request failed',
    );
  }

  /// Check if user is logged in and token is valid
  Future<AuthResult> checkAuth() async {
    final token = await _storage.read(key: _tokenKey);
    if (token == null) {
      return AuthResult(success: false);
    }

    _api.setToken(token);
    final response = await _api.get('/users/profile');

    if (response['return_code'] == 'SUCCESS') {
      return AuthResult(
        success: true,
        user: response['user'] as Map<String, dynamic>?,
      );
    }

    // Token invalid, clear it
    await logout();
    return AuthResult(success: false);
  }

  /// Logout - clear stored token
  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    _api.setToken(null);
  }
}

class AuthResult {
  final bool success;
  final Map<String, dynamic>? user;
  final String? error;

  AuthResult({required this.success, this.user, this.error});
}
