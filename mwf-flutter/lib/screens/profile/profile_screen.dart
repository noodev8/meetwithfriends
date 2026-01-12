import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile', style: AppTypography.h4),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: AppSpacing.screenPadding,
        child: Column(
          children: [
            const SizedBox(height: AppSpacing.lg),
            // Profile header
            _buildProfileHeader(user?.displayName, user?.email),
            const SizedBox(height: AppSpacing.xl),
            // Menu items
            _buildMenuItem(
              icon: Icons.person_outline,
              title: 'Edit Profile',
              onTap: () {
                // Navigate to edit profile - future feature
              },
            ),
            _buildMenuItem(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              onTap: () {
                // Navigate to notifications settings - future feature
              },
            ),
            _buildMenuItem(
              icon: Icons.lock_outline,
              title: 'Change Password',
              onTap: () {
                // Navigate to change password - future feature
              },
            ),
            _buildMenuItem(
              icon: Icons.help_outline,
              title: 'Help & Support',
              onTap: () {
                // Navigate to help - future feature
              },
            ),
            _buildMenuItem(
              icon: Icons.info_outline,
              title: 'About',
              onTap: () {
                // Navigate to about - future feature
              },
            ),
            const SizedBox(height: AppSpacing.xl),
            // Logout button
            _buildLogoutButton(context, ref),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(String? name, String? email) {
    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: const BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: AppSpacing.borderRadiusFull,
          ),
          child: const Icon(
            Icons.person,
            color: AppColors.textTertiary,
            size: 50,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          name ?? 'User',
          style: AppTypography.h3,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          email ?? '',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ListTile(
        leading: Icon(icon, color: AppColors.textSecondary),
        title: Text(title, style: AppTypography.bodyLarge),
        trailing: const Icon(
          Icons.chevron_right,
          color: AppColors.textTertiary,
        ),
        onTap: onTap,
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => _showLogoutDialog(context, ref),
        icon: const Icon(Icons.logout, color: AppColors.error),
        label: Text(
          'Log Out',
          style: AppTypography.labelLarge.copyWith(color: AppColors.error),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.error),
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log Out'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                context.go(AppRoutes.welcome);
              }
            },
            child: const Text(
              'Log Out',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}
