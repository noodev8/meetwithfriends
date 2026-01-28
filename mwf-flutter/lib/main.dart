import 'package:flutter/material.dart';
import 'models/user.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/invite_screen.dart';
import 'screens/main_shell.dart';
import 'services/auth_service.dart';
import 'services/deep_link_service.dart';

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
  final _deepLinkService = DeepLinkService();
  final _navigatorKey = GlobalKey<NavigatorState>();
  bool _isLoading = true;
  bool _isLoggedIn = false;
  AuthScreen _authScreen = AuthScreen.login;
  User? _user;
  bool _deepLinksInitialized = false;

  // Pending invite for login-redirect flow
  String? _pendingInviteToken;
  String? _pendingInviteType;

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
        _user = result.user != null ? User.fromJson(result.user!) : null;
      });
      // Initialize deep links after auth check
      _initDeepLinks();
    }
  }

  void _initDeepLinks() {
    if (_deepLinksInitialized) return;
    _deepLinksInitialized = true;

    // Wait for navigator to be ready, then init deep links
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _deepLinkService.init(
        _navigatorKey,
        _isLoggedIn,
        onInviteLink: _handleInviteLink,
      );
    });
  }

  void _handleInviteLink(String token, String type) {
    final navigator = _navigatorKey.currentState;
    if (navigator == null) return;

    navigator.push(
      MaterialPageRoute(
        builder: (context) => InviteScreen(
          token: token,
          type: type,
          isLoggedIn: _isLoggedIn,
          user: _user,
          onAuthSuccess: _onInviteAuthSuccess,
          onNavigateToLogin: () => _onInviteLoginRequested(token, type),
        ),
      ),
    );
  }

  void _onInviteAuthSuccess(Map<String, dynamic> userData, String jwtToken) async {
    await _authService.storeToken(jwtToken);
    if (mounted) {
      setState(() {
        _isLoggedIn = true;
        _user = User.fromJson(userData);
      });
      _deepLinkService.updateLoginState(true);
    }
  }

  void _onInviteLoginRequested(String token, String type) {
    _pendingInviteToken = token;
    _pendingInviteType = type;

    // Pop the invite screen — user lands on login screen
    final navigator = _navigatorKey.currentState;
    if (navigator != null && navigator.canPop()) {
      navigator.pop();
    }
  }

  void _onLoginSuccess(Map<String, dynamic> userData) {
    setState(() {
      _isLoggedIn = true;
      _user = User.fromJson(userData);
    });
    _deepLinkService.updateLoginState(true);

    // Check for pending invite
    if (_pendingInviteToken != null && _pendingInviteType != null) {
      final token = _pendingInviteToken!;
      final type = _pendingInviteType!;
      _pendingInviteToken = null;
      _pendingInviteType = null;

      WidgetsBinding.instance.addPostFrameCallback((_) {
        _handleInviteLink(token, type);
      });
    }
  }

  void _onUserUpdated(User updatedUser) {
    setState(() {
      _user = updatedUser;
    });
  }

  Future<void> _onLogout() async {
    await _authService.logout();
    if (mounted) {
      setState(() {
        _isLoggedIn = false;
        _user = null;
      });
      _deepLinkService.updateLoginState(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Meet With Friends',
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigatorKey,
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
      return MainShell(
        user: _user!,
        onLogout: _onLogout,
        onUserUpdated: _onUserUpdated,
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
