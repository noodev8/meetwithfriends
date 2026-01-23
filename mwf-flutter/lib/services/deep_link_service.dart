import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import '../screens/event_detail_screen.dart';

/// Service to handle deep links for the app
/// Handles URLs like:
/// - https://meetwithfriends.net/events/123
/// - https://meetwithfriends.net/groups/456
class DeepLinkService {
  final AppLinks _appLinks = AppLinks();

  /// Initialize and listen for deep links
  void init(BuildContext context, bool isLoggedIn) {
    // Handle link when app is already running
    _appLinks.uriLinkStream.listen((Uri uri) {
      _handleDeepLink(context, uri, isLoggedIn);
    });

    // Handle link that launched the app (cold start)
    _appLinks.getInitialLink().then((Uri? uri) {
      if (uri != null) {
        _handleDeepLink(context, uri, isLoggedIn);
      }
    });
  }

  void _handleDeepLink(BuildContext context, Uri uri, bool isLoggedIn) {
    // Only handle deep links if user is logged in
    if (!isLoggedIn) {
      return;
    }

    final pathSegments = uri.pathSegments;

    if (pathSegments.isEmpty) return;

    // Handle /events/:id
    if (pathSegments[0] == 'events' && pathSegments.length > 1) {
      final eventId = int.tryParse(pathSegments[1]);
      if (eventId != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => EventDetailScreen(
              eventId: eventId,
              onBack: () => Navigator.of(context).pop(),
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
