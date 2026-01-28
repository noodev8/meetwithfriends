import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import '../screens/event_detail_screen.dart';

/// Service to handle deep links for the app
/// Handles URLs like:
/// - https://meetwithfriends.net/events/123
/// - https://meetwithfriends.net/groups/456
/// - https://meetwithfriends.net/invite/e/{token}
/// - https://meetwithfriends.net/invite/g/{token}
class DeepLinkService {
  final AppLinks _appLinks = AppLinks();
  GlobalKey<NavigatorState>? _navigatorKey;
  bool _isLoggedIn = false;
  void Function(String token, String type)? _onInviteLink;

  /// Initialize and listen for deep links
  void init(
    GlobalKey<NavigatorState> navigatorKey,
    bool isLoggedIn, {
    void Function(String token, String type)? onInviteLink,
  }) {
    _navigatorKey = navigatorKey;
    _isLoggedIn = isLoggedIn;
    _onInviteLink = onInviteLink;

    // Handle link when app is already running
    _appLinks.uriLinkStream.listen(_handleDeepLink);

    // Handle link that launched the app (cold start)
    _appLinks.getInitialLink().then((Uri? uri) {
      if (uri != null) {
        _handleDeepLink(uri);
      }
    });
  }

  /// Update login state (call when user logs in/out)
  void updateLoginState(bool isLoggedIn) {
    _isLoggedIn = isLoggedIn;
  }

  void _handleDeepLink(Uri uri) {
    final pathSegments = uri.pathSegments;
    if (pathSegments.isEmpty) return;

    // Handle /invite/e/{token} and /invite/g/{token}
    // Invite links work regardless of login state
    if (pathSegments[0] == 'invite' && pathSegments.length >= 3) {
      final type = pathSegments[1]; // 'e' or 'g'
      final token = pathSegments[2];
      if ((type == 'e' || type == 'g') && token.isNotEmpty) {
        _onInviteLink?.call(token, type);
        return;
      }
    }

    // Only handle other deep links if user is logged in
    if (!_isLoggedIn) {
      return;
    }

    final navigator = _navigatorKey?.currentState;
    if (navigator == null) return;

    // Handle /events/:id
    if (pathSegments[0] == 'events' && pathSegments.length > 1) {
      final eventId = int.tryParse(pathSegments[1]);
      if (eventId != null) {
        navigator.push(
          MaterialPageRoute(
            builder: (context) => EventDetailScreen(
              eventId: eventId,
              onBack: () => navigator.pop(),
            ),
          ),
        );
      }
    }

    // Handle /groups/:id - can be added later when needed
    // if (pathSegments[0] == 'groups' && pathSegments.length > 1) {
    //   final groupId = int.tryParse(pathSegments[1]);
    //   // Navigate to group screen
    // }
  }
}
