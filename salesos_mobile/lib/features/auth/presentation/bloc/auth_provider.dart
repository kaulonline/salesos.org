import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/auth_repository.dart';
import '../../domain/entities/user.dart';
import '../../../../core/services/app_lifecycle_service.dart';

/// Auth state
enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error ?? this.error,
    );
  }
}

/// Auth state provider
final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

/// Current user provider
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

/// Is authenticated provider
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).status == AuthStatus.authenticated;
});

class AuthNotifier extends Notifier<AuthState> {
  late final AuthRepository _repository;

  @override
  AuthState build() {
    _repository = ref.watch(authRepositoryProvider);
    return const AuthState();
  }

  /// Check authentication status
  Future<void> checkAuth() async {
    state = state.copyWith(status: AuthStatus.loading);

    try {
      final isAuth = await _repository.isAuthenticated();

      if (isAuth) {
        final user = await _repository.getCurrentUser();
        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: user,
        );
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (e) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  /// Login with email and password
  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);

    try {
      final response = await _repository.login(email, password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: response.user,
      );
      // Notify lifecycle service about login
      final lifecycleService = ref.read(appLifecycleServiceProvider);
      await lifecycleService.onUserLogin();
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
    }
  }

  /// Register new user with organization code for B2B enterprise access
  Future<void> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
    String? company,
    String? organizationCode,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);

    try {
      final response = await _repository.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        company: company,
        organizationCode: organizationCode,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: response.user,
      );
      // Notify lifecycle service about login
      final lifecycleService = ref.read(appLifecycleServiceProvider);
      await lifecycleService.onUserLogin();
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
    }
  }

  /// Logout
  Future<void> logout() async {

    // Run lifecycle cleanup with timeout to prevent hanging
    try {
      final lifecycleService = ref.read(appLifecycleServiceProvider);
      // Use timeout to prevent hanging if network operations are slow
      await lifecycleService.onUserLogout().timeout(
        const Duration(seconds: 3),
        onTimeout: () {
        },
      );
    } catch (e) {
      // Ignore lifecycle errors
    }

    // Clear auth tokens with timeout
    try {
      await _repository.logout().timeout(
        const Duration(seconds: 3),
        onTimeout: () {
        },
      );
    } catch (e) {
      // Ignore logout errors - still clear local state
    }

    // Always set state to unauthenticated
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Request password reset
  Future<bool> requestPasswordReset(String email) async {
    try {
      await _repository.requestPasswordReset(email);
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}
