import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/presentation/bloc/auth_provider.dart';

/// Gate widget that only shows its child if the user has one of the required roles
class RoleGate extends ConsumerWidget {
  final Widget child;
  final List<String> allowedRoles;
  final Widget? fallback;

  const RoleGate({
    super.key,
    required this.child,
    required this.allowedRoles,
    this.fallback,
  });

  /// Show only for admin users
  factory RoleGate.admin({
    Key? key,
    required Widget child,
    Widget? fallback,
  }) {
    return RoleGate(
      key: key,
      allowedRoles: const ['ADMIN'],
      fallback: fallback,
      child: child,
    );
  }

  /// Show for admin and manager users
  factory RoleGate.adminOrManager({
    Key? key,
    required Widget child,
    Widget? fallback,
  }) {
    return RoleGate(
      key: key,
      allowedRoles: const ['ADMIN', 'MANAGER'],
      fallback: fallback,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final userRole = user?.role?.toUpperCase() ?? '';

    if (allowedRoles.any((role) => role.toUpperCase() == userRole)) {
      return child;
    }

    return fallback ?? const SizedBox.shrink();
  }
}
