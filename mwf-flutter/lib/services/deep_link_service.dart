import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import '../screens/event_detail_screen.dart';

/// Service to handle deep links for the app
/// Handles URLs like:
/// - https://meetwithfriends.net/events/123
/// - https://meetwithfriends.net/groups/456
class DeepLinkService {
  final AppLinks _appLinks = AppLinks();
  GlobalKey<NavigatorState>? _navigatorKey;
  bool _isLoggedIn = false;

  /// Initialize and listen for deep links
  void init(GlobalKey<NavigatorState> navigatorKey, bool isLoggedIn) {
    _navigatorKey = navigatorKey;
    _isLoggedIn = isLoggedIn;

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
    // Only handle deep links if user is logged in
    if (!_isLoggedIn) {
      return;
    }

    final navigator = _navigatorKey?.currentState;
    if (navigator == null) return;

    final pathSegments = uri.pathSegments;

    if (pathSegments.isEmpty) return;

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
