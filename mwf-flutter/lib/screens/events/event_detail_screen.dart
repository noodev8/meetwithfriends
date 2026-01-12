import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/event.dart';
import 'package:meetwithfriends/providers/events_provider.dart';
import 'package:meetwithfriends/services/events_service.dart';
import 'package:meetwithfriends/widgets/comments_section.dart';
import 'package:meetwithfriends/widgets/contact_message_sheet.dart';
import 'package:meetwithfriends/widgets/food_order_section.dart';

class EventDetailScreen extends ConsumerWidget {
  const EventDetailScreen({required this.eventId, super.key});

  final int eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventAsync = ref.watch(eventDetailProvider(eventId));

    return Scaffold(
      body: eventAsync.when(
        data: (event) {
          if (event == null) {
            return _buildNotFoundState(context);
          }
          return _buildContent(context, ref, event);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _buildErrorState(context, error.toString()),
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, Event event) {
    return CustomScrollView(
      slivers: [
        // App bar with image
        _buildSliverAppBar(context, event),
        // Content
        SliverToBoxAdapter(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppSpacing.md),
                // Event title
                Text(event.title, style: AppTypography.h2),
                const SizedBox(height: AppSpacing.sm),
                // Group name
                _buildGroupChip(event.groupName),
                const SizedBox(height: AppSpacing.lg),
                // Date, time, location
                _buildEventDetails(event),
                const SizedBox(height: AppSpacing.lg),
                // RSVP section
                _buildRsvpSection(context, ref, event),
                const SizedBox(height: AppSpacing.lg),
                // Description
                if (event.description != null &&
                    event.description!.isNotEmpty) ...[
                  const Text('About', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    event.description!,
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],
                // Host info with contact button
                if (event.hostName != null) ...[
                  const Text('Hosted by', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.sm),
                  _buildHostInfo(context, ref, event),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // Food pre-order section (if user is attending)
                if (event.isGoing || event.isWaitlisted) ...[
                  FoodOrderSection(
                    eventId: event.id,
                    canOrder: event.isGoing || event.isWaitlisted,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // Comments section
                CommentsSection(
                  eventId: event.id,
                  canComment: event.isGoing || event.isWaitlisted,
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSliverAppBar(BuildContext context, Event event) {
    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (event.imageUrl != null && event.imageUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: event.imageUrl!,
                fit: BoxFit.cover,
                placeholder: (_, __) => _buildPlaceholderBackground(),
                errorWidget: (_, __, ___) => _buildPlaceholderBackground(),
              )
            else
              _buildPlaceholderBackground(),
            // Gradient overlay
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black54],
                ),
              ),
            ),
          ],
        ),
      ),
      leading: IconButton(
        icon: const CircleAvatar(
          backgroundColor: Colors.black26,
          child: Icon(Icons.arrow_back, color: Colors.white),
        ),
        onPressed: () => context.pop(),
      ),
      actions: [
        IconButton(
          icon: const CircleAvatar(
            backgroundColor: Colors.black26,
            child: Icon(Icons.share, color: Colors.white, size: 20),
          ),
          onPressed: () {
            // Share event - future feature
          },
        ),
      ],
    );
  }

  Widget _buildPlaceholderBackground() {
    return const ColoredBox(
      color: AppColors.primary,
      child: Center(
        child: Icon(Icons.event, color: Colors.white54, size: 64),
      ),
    );
  }

  Widget _buildGroupChip(String groupName) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: AppSpacing.borderRadiusSm,
      ),
      child: Text(
        groupName,
        style: AppTypography.labelSmall.copyWith(
          color: AppColors.textSecondary,
        ),
      ),
    );
  }

  Widget _buildEventDetails(Event event) {
    return Column(
      children: [
        _buildDetailRow(
          icon: Icons.calendar_today_outlined,
          label: 'Date',
          value: event.formattedDate,
        ),
        if (event.eventTime != null) ...[
          const SizedBox(height: AppSpacing.md),
          _buildDetailRow(
            icon: Icons.access_time_outlined,
            label: 'Time',
            value: event.eventTime!,
          ),
        ],
        if (event.location != null && event.location!.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          _buildDetailRow(
            icon: Icons.location_on_outlined,
            label: 'Location',
            value: event.location!,
          ),
        ],
      ],
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: AppSpacing.borderRadiusSm,
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTypography.caption,
              ),
              Text(value, style: AppTypography.bodyLarge),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRsvpSection(BuildContext context, WidgetRef ref, Event event) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          children: [
            // Attendance stats - tappable to view attendees
            InkWell(
              onTap: () => context.push(
                '${AppRoutes.events}/$eventId/attendees',
              ),
              borderRadius: AppSpacing.borderRadiusSm,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatColumn(
                      value: event.rsvpCount.toString(),
                      label: 'Going',
                    ),
                    if (event.hasCapacity)
                      _buildStatColumn(
                        value: event.spotsRemaining.toString(),
                        label: 'Spots left',
                      ),
                    if (event.waitlistCount > 0)
                      _buildStatColumn(
                        value: event.waitlistCount.toString(),
                        label: 'Waitlist',
                      ),
                  ],
                ),
              ),
            ),
            TextButton.icon(
              onPressed: () => context.push(
                '${AppRoutes.events}/$eventId/attendees',
              ),
              icon: const Icon(Icons.people_outline, size: 18),
              label: const Text('View all attendees'),
            ),
            const SizedBox(height: AppSpacing.md),
            const Divider(),
            const SizedBox(height: AppSpacing.md),
            // RSVP status and button
            _buildRsvpButton(context, ref, event),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn({required String value, required String label}) {
    return Column(
      children: [
        Text(value, style: AppTypography.h3),
        Text(label, style: AppTypography.caption),
      ],
    );
  }

  Widget _buildRsvpButton(BuildContext context, WidgetRef ref, Event event) {
    if (event.isGoing) {
      return Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: AppSpacing.borderRadiusSm,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.check_circle,
                  color: AppColors.success,
                  size: 20,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  "You're going!",
                  style: AppTypography.labelLarge.copyWith(
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextButton(
            onPressed: () => _handleRsvp(context, ref, event, 'not_going'),
            child: Text(
              'Cancel RSVP',
              style: AppTypography.labelMedium.copyWith(
                color: AppColors.error,
              ),
            ),
          ),
        ],
      );
    }

    if (event.isWaitlisted) {
      return Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.1),
              borderRadius: AppSpacing.borderRadiusSm,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.hourglass_empty,
                  color: AppColors.warning,
                  size: 20,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  "You're on the waitlist",
                  style: AppTypography.labelLarge.copyWith(
                    color: AppColors.warning,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextButton(
            onPressed: () => _handleRsvp(context, ref, event, 'not_going'),
            child: Text(
              'Leave waitlist',
              style: AppTypography.labelMedium.copyWith(
                color: AppColors.error,
              ),
            ),
          ),
        ],
      );
    }

    final isFull = event.isFull;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: () => _handleRsvp(
          context,
          ref,
          event,
          isFull ? 'waitlist' : 'going',
        ),
        child: Text(isFull ? 'Join Waitlist' : 'RSVP - Going'),
      ),
    );
  }

  Future<void> _handleRsvp(
    BuildContext context,
    WidgetRef ref,
    Event event,
    String status,
  ) async {
    final eventsService = ref.read(eventsServiceProvider);
    final response = await eventsService.rsvp(event.id, status);

    if (response.isSuccess) {
      ref
        ..invalidate(eventDetailProvider(eventId))
        ..invalidate(myEventsProvider);
    } else if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response.message ?? 'Failed to update RSVP'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Widget _buildHostInfo(BuildContext context, WidgetRef ref, Event event) {
    return Row(
      children: [
        const CircleAvatar(
          radius: 20,
          backgroundColor: AppColors.surfaceVariant,
          child: Icon(Icons.person, color: AppColors.textTertiary, size: 24),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Text(event.hostName ?? '', style: AppTypography.bodyLarge),
        ),
        // Contact button (only if attending or waitlisted)
        if (event.isGoing || event.isWaitlisted)
          TextButton.icon(
            onPressed: () => _showContactHostSheet(context, ref, event),
            icon: const Icon(Icons.mail_outline, size: 18),
            label: const Text('Contact'),
          ),
      ],
    );
  }

  void _showContactHostSheet(
    BuildContext context,
    WidgetRef ref,
    Event event,
  ) {
    ContactMessageSheet.show(
      context: context,
      recipientType: 'Host',
      recipientName: event.hostName ?? 'Host',
      onSend: (message) async {
        final eventsService = ref.read(eventsServiceProvider);
        final response = await eventsService.contactHost(
          eventId: event.id,
          message: message,
        );

        if (!response.isSuccess && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to send message'),
              backgroundColor: AppColors.error,
            ),
          );
        }

        return response.isSuccess;
      },
    );
  }

  Widget _buildNotFoundState(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.search_off,
              color: AppColors.textTertiary,
              size: 64,
            ),
            const SizedBox(height: AppSpacing.lg),
            const Text(
              'Event not found',
              style: AppTypography.h4,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'This event may have been cancelled or you '
              "don't have access to it",
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 64),
            const SizedBox(height: AppSpacing.lg),
            const Text(
              'Something went wrong',
              style: AppTypography.h4,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Failed to load event details',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }
}
