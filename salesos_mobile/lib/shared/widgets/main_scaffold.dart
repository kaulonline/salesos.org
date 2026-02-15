import 'package:flutter/material.dart';
import 'adaptive_scaffold.dart';
import 'license_gate.dart';

/// Main scaffold with adaptive navigation (bottom nav on phones, NavigationRail on tablets)
/// This is a simple wrapper around AdaptiveScaffold with license validation.
class MainScaffold extends StatelessWidget {
  final Widget child;

  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    // Wrap with license gate to ensure user has valid license
    // LicenseGate will show locked screen if no valid license
    return LicenseGate(
      child: AdaptiveScaffold(child: child),
    );
  }
}
