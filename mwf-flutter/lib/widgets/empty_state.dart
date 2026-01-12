import 'package:flutter/material.dart';
import 'package:meetwithfriends/core/theme/theme.dart';

/// A reusable empty state widget
class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
    super.key,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(40),
              ),
              child: Icon(
                icon,
                color: AppColors.textTertiary,
                size: 40,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              style: AppTypography.h4,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.xl),
              ElevatedButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Preset empty states for common scenarios
class EmptyStates {
  EmptyStates._();

  static Widget noEvents({VoidCallback? onCreateEvent}) {
    return EmptyState(
      icon: Icons.event_outlined,
      title: 'No upcoming events',
      message: "You haven't RSVP'd to any events yet. "
          'Browse events in your groups to get started.',
      actionLabel: onCreateEvent != null ? 'Browse Groups' : null,
      onAction: onCreateEvent,
    );
  }

  static Widget noGroups({VoidCallback? onJoinGroup}) {
    return EmptyState(
      icon: Icons.people_outline,
      title: 'No groups yet',
      message: "You haven't joined any groups yet. "
          'Discover groups to connect with others.',
      actionLabel: onJoinGroup != null ? 'Discover Groups' : null,
      onAction: onJoinGroup,
    );
  }

  static Widget noGroupEvents({
    VoidCallback? onCreateEvent,
    bool isHost = false,
  }) {
    return EmptyState(
      icon: Icons.event_outlined,
      title: 'No upcoming events',
      message: isHost
          ? 'Create an event to bring your group together.'
          : 'Check back later for new events in this group.',
      actionLabel: isHost ? 'Create Event' : null,
      onAction: onCreateEvent,
    );
  }

  static Widget noPastEvents() {
    return const EmptyState(
      icon: Icons.history,
      title: 'No past events',
      message: 'Events that have already taken place will appear here.',
    );
  }

  static Widget noAttendees() {
    return const EmptyState(
      icon: Icons.people_outline,
      title: 'No attendees yet',
      message: 'Be the first to RSVP to this event!',
    );
  }

  static Widget noMembers() {
    return const EmptyState(
      icon: Icons.people_outline,
      title: 'No members yet',
      message: 'Invite people to join this group.',
    );
  }

  static Widget noComments({bool canComment = false}) {
    return EmptyState(
      icon: Icons.chat_bubble_outline,
      title: 'No comments yet',
      message: canComment
          ? 'Be the first to start the conversation!'
          : 'Join to see and post comments.',
    );
  }

  static Widget noSearchResults({String? query}) {
    return EmptyState(
      icon: Icons.search_off,
      title: 'No results found',
      message: query != null
          ? 'No matches for "$query". Try a different search.'
          : 'Try adjusting your search or filters.',
    );
  }
}
