import 'dart:io';
import 'package:dio/dio.dart';

/// Service for uploading images to Cloudinary
class ImageUploadService {
  final Dio _dio;

  // Cloudinary configuration (matches web app)
  static const String _cloudinaryCloudName = 'dnrevr0pi';
  static const String _cloudinaryUploadPreset = 'meetwithfriends';

  ImageUploadService({Dio? dio}) : _dio = dio ?? Dio();

  /// Upload a menu image to Cloudinary
  /// Returns the transformed URL or null on failure
  Future<ImageUploadResult> uploadMenuImage(File imageFile) async {
    try {
      // Validate file size (10MB max for menu photos - they need to be readable)
      final fileSize = await imageFile.length();
      if (fileSize > 10 * 1024 * 1024) {
        return ImageUploadResult(
          success: false,
          error: 'Image must be less than 10MB',
        );
      }

      // Create multipart form data for Cloudinary
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          filename: 'menu_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
        'upload_preset': _cloudinaryUploadPreset,
        'folder': 'mwf-menus',
      });

      // Upload to Cloudinary
      final response = await _dio.post(
        'https://api.cloudinary.com/v1_1/$_cloudinaryCloudName/image/upload',
        data: formData,
      );

      if (response.statusCode != 200) {
        return ImageUploadResult(
          success: false,
          error: 'Failed to upload image',
        );
      }

      // Get the secure URL and apply menu transformation
      // Keep larger for menus since they need to be readable when zoomed
      final secureUrl = response.data['secure_url'] as String;
      final transformedUrl = secureUrl.replaceFirst(
        '/upload/',
        '/upload/w_2000,c_limit,q_auto/',
      );

      return ImageUploadResult(
        success: true,
        url: transformedUrl,
      );
    } on DioException catch (e) {
      return ImageUploadResult(
        success: false,
        error: e.message ?? 'Failed to upload image',
      );
    } catch (e) {
      return ImageUploadResult(
        success: false,
        error: 'Failed to upload image',
      );
    }
  }

  /// Upload multiple menu images
  /// Returns list of successfully uploaded URLs
  Future<MultiImageUploadResult> uploadMenuImages(List<File> imageFiles) async {
    final urls = <String>[];
    final errors = <String>[];

    for (final file in imageFiles) {
      final result = await uploadMenuImage(file);
      if (result.success && result.url != null) {
        urls.add(result.url!);
      } else {
        errors.add(result.error ?? 'Upload failed');
      }
    }

    return MultiImageUploadResult(
      urls: urls,
      errors: errors,
      allSucceeded: errors.isEmpty && urls.length == imageFiles.length,
    );
  }
}

class ImageUploadResult {
  final bool success;
  final String? url;
  final String? error;

  ImageUploadResult({required this.success, this.url, this.error});
}

class MultiImageUploadResult {
  final List<String> urls;
  final List<String> errors;
  final bool allSucceeded;

  MultiImageUploadResult({
    required this.urls,
    required this.errors,
    required this.allSucceeded,
  });
}
