import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/providers/auth_provider.dart';
import 'package:meetwithfriends/providers/events_provider.dart';
import 'package:meetwithfriends/providers/groups_provider.dart';
import 'package:meetwithfriends/screens/auth/forgot_password_screen.dart';
import 'package:meetwithfriends/screens/auth/login_screen.dart';
import 'package:meetwithfriends/screens/auth/register_screen.dart';
import 'package:meetwithfriends/screens/auth/reset_password_screen.dart';
import 'package:meetwithfriends/screens/auth/welcome_screen.dart';
import 'package:meetwithfriends/screens/events/attendees_screen.dart';
import 'package:meetwithfriends/screens/events/event_detail_screen.dart';
import 'package:meetwithfriends/screens/events/event_form_screen.dart';
import 'package:meetwithfriends/screens/events/my_events_screen.dart';
import 'package:meetwithfriends/screens/groups/group_detail_screen.dart';
import 'package:meetwithfriends/screens/groups/group_form_screen.dart';
import 'package:meetwithfriends/screens/groups/group_members_screen.dart';
import 'package:meetwithfriends/screens/groups/my_groups_screen.dart';
import 'package:meetwithfriends/screens/groups/past_events_screen.dart';
import 'package:meetwithfriends/screens/home/home_screen.dart';
import 'package:meetwithfriends/screens/main/main_shell.dart';
import 'package:meetwithfriends/screens/profile/profile_screen.dart';
import 'package:meetwithfriends/screens/splash_screen.dart';

abstract final class AppRoutes {
  static const String splash = '/';
  static const String welcome = '/welcome';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  static const String home = '/home';
  static const String events = '/events';
  static const String groups = '/groups';
  static const String profile = '/profile';
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final isInitial = authState.isInitial;
      final currentPath = state.matchedLocation;

      // While checking auth status, stay on splash
      if (isInitial || isLoading) {
        if (currentPath != AppRoutes.splash) {
          return AppRoutes.splash;
        }
        return null;
      }

      // Auth routes that don't require authentication
      final authRoutes = [
        AppRoutes.splash,
        AppRoutes.welcome,
        AppRoutes.login,
        AppRoutes.register,
        AppRoutes.forgotPassword,
        AppRoutes.resetPassword,
      ];
      final isOnAuthRoute = authRoutes.contains(currentPath);

      // If authenticated and on auth route, go to home
      if (isAuthenticated && isOnAuthRoute) {
        return AppRoutes.home;
      }

      // If not authenticated and not on auth route, go to welcome
      if (!isAuthenticated && !isOnAuthRoute) {
        return AppRoutes.welcome;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.welcome,
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.resetPassword,
        builder: (context, state) {
          final token = state.uri.queryParameters['token'] ?? '';
          return ResetPasswordScreen(token: token);
        },
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: AppRoutes.events,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MyEventsScreen(),
            ),
            routes: [
              GoRoute(
                path: ':eventId',
                builder: (context, state) {
                  final eventId =
                      int.tryParse(state.pathParameters['eventId'] ?? '') ?? 0;
                  return EventDetailScreen(eventId: eventId);
                },
                routes: [
                  GoRoute(
                    path: 'attendees',
                    builder: (context, state) {
                      final eventId = int.tryParse(
                            state.pathParameters['eventId'] ?? '',
                          ) ??
                          0;
                      return AttendeesScreen(eventId: eventId);
                    },
                  ),
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final eventId = int.tryParse(
                            state.pathParameters['eventId'] ?? '',
                          ) ??
                          0;
                      return _EventEditWrapper(eventId: eventId);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.groups,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MyGroupsScreen(),
            ),
            routes: [
              GoRoute(
                path: 'new',
                builder: (context, state) => const GroupFormScreen(),
              ),
              GoRoute(
                path: ':groupId',
                builder: (context, state) {
                  final groupId =
                      int.tryParse(state.pathParameters['groupId'] ?? '') ?? 0;
                  return GroupDetailScreen(groupId: groupId);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final groupId = int.tryParse(
                            state.pathParameters['groupId'] ?? '',
                          ) ??
                          0;
                      return _GroupEditWrapper(groupId: groupId);
                    },
                  ),
                  GoRoute(
                    path: 'events/new',
                    builder: (context, state) {
                      final groupId = int.tryParse(
                            state.pathParameters['groupId'] ?? '',
                          ) ??
                          0;
                      return EventFormScreen(groupId: groupId);
                    },
                  ),
                  GoRoute(
                    path: 'members',
                    builder: (context, state) {
                      final groupId = int.tryParse(
                            state.pathParameters['groupId'] ?? '',
                          ) ??
                          0;
                      return GroupMembersScreen(groupId: groupId);
                    },
                  ),
                  GoRoute(
                    path: 'past-events',
                    builder: (context, state) {
                      final groupId = int.tryParse(
                            state.pathParameters['groupId'] ?? '',
                          ) ??
                          0;
                      return PastEventsScreen(groupId: groupId);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.profile,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),
    ],
  );
});

class _GroupEditWrapper extends ConsumerWidget {
  const _GroupEditWrapper({required this.groupId});

  final int groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupAsync = ref.watch(groupDetailProvider(groupId));

    return groupAsync.when(
      data: (group) {
        if (group == null) {
          return const Scaffold(
            body: Center(child: Text('Group not found')),
          );
        }
        return GroupFormScreen(group: group);
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => const Scaffold(
        body: Center(child: Text('Failed to load group')),
      ),
    );
  }
}

class _EventEditWrapper extends ConsumerWidget {
  const _EventEditWrapper({required this.eventId});

  final int eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventAsync = ref.watch(eventDetailProvider(eventId));

    return eventAsync.when(
      data: (event) {
        if (event == null) {
          return const Scaffold(
            body: Center(child: Text('Event not found')),
          );
        }
        return EventFormScreen(groupId: event.groupId, event: event);
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => const Scaffold(
        body: Center(child: Text('Failed to load event')),
      ),
    );
  }
}
