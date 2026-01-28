import 'api_service.dart';

// --- Data Classes ---

class InviteGroup {
  final int id;
  final String name;
  final String icon;
  final int memberCount;
  final bool requireProfileImage;
  final String? description;

  InviteGroup({
    required this.id,
    required this.name,
    required this.icon,
    required this.memberCount,
    required this.requireProfileImage,
    this.description,
  });

  factory InviteGroup.fromJson(Map<String, dynamic> json) {
    return InviteGroup(
      id: json['id'] as int,
      name: json['name'] as String,
      icon: json['icon'] as String? ?? 'utensils',
      memberCount: json['member_count'] as int? ?? 0,
      requireProfileImage: json['require_profile_image'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }
}

class InviteEvent {
  final int id;
  final String title;
  final String? dateTime;
  final String? location;
  final String? description;
  final int? spotsRemaining;
  final String status;

  InviteEvent({
    required this.id,
    required this.title,
    this.dateTime,
    this.location,
    this.description,
    this.spotsRemaining,
    required this.status,
  });

  factory InviteEvent.fromJson(Map<String, dynamic> json) {
    return InviteEvent(
      id: json['id'] as int,
      title: json['title'] as String,
      dateTime: json['date_time'] as String?,
      location: json['location'] as String?,
      description: json['description'] as String?,
      spotsRemaining: json['spots_remaining'] as int?,
      status: json['status'] as String? ?? 'active',
    );
  }
}

class InviteUserStatus {
  final bool isGroupMember;
  final bool isEventRsvp;
  final bool hasProfileImage;

  InviteUserStatus({
    required this.isGroupMember,
    required this.isEventRsvp,
    required this.hasProfileImage,
  });

  factory InviteUserStatus.fromJson(Map<String, dynamic> json) {
    return InviteUserStatus(
      isGroupMember: json['is_group_member'] as bool? ?? false,
      isEventRsvp: json['is_event_rsvp'] as bool? ?? false,
      hasProfileImage: json['has_profile_image'] as bool? ?? false,
    );
  }
}

class InviteDetails {
  final String inviterName;
  final InviteGroup group;
  final InviteEvent? event;

  InviteDetails({
    required this.inviterName,
    required this.group,
    this.event,
  });

  factory InviteDetails.fromJson(Map<String, dynamic> json) {
    return InviteDetails(
      inviterName: json['inviter_name'] as String? ?? 'Someone',
      group: InviteGroup.fromJson(json['group'] as Map<String, dynamic>),
      event: json['event'] != null
          ? InviteEvent.fromJson(json['event'] as Map<String, dynamic>)
          : null,
    );
  }
}

class InviteData {
  final bool valid;
  final String type;
  final InviteDetails invite;
  final InviteUserStatus? userStatus;

  InviteData({
    required this.valid,
    required this.type,
    required this.invite,
    this.userStatus,
  });

  factory InviteData.fromJson(Map<String, dynamic> json) {
    return InviteData(
      valid: json['valid'] as bool? ?? false,
      type: json['type'] as String? ?? 'group',
      invite: InviteDetails.fromJson(json['invite'] as Map<String, dynamic>),
      userStatus: json['user_status'] != null
          ? InviteUserStatus.fromJson(
              json['user_status'] as Map<String, dynamic>)
          : null,
    );
  }
}

class InviteValidateResult {
  final bool success;
  final String? error;
  final String? returnCode;
  final InviteData? data;

  InviteValidateResult({
    required this.success,
    this.error,
    this.returnCode,
    this.data,
  });
}

class InviteAcceptResult {
  final bool success;
  final String? error;
  final String? returnCode;
  final String? redirectType;
  final int? redirectId;

  InviteAcceptResult({
    required this.success,
    this.error,
    this.returnCode,
    this.redirectType,
    this.redirectId,
  });
}

class InviteSignupResult {
  final bool success;
  final String? error;
  final String? returnCode;
  final String? token;
  final Map<String, dynamic>? user;
  final String? redirectType;
  final int? redirectId;

  InviteSignupResult({
    required this.success,
    this.error,
    this.returnCode,
    this.token,
    this.user,
    this.redirectType,
    this.redirectId,
  });
}

// --- Service ---

class InviteService {
  final ApiService _api;

  InviteService({ApiService? api}) : _api = api ?? ApiService();

  Future<InviteValidateResult> validateInvite(String token) async {
    final response = await _api.get('/invite/validate/$token');

    if (response['return_code'] == 'SUCCESS') {
      return InviteValidateResult(
        success: true,
        returnCode: 'SUCCESS',
        data: InviteData.fromJson(response),
      );
    }

    return InviteValidateResult(
      success: false,
      returnCode: response['return_code'] as String?,
      error: response['message'] as String? ?? 'Invalid invite link',
    );
  }

  Future<InviteAcceptResult> acceptInvite(String token) async {
    final response = await _api.post('/invite/accept/$token', {});

    if (response['return_code'] == 'SUCCESS') {
      final redirect = _parseRedirect(response['redirect_to'] as String?);
      return InviteAcceptResult(
        success: true,
        returnCode: 'SUCCESS',
        redirectType: redirect.$1,
        redirectId: redirect.$2,
      );
    }

    return InviteAcceptResult(
      success: false,
      returnCode: response['return_code'] as String?,
      error: response['message'] as String? ?? 'Failed to accept invite',
    );
  }

  Future<InviteSignupResult> acceptWithSignup(
    String token,
    String name,
    String email,
    String password,
  ) async {
    final response = await _api.post('/invite/accept-with-signup/$token', {
      'name': name,
      'email': email,
      'password': password,
    });

    if (response['return_code'] == 'SUCCESS') {
      final redirect = _parseRedirect(response['redirect_to'] as String?);
      return InviteSignupResult(
        success: true,
        returnCode: 'SUCCESS',
        token: response['token'] as String?,
        user: response['user'] as Map<String, dynamic>?,
        redirectType: redirect.$1,
        redirectId: redirect.$2,
      );
    }

    return InviteSignupResult(
      success: false,
      returnCode: response['return_code'] as String?,
      error: response['message'] as String? ?? 'Signup failed',
    );
  }

  /// Parse redirect_to string (e.g. "/events/123") into (type, id)
  (String?, int?) _parseRedirect(String? redirectTo) {
    if (redirectTo == null) return (null, null);
    final parts = redirectTo.split('/').where((s) => s.isNotEmpty).toList();
    if (parts.length >= 2) {
      final type = parts[0]; // "events" or "groups"
      final id = int.tryParse(parts[1]);
      return (type, id);
    }
    return (null, null);
  }
}
