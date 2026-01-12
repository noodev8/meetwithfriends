import 'package:flutter/material.dart';
import 'package:meetwithfriends/core/theme/theme.dart';

/// A shimmer effect widget for loading states
class Shimmer extends StatefulWidget {
  const Shimmer({
    required this.child,
    super.key,
  });

  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: -2, end: 2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: const [
                Color(0xFFE2E8F0),
                Color(0xFFF1F5F9),
                Color(0xFFE2E8F0),
              ],
              stops: [
                0.0,
                0.5 + _animation.value * 0.25,
                1.0,
              ],
              transform: _SlidingGradientTransform(_animation.value),
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcATop,
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  const _SlidingGradientTransform(this.slidePercent);

  final double slidePercent;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * slidePercent, 0, 0);
  }
}

/// A skeleton box for loading placeholders
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    this.width,
    this.height = 16,
    this.borderRadius,
    super.key,
  });

  final double? width;
  final double height;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: borderRadius ?? BorderRadius.circular(4),
      ),
    );
  }
}

/// A skeleton circle for avatar placeholders
class SkeletonCircle extends StatelessWidget {
  const SkeletonCircle({
    this.size = 40,
    super.key,
  });

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: AppColors.surfaceVariant,
        shape: BoxShape.circle,
      ),
    );
  }
}

/// Skeleton for event cards
class EventCardSkeleton extends StatelessWidget {
  const EventCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              // Date badge skeleton
              Container(
                width: 50,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(AppSpacing.sm),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              // Content skeleton
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: 180, height: 18),
                    SizedBox(height: AppSpacing.sm),
                    SkeletonBox(width: 120, height: 14),
                    SizedBox(height: AppSpacing.xs),
                    SkeletonBox(width: 80, height: 14),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Skeleton for group cards
class GroupCardSkeleton extends StatelessWidget {
  const GroupCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              // Image skeleton
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(AppSpacing.sm),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              // Content skeleton
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: 150, height: 18),
                    SizedBox(height: AppSpacing.sm),
                    SkeletonBox(width: 100, height: 14),
                  ],
                ),
              ),
              // Badge skeleton
              const SkeletonBox(width: 60, height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

/// Skeleton for event detail screen
class EventDetailSkeleton extends StatelessWidget {
  const EventDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero image skeleton
            Container(
              height: 200,
              color: AppColors.surfaceVariant,
            ),
            Padding(
              padding: AppSpacing.screenPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: AppSpacing.lg),
                  // Title
                  const SkeletonBox(height: 28),
                  const SizedBox(height: AppSpacing.sm),
                  const SkeletonBox(width: 100, height: 24),
                  const SizedBox(height: AppSpacing.xl),
                  // Details
                  _buildDetailRowSkeleton(),
                  const SizedBox(height: AppSpacing.md),
                  _buildDetailRowSkeleton(),
                  const SizedBox(height: AppSpacing.md),
                  _buildDetailRowSkeleton(),
                  const SizedBox(height: AppSpacing.xl),
                  // RSVP card
                  Container(
                    height: 150,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(AppSpacing.md),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  // Description
                  const SkeletonBox(width: 80, height: 20),
                  const SizedBox(height: AppSpacing.sm),
                  const SkeletonBox(height: 14),
                  const SizedBox(height: AppSpacing.xs),
                  const SkeletonBox(height: 14),
                  const SizedBox(height: AppSpacing.xs),
                  const SkeletonBox(width: 200, height: 14),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRowSkeleton() {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(AppSpacing.sm),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(width: 60, height: 12),
            SizedBox(height: AppSpacing.xs),
            SkeletonBox(width: 120),
          ],
        ),
      ],
    );
  }
}

/// Skeleton for group detail screen
class GroupDetailSkeleton extends StatelessWidget {
  const GroupDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero image skeleton
            Container(
              height: 200,
              color: AppColors.surfaceVariant,
            ),
            Padding(
              padding: AppSpacing.screenPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: AppSpacing.lg),
                  // Role badge
                  const SkeletonBox(width: 80, height: 24),
                  const SizedBox(height: AppSpacing.sm),
                  // Description
                  const SkeletonBox(height: 14),
                  const SizedBox(height: AppSpacing.xs),
                  const SkeletonBox(width: 200, height: 14),
                  const SizedBox(height: AppSpacing.xl),
                  // Stats
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 100,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius:
                                BorderRadius.circular(AppSpacing.md),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Container(
                          height: 100,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius:
                                BorderRadius.circular(AppSpacing.md),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  // Events title
                  const SkeletonBox(width: 140, height: 20),
                  const SizedBox(height: AppSpacing.md),
                  // Event cards
                  const EventCardSkeleton(),
                  const SizedBox(height: AppSpacing.sm),
                  const EventCardSkeleton(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Skeleton for list screens
class ListSkeleton extends StatelessWidget {
  const ListSkeleton({
    required this.itemBuilder,
    this.itemCount = 5,
    super.key,
  });

  final Widget Function() itemBuilder;
  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: itemCount,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (_, __) => itemBuilder(),
    );
  }
}

/// Skeleton for attendee/member list items
class MemberItemSkeleton extends StatelessWidget {
  const MemberItemSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Shimmer(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          children: [
            SkeletonCircle(size: 48),
            SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 120),
                  SizedBox(height: AppSpacing.xs),
                  SkeletonBox(width: 80, height: 12),
                ],
              ),
            ),
            SkeletonBox(width: 60, height: 24),
          ],
        ),
      ),
    );
  }
}

/// Skeleton for comments
class CommentSkeleton extends StatelessWidget {
  const CommentSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Shimmer(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonCircle(size: 36),
            SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 100, height: 14),
                  SizedBox(height: AppSpacing.sm),
                  SkeletonBox(height: 14),
                  SizedBox(height: AppSpacing.xs),
                  SkeletonBox(width: 180, height: 14),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
