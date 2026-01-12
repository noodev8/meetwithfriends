import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/attendee.dart';
import 'package:meetwithfriends/providers/events_provider.dart';
import 'package:meetwithfriends/widgets/empty_state.dart';
import 'package:meetwithfriends/widgets/error_state.dart';
import 'package:meetwithfriends/widgets/skeleton.dart';

class AttendeesScreen extends ConsumerWidget {
  const AttendeesScreen({required this.eventId, super.key});

  final int eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendeesAsync = ref.watch(eventAttendeesProvider(eventId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendees', style: AppTypography.h4),
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(eventAttendeesProvider(eventId));
        },
        child: attendeesAsync.when(
          data: (attendees) => _buildContent(context, attendees),
          loading: () => const ListSkeleton(
            itemBuilder: MemberItemSkeleton.new,
          ),
          error: (error, _) => ErrorStates.loadFailed(
            item: 'attendees',
            onRetry: () => ref.invalidate(eventAttendeesProvider(eventId)),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<Attendee> attendees) {
    if (attendees.isEmpty) {
      return EmptyStates.noAttendees();
    }

    // Separate going and waitlisted
    final going = attendees.where((a) => a.isGoing).toList();
    final waitlist = attendees.where((a) => a.isWaitlisted).toList();

    return ListView(
      padding: AppSpacing.screenPadding,
      children: [
        if (going.isNotEmpty) ...[
          _buildSectionHeader('Going', going.length),
          const SizedBox(height: AppSpacing.sm),
          ...going.map(_buildAttendeeItem),
        ],
        if (waitlist.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          _buildSectionHeader('Waitlist', waitlist.length),
          const SizedBox(height: AppSpacing.sm),
          ...waitlist.map(_buildAttendeeItem),
        ],
        const SizedBox(height: AppSpacing.lg),
      ],
    );
  }

  Widget _buildSectionHeader(String title, int count) {
    return Row(
      children: [
        Text(title, style: AppTypography.h4),
        const SizedBox(width: AppSpacing.sm),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm,
            vertical: 2,
          ),
          decoration: const BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: AppSpacing.borderRadiusSm,
          ),
          child: Text(
            count.toString(),
            style: AppTypography.labelSmall,
          ),
        ),
      ],
    );
  }

  Widget _buildAttendeeItem(Attendee attendee) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Card(
        child: ListTile(
          leading: _buildAvatar(attendee),
          title: Text(
            attendee.displayName,
            style: AppTypography.bodyLarge,
          ),
          subtitle: attendee.email != null
              ? Text(
                  attendee.email!,
                  style: AppTypography.bodySmall,
                )
              : null,
          trailing: attendee.isWaitlisted
              ? Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: AppSpacing.borderRadiusSm,
                  ),
                  child: Text(
                    'Waitlist',
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.warning,
                    ),
                  ),
                )
              : null,
        ),
      ),
    );
  }

  Widget _buildAvatar(Attendee attendee) {
    if (attendee.imageUrl != null && attendee.imageUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 20,
        backgroundImage: CachedNetworkImageProvider(attendee.imageUrl!),
      );
    }

    return CircleAvatar(
      radius: 20,
      backgroundColor: AppColors.surfaceVariant,
      child: Text(
        _getInitials(attendee.displayName),
        style: AppTypography.labelMedium.copyWith(
          color: AppColors.textSecondary,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}
