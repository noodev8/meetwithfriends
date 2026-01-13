import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/dashboard_screen.dart';
import 'services/auth_service.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

enum AuthScreen { login, register, forgotPassword }

class _MyAppState extends State<MyApp> {
  final _authService = AuthService();
  bool _isLoading = true;
  bool _isLoggedIn = false;
  AuthScreen _authScreen = AuthScreen.login;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final result = await _authService.checkAuth();
    if (mounted) {
      setState(() {
        _isLoading = false;
        _isLoggedIn = result.success;
        _user = result.user;
      });
    }
  }

  void _onLoginSuccess(Map<String, dynamic> user) {
    setState(() {
      _isLoggedIn = true;
      _user = user;
    });
  }

  Future<void> _onLogout() async {
    await _authService.logout();
    if (mounted) {
      setState(() {
        _isLoggedIn = false;
        _user = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Meet With Friends',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7C3AED)),
        useMaterial3: true,
      ),
      home: _buildHome(),
    );
  }

  void _navigateToRegister() {
    setState(() {
      _authScreen = AuthScreen.register;
    });
  }

  void _navigateToLogin() {
    setState(() {
      _authScreen = AuthScreen.login;
    });
  }

  void _navigateToForgotPassword() {
    setState(() {
      _authScreen = AuthScreen.forgotPassword;
    });
  }

  Widget _buildHome() {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF5F7FA),
        body: Center(
          child: CircularProgressIndicator(
            color: Color(0xFF7C3AED),
          ),
        ),
      );
    }

    if (_isLoggedIn && _user != null) {
      return DashboardScreen(
        userName: _user!['name'] as String? ?? 'User',
        onLogout: _onLogout,
      );
    }

    switch (_authScreen) {
      case AuthScreen.register:
        return RegisterScreen(
          onRegisterSuccess: _onLoginSuccess,
          onNavigateToLogin: _navigateToLogin,
        );
      case AuthScreen.forgotPassword:
        return ForgotPasswordScreen(
          onNavigateToLogin: _navigateToLogin,
        );
      case AuthScreen.login:
        return LoginScreen(
          onLoginSuccess: _onLoginSuccess,
          onNavigateToRegister: _navigateToRegister,
          onNavigateToForgotPassword: _navigateToForgotPassword,
        );
    }
  }
}
