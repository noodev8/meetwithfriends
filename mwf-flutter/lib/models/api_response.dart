class ApiResponse<T> {
  const ApiResponse({required this.returnCode, this.message, this.data});

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>)? fromJsonT,
  ) {
    return ApiResponse<T>(
      returnCode: json['return_code'] as String? ?? ReturnCode.serverError,
      message: json['message'] as String?,
      data: fromJsonT != null && json.containsKey('data')
          ? fromJsonT(json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  factory ApiResponse.success({T? data, String? message}) {
    return ApiResponse<T>(
      returnCode: ReturnCode.success,
      message: message,
      data: data,
    );
  }

  factory ApiResponse.error(String returnCode, {String? message}) {
    return ApiResponse<T>(returnCode: returnCode, message: message);
  }

  final String returnCode;
  final String? message;
  final T? data;

  bool get isSuccess => returnCode == ReturnCode.success;
  bool get isUnauthorized => returnCode == ReturnCode.unauthorized;
  bool get isForbidden => returnCode == ReturnCode.forbidden;
  bool get isNotFound => returnCode == ReturnCode.notFound;
  bool get isServerError => returnCode == ReturnCode.serverError;
}

abstract final class ReturnCode {
  static const String success = 'SUCCESS';
  static const String missingFields = 'MISSING_FIELDS';
  static const String invalidEmail = 'INVALID_EMAIL';
  static const String invalidPassword = 'INVALID_PASSWORD';
  static const String invalidCredentials = 'INVALID_CREDENTIALS';
  static const String emailTaken = 'EMAIL_TAKEN';
  static const String unauthorized = 'UNAUTHORIZED';
  static const String forbidden = 'FORBIDDEN';
  static const String notFound = 'NOT_FOUND';
  static const String serverError = 'SERVER_ERROR';
  static const String networkError = 'NETWORK_ERROR';
}
