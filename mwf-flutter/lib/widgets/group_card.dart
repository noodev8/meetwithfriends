import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/group.dart';

class GroupCard extends StatelessWidget {
  const GroupCard({required this.group, this.onTap, super.key});

  final Group group;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Row(
            children: [
              // Group image
              _buildGroupImage(),
              const SizedBox(width: AppSpacing.md),
              // Group details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            group.name,
                            style: AppTypography.labelLarge,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (group.isOrganiser || group.isHost)
                          _buildRoleBadge(),
                      ],
                    ),
                    if (group.description != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        group.description!,
                        style: AppTypography.bodySmall,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: AppSpacing.sm),
                    // Stats row
                    Row(
                      children: [
                        _buildStat(
                          Icons.people_outline,
                          '${group.memberCount} members',
                        ),
                        const SizedBox(width: AppSpacing.md),
                        _buildStat(
                          Icons.event_outlined,
                          '${group.upcomingEventCount} upcoming',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              const Icon(Icons.chevron_right, color: AppColors.textTertiary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGroupImage() {
    if (group.imageUrl != null && group.imageUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: AppSpacing.borderRadiusSm,
        child: CachedNetworkImage(
          imageUrl: group.imageUrl!,
          width: 56,
          height: 56,
          fit: BoxFit.cover,
          placeholder: (_, __) => _buildPlaceholderImage(),
          errorWidget: (_, __, ___) => _buildPlaceholderImage(),
        ),
      );
    }
    return _buildPlaceholderImage();
  }

  Widget _buildPlaceholderImage() {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: AppSpacing.borderRadiusSm,
      ),
      child: const Icon(Icons.people, color: AppColors.primary, size: 28),
    );
  }

  Widget _buildRoleBadge() {
    final isOrganiser = group.isOrganiser;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isOrganiser
            ? AppColors.secondary.withValues(alpha: 0.1)
            : AppColors.primary.withValues(alpha: 0.1),
        borderRadius: AppSpacing.borderRadiusSm,
      ),
      child: Text(
        isOrganiser ? 'Organiser' : 'Host',
        style: AppTypography.labelSmall.copyWith(
          color: isOrganiser ? AppColors.secondary : AppColors.primary,
        ),
      ),
    );
  }

  Widget _buildStat(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textTertiary),
        const SizedBox(width: 4),
        Text(text, style: AppTypography.caption),
      ],
    );
  }
}
