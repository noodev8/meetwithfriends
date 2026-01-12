import 'package:flutter/material.dart';
import 'package:meetwithfriends/core/theme/theme.dart';

/// A reusable error state widget with retry functionality
class ErrorState extends StatelessWidget {
  const ErrorState({
    required this.message,
    this.title = 'Something went wrong',
    this.icon = Icons.error_outline,
    this.onRetry,
    this.retryLabel = 'Try Again',
    this.compact = false,
    super.key,
  });

  final String title;
  final String message;
  final IconData icon;
  final VoidCallback? onRetry;
  final String retryLabel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return _buildCompact(context);
    }
    return _buildFull(context);
  }

  Widget _buildFull(BuildContext context) {
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
                color: AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(40),
              ),
              child: Icon(
                icon,
                color: AppColors.error,
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
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.xl),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(retryLabel),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCompact(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.05),
        borderRadius: AppSpacing.borderRadiusMd,
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: AppColors.error,
            size: 24,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              message,
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
          if (onRetry != null)
            TextButton(
              onPressed: onRetry,
              child: Text(retryLabel),
            ),
        ],
      ),
    );
  }
}

/// Preset error states for common scenarios
class ErrorStates {
  ErrorStates._();

  static Widget network({VoidCallback? onRetry}) {
    return ErrorState(
      icon: Icons.wifi_off,
      title: 'No connection',
      message: 'Please check your internet connection and try again.',
      onRetry: onRetry,
    );
  }

  static Widget server({VoidCallback? onRetry}) {
    return ErrorState(
      title: 'Server error',
      message: 'Something went wrong on our end. Please try again later.',
      onRetry: onRetry,
    );
  }

  static Widget notFound({String? item, VoidCallback? onBack}) {
    return ErrorState(
      icon: Icons.search_off,
      title: '${item ?? 'Item'} not found',
      message: 'This ${item?.toLowerCase() ?? 'item'} may have been '
          'deleted or you may not have access to it.',
      onRetry: onBack,
      retryLabel: 'Go Back',
    );
  }

  static Widget unauthorized({VoidCallback? onLogin}) {
    return ErrorState(
      icon: Icons.lock_outline,
      title: 'Access denied',
      message: 'You need to be logged in to view this content.',
      onRetry: onLogin,
      retryLabel: 'Log In',
    );
  }

  static Widget forbidden() {
    return const ErrorState(
      icon: Icons.block,
      title: 'Access denied',
      message: "You don't have permission to view this content.",
    );
  }

  static Widget generic({VoidCallback? onRetry, String? message}) {
    return ErrorState(
      message: message ?? 'An unexpected error occurred. Please try again.',
      onRetry: onRetry,
    );
  }

  static Widget loadFailed({
    required String item,
    VoidCallback? onRetry,
    bool compact = false,
  }) {
    return ErrorState(
      message: 'Failed to load $item',
      onRetry: onRetry,
      compact: compact,
    );
  }
}
