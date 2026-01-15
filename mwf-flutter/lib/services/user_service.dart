import 'dart:io';
import 'package:dio/dio.dart';
import '../models/user.dart';
import 'api_service.dart';

class UserService {
  final ApiService _api;
  final Dio _dio;

  // Cloudinary configuration (matches web app)
  static const String _cloudinaryCloudName = 'dnrevr0pi';
  static const String _cloudinaryUploadPreset = 'meetwithfriends';
  static const String _cloudinaryFolder = 'mwf-avatars';

  UserService({ApiService? api, Dio? dio})
      : _api = api ?? ApiService(),
        _dio = dio ?? Dio();

  /// Upload avatar image to Cloudinary and update profile
  /// Returns the updated user with new avatar URL
  Future<UserResult> uploadAvatar(File imageFile) async {
    try {
      // Validate file size (5MB max)
      final fileSize = await imageFile.length();
      if (fileSize > 5 * 1024 * 1024) {
        return UserResult(
          success: false,
          error: 'Image must be less than 5MB',
        );
      }

      // Create multipart form data for Cloudinary
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          filename: 'avatar.jpg',
        ),
        'upload_preset': _cloudinaryUploadPreset,
        'folder': _cloudinaryFolder,
      });

      // Upload to Cloudinary
      final response = await _dio.post(
        'https://api.cloudinary.com/v1_1/$_cloudinaryCloudName/image/upload',
        data: formData,
      );

      if (response.statusCode != 200) {
        return UserResult(
          success: false,
          error: 'Failed to upload image',
        );
      }

      // Get the secure URL and apply avatar transformation
      final secureUrl = response.data['secure_url'] as String;
      final avatarUrl = secureUrl.replaceFirst(
        '/upload/',
        '/upload/w_200,h_200,c_fill,g_face,q_auto/',
      );

      // Update profile with new avatar URL
      return await updateProfile(avatarUrl: avatarUrl);
    } on DioException catch (e) {
      return UserResult(
        success: false,
        error: e.message ?? 'Failed to upload image',
      );
    } catch (e) {
      return UserResult(
        success: false,
        error: 'Failed to upload image',
      );
    }
  }

  /// Update user profile information
  /// All fields are optional - only provided fields will be updated
  Future<UserResult> updateProfile({
    String? name,
    String? bio,
    String? avatarUrl,
    String? contactMobile,
    String? contactEmail,
    bool? showMobileToGuests,
    bool? showEmailToGuests,
    bool? receiveBroadcasts,
  }) async {
    final data = <String, dynamic>{};

    if (name != null) data['name'] = name;
    if (bio != null) data['bio'] = bio;
    if (avatarUrl != null) data['avatar_url'] = avatarUrl;
    if (contactMobile != null) data['contact_mobile'] = contactMobile;
    if (contactEmail != null) data['contact_email'] = contactEmail;
    if (showMobileToGuests != null) data['show_mobile_to_guests'] = showMobileToGuests;
    if (showEmailToGuests != null) data['show_email_to_guests'] = showEmailToGuests;
    if (receiveBroadcasts != null) data['receive_broadcasts'] = receiveBroadcasts;

    final response = await _api.post('/users/update_profile', data);

    if (response['return_code'] == 'SUCCESS') {
      final userData = response['user'] as Map<String, dynamic>;
      return UserResult(
        success: true,
        user: User.fromJson(userData),
      );
    }

    return UserResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to update profile',
    );
  }

  /// Clear avatar (set to empty)
  Future<UserResult> removeAvatar() async {
    final response = await _api.post('/users/update_profile', {
      'avatar_url': '',
    });

    if (response['return_code'] == 'SUCCESS') {
      final userData = response['user'] as Map<String, dynamic>;
      return UserResult(
        success: true,
        user: User.fromJson(userData),
      );
    }

    return UserResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to remove avatar',
    );
  }

  /// Change user password
  Future<UserResult> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final response = await _api.post('/users/change_password', {
      'current_password': currentPassword,
      'new_password': newPassword,
    });

    if (response['return_code'] == 'SUCCESS') {
      return UserResult(success: true);
    }

    // Map specific error codes to user-friendly messages
    String errorMessage;
    switch (response['return_code']) {
      case 'INVALID_PASSWORD':
        errorMessage = 'Current password is incorrect';
        break;
      case 'INVALID_NEW_PASSWORD':
        errorMessage = 'New password must be at least 8 characters';
        break;
      case 'MISSING_FIELDS':
        errorMessage = 'Please fill in all password fields';
        break;
      default:
        errorMessage = response['message'] as String? ?? 'Failed to change password';
    }

    return UserResult(
      success: false,
      error: errorMessage,
    );
  }

  /// Delete user account (requires password confirmation)
  Future<UserResult> deleteAccount({required String password}) async {
    final response = await _api.post('/users/delete_account', {
      'password': password,
    });

    if (response['return_code'] == 'SUCCESS') {
      return UserResult(success: true);
    }

    // Map specific error codes to user-friendly messages
    String errorMessage;
    switch (response['return_code']) {
      case 'INVALID_PASSWORD':
        errorMessage = 'Incorrect password';
        break;
      case 'MISSING_FIELDS':
        errorMessage = 'Password is required to confirm deletion';
        break;
      default:
        errorMessage = response['message'] as String? ?? 'Failed to delete account';
    }

    return UserResult(
      success: false,
      error: errorMessage,
    );
  }
}

class UserResult {
  final bool success;
  final User? user;
  final String? error;

  UserResult({required this.success, this.user, this.error});
}
