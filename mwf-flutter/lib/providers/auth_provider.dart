import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/models/user.dart';
import 'package:meetwithfriends/services/auth_service.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  const AuthState({required this.status, this.user, this.errorMessage});

  const AuthState.initial()
    : status = AuthStatus.initial,
      user = null,
      errorMessage = null;

  const AuthState.loading()
    : status = AuthStatus.loading,
      user = null,
      errorMessage = null;

  const AuthState.authenticated(this.user)
    : status = AuthStatus.authenticated,
      errorMessage = null;

  const AuthState.unauthenticated()
    : status = AuthStatus.unauthenticated,
      user = null,
      errorMessage = null;

  const AuthState.error(this.errorMessage)
    : status = AuthStatus.error,
      user = null;

  final AuthStatus status;
  final User? user;
  final String? errorMessage;

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get isInitial => status == AuthStatus.initial;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._authService) : super(const AuthState.initial());

  final AuthService _authService;

  Future<void> checkAuthStatus() async {
    state = const AuthState.loading();

    final hasToken = await _authService.hasStoredToken();
    if (!hasToken) {
      state = const AuthState.unauthenticated();
      return;
    }

    final result = await _authService.getCurrentUser();
    if (result.isSuccess && result.user != null) {
      state = AuthState.authenticated(result.user);
    } else {
      state = const AuthState.unauthenticated();
    }
  }

  Future<bool> login({required String email, required String password}) async {
    state = const AuthState.loading();

    final result = await _authService.login(email: email, password: password);

    if (result.isSuccess && result.user != null) {
      state = AuthState.authenticated(result.user);
      return true;
    } else {
      state = AuthState.error(result.errorMessage ?? 'Login failed');
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String displayName,
    String? firstName,
    String? lastName,
  }) async {
    state = const AuthState.loading();

    final result = await _authService.register(
      email: email,
      password: password,
      displayName: displayName,
      firstName: firstName,
      lastName: lastName,
    );

    if (result.isSuccess && result.user != null) {
      state = AuthState.authenticated(result.user);
      return true;
    } else {
      state = AuthState.error(result.errorMessage ?? 'Registration failed');
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = const AuthState.unauthenticated();
  }

  void clearError() {
    if (state.status == AuthStatus.error) {
      state = const AuthState.unauthenticated();
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});

final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authProvider);
  return authState.user;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authProvider);
  return authState.isAuthenticated;
});
