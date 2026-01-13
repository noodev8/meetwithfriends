import 'package:flutter/material.dart';

class DashboardScreen extends StatelessWidget {
  final String userName;
  final VoidCallback onLogout;

  const DashboardScreen({
    super.key,
    required this.userName,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text('Dashboard'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: onLogout,
          ),
        ],
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isSmallScreen = constraints.maxWidth < 400;

            final iconSize = isSmallScreen ? 64.0 : 80.0;
            final welcomeFontSize = isSmallScreen ? 20.0 : 24.0;
            final subtitleFontSize = isSmallScreen ? 14.0 : 16.0;
            final hintFontSize = isSmallScreen ? 12.0 : 14.0;
            final spacing = isSmallScreen ? 16.0 : 24.0;
            final largeSpacing = isSmallScreen ? 32.0 : 48.0;

            return Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(isSmallScreen ? 16 : 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.check_circle,
                      size: iconSize,
                      color: const Color(0xFF7C3AED),
                    ),
                    SizedBox(height: spacing),
                    Text(
                      'Welcome, $userName!',
                      style: TextStyle(
                        fontSize: welcomeFontSize,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF1E293B),
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You are logged in.',
                      style: TextStyle(
                        fontSize: subtitleFontSize,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                    SizedBox(height: largeSpacing),
                    Text(
                      'Dashboard coming soon...',
                      style: TextStyle(
                        fontSize: hintFontSize,
                        color: const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
