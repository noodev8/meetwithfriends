import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPadding,
          child: Column(
            children: [
              const Spacer(),
              // Logo section
              Container(
                width: 100,
                height: 100,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: AppSpacing.borderRadiusMd,
                ),
                child: const Icon(
                  Icons.group,
                  size: 56,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const Text(
                'Meet With Friends',
                style: AppTypography.h1,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Organize food-focused social events with your community',
                style: AppTypography.bodyLarge.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              // Features list
              _buildFeatureItem(
                icon: Icons.event,
                title: 'Create & Join Events',
                description: 'Plan gatherings with easy RSVP management',
              ),
              const SizedBox(height: AppSpacing.md),
              _buildFeatureItem(
                icon: Icons.restaurant_menu,
                title: 'Pre-order Food',
                description: 'Menu selections and dietary preferences',
              ),
              const SizedBox(height: AppSpacing.md),
              _buildFeatureItem(
                icon: Icons.people,
                title: 'Build Community',
                description: 'Connect with people who share your interests',
              ),
              const Spacer(),
              // Action buttons
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push(AppRoutes.register),
                  child: const Text('Get Started'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.push(AppRoutes.login),
                  child: const Text('I already have an account'),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primaryLight.withValues(alpha: 0.1),
            borderRadius: AppSpacing.borderRadiusSm,
          ),
          child: Icon(icon, color: AppColors.primary),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.labelLarge),
              Text(description, style: AppTypography.bodySmall),
            ],
          ),
        ),
      ],
    );
  }
}
