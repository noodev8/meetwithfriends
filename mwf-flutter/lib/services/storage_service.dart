import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService();
});

class StorageService {
  StorageService() : _storage = const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'user_id';

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return _storage.read(key: _tokenKey);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<void> saveUserId(int userId) async {
    await _storage.write(key: _userIdKey, value: userId.toString());
  }

  Future<int?> getUserId() async {
    final value = await _storage.read(key: _userIdKey);
    if (value == null) return null;
    return int.tryParse(value);
  }

  Future<void> deleteUserId() async {
    await _storage.delete(key: _userIdKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
