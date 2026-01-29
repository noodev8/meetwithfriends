import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;

/// Service for uploading images and PDFs to Cloudinary
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

      // Determine filename extension from the actual file
      final ext = p.extension(imageFile.path).toLowerCase();
      final filename = 'menu_${DateTime.now().millisecondsSinceEpoch}$ext';

      // Create multipart form data for Cloudinary
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          filename: filename,
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

  /// Upload a PDF menu to Cloudinary
  /// Returns per-page image URLs generated via Cloudinary pg_N transformation
  Future<PdfUploadResult> uploadMenuPdf(File pdfFile) async {
    try {
      // Validate file size (10MB max - Cloudinary free tier limit)
      final fileSize = await pdfFile.length();
      if (fileSize > 10 * 1024 * 1024) {
        return PdfUploadResult(
          success: false,
          error: 'PDF must be less than 10MB. Try converting to images at smallpdf.com/pdf-to-jpg',
        );
      }

      // Create multipart form data for Cloudinary
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          pdfFile.path,
          filename: 'menu_${DateTime.now().millisecondsSinceEpoch}.pdf',
        ),
        'upload_preset': _cloudinaryUploadPreset,
        'folder': 'mwf-menus',
      });

      // Upload to Cloudinary (same /image/upload endpoint handles PDFs)
      final response = await _dio.post(
        'https://api.cloudinary.com/v1_1/$_cloudinaryCloudName/image/upload',
        data: formData,
      );

      if (response.statusCode != 200) {
        return PdfUploadResult(
          success: false,
          error: 'Failed to upload PDF',
        );
      }

      final secureUrl = response.data['secure_url'] as String;
      final pageCount = (response.data['pages'] as int?) ?? 1;

      // Generate per-page image URLs using Cloudinary pg_N transformation
      final pageUrls = <String>[];
      for (int i = 1; i <= pageCount; i++) {
        final pageUrl = secureUrl
            .replaceFirst('/upload/', '/upload/pg_$i,w_2000,c_limit,q_auto/')
            .replaceAll(RegExp(r'\.pdf$'), '.jpg');
        pageUrls.add(pageUrl);
      }

      return PdfUploadResult(
        success: true,
        pageUrls: pageUrls,
        pageCount: pageCount,
      );
    } on DioException catch (e) {
      return PdfUploadResult(
        success: false,
        error: e.message ?? 'Failed to upload PDF',
      );
    } catch (e) {
      return PdfUploadResult(
        success: false,
        error: 'Failed to upload PDF',
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

class PdfUploadResult {
  final bool success;
  final List<String> pageUrls;
  final int pageCount;
  final String? error;

  PdfUploadResult({
    required this.success,
    this.pageUrls = const [],
    this.pageCount = 0,
    this.error,
  });
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
