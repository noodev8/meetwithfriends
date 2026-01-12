import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    // Add a small delay for visual effect
    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (mounted) {
      await ref.read(authProvider.notifier).checkAuthStatus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Placeholder icon - will be replaced with actual app icon
            Container(
              width: 120,
              height: 120,
              decoration: const BoxDecoration(
                color: AppColors.white,
                borderRadius: AppSpacing.borderRadiusLg,
              ),
              child: const Icon(
                Icons.group,
                size: 64,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            const Text(
              'Meet With Friends',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AppColors.white,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
