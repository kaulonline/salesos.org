import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';

import '../../../../core/config/theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';

/// Model for a device session
class DeviceSession {
  final String id;
  final String deviceType;
  final String deviceName;
  final String? location;
  final DateTime lastActive;
  final bool isCurrent;

  DeviceSession({
    required this.id,
    required this.deviceType,
    required this.deviceName,
    this.location,
    required this.lastActive,
    this.isCurrent = false,
  });

  factory DeviceSession.fromJson(Map<String, dynamic> json) {
    return DeviceSession(
      id: json['id'] as String? ?? '',
      deviceType: json['deviceType'] as String? ?? 'unknown',
      deviceName: json['deviceName'] as String? ?? 'Unknown Device',
      location: json['location'] as String?,
      lastActive: DateTime.tryParse(json['lastActive'] as String? ?? '') ?? DateTime.now(),
      isCurrent: json['isCurrent'] as bool? ?? false,
    );
  }
}

/// Provider for fetching active sessions
final activeSessionsProvider = FutureProvider<List<DeviceSession>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get('/sessions/active');
    final data = response.data;

    if (data is List) {
      return data.map((item) => DeviceSession.fromJson(item as Map<String, dynamic>)).toList();
    } else if (data is Map && data['sessions'] is List) {
      return (data['sessions'] as List)
          .map((item) => DeviceSession.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  } catch (e) {
    // Return empty list if API doesn't support sessions yet
    return [];
  }
});

/// Page for viewing and managing active sessions
class ActiveSessionsPage extends ConsumerStatefulWidget {
  const ActiveSessionsPage({super.key});

  @override
  ConsumerState<ActiveSessionsPage> createState() => _ActiveSessionsPageState();
}

class _ActiveSessionsPageState extends ConsumerState<ActiveSessionsPage> {
  bool _isRevoking = false;

  IconData _getDeviceIcon(String deviceType) {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
      case 'phone':
      case 'ios':
      case 'android':
        return Iconsax.mobile;
      case 'tablet':
      case 'ipad':
        return Iconsax.monitor;
      case 'desktop':
      case 'web':
        return Iconsax.monitor_mobbile;
      default:
        return Iconsax.device_message;
    }
  }

  String _formatLastActive(DateTime lastActive) {
    final now = DateTime.now();
    final difference = now.difference(lastActive);

    if (difference.inMinutes < 5) {
      return 'Active now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} minutes ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hours ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return DateFormat('MMM d, yyyy').format(lastActive);
    }
  }

  Future<void> _revokeSession(DeviceSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Sign Out Device?',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
          ),
          content: Text(
            'This will sign out "${session.deviceName}" from your account. They will need to sign in again to access SalesOS.',
            style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(
                'Cancel',
                style: IrisTheme.labelMedium.copyWith(color: LuxuryColors.textMuted),
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: LuxuryColors.errorRuby,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(
                'Sign Out',
                style: IrisTheme.labelMedium.copyWith(color: Colors.white),
              ),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() => _isRevoking = true);

    try {
      final api = ref.read(apiClientProvider);
      await api.post('/sessions/${session.id}/end');

      // Refresh the sessions list
      ref.invalidate(activeSessionsProvider);

      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Device signed out successfully'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to sign out device'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isRevoking = false);
      }
    }
  }

  Future<void> _revokeAllOtherSessions() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Sign Out All Other Devices?',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
          ),
          content: Text(
            'This will sign out all devices except this one. They will need to sign in again to access SalesOS.',
            style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(
                'Cancel',
                style: IrisTheme.labelMedium.copyWith(color: LuxuryColors.textMuted),
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: LuxuryColors.errorRuby,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(
                'Sign Out All',
                style: IrisTheme.labelMedium.copyWith(color: Colors.white),
              ),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() => _isRevoking = true);

    try {
      final api = ref.read(apiClientProvider);
      await api.post('/sessions/end-others');

      // Refresh the sessions list
      ref.invalidate(activeSessionsProvider);

      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('All other devices signed out'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to sign out devices'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isRevoking = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sessionsAsync = ref.watch(activeSessionsProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Iconsax.arrow_left,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Active Sessions',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              Iconsax.refresh,
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
            onPressed: () => ref.invalidate(activeSessionsProvider),
          ),
        ],
      ),
      body: sessionsAsync.when(
        loading: () => Center(
          child: CircularProgressIndicator(color: LuxuryColors.rolexGreen),
        ),
        error: (error, stack) => _buildEmptyState(isDark),
        data: (sessions) {
          if (sessions.isEmpty) {
            return _buildEmptyState(isDark);
          }

          // Sort sessions - current device first, then by last active
          sessions.sort((a, b) {
            if (a.isCurrent && !b.isCurrent) return -1;
            if (!a.isCurrent && b.isCurrent) return 1;
            return b.lastActive.compareTo(a.lastActive);
          });

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Info Card
                IrisCard(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: LuxuryColors.jadePremium.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Iconsax.security_safe,
                          color: LuxuryColors.jadePremium,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${sessions.length} Active ${sessions.length == 1 ? 'Session' : 'Sessions'}',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              'Manage devices signed into your account',
                              style: IrisTheme.bodySmall.copyWith(
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn().slideY(begin: 0.1),

                const SizedBox(height: 24),

                // Sessions List
                Text(
                  'Devices',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 12),

                IrisCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (int i = 0; i < sessions.length; i++) ...[
                        _buildSessionTile(sessions[i], isDark),
                        if (i < sessions.length - 1)
                          Divider(
                            height: 1,
                            indent: 72,
                            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                          ),
                      ],
                    ],
                  ),
                ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

                // Sign out all button
                if (sessions.where((s) => !s.isCurrent).isNotEmpty) ...[
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _isRevoking ? null : _revokeAllOtherSessions,
                      icon: _isRevoking
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: LuxuryColors.errorRuby,
                              ),
                            )
                          : Icon(Iconsax.logout, color: LuxuryColors.errorRuby),
                      label: Text(
                        'Sign Out All Other Devices',
                        style: IrisTheme.labelMedium.copyWith(
                          color: LuxuryColors.errorRuby,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: BorderSide(color: LuxuryColors.errorRuby.withValues(alpha: 0.5)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),
                ],

                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Iconsax.shield_tick,
              size: 48,
              color: LuxuryColors.rolexGreen,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Only This Device',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'You\'re only signed in on this device. Your account is secure.',
              style: IrisTheme.bodySmall.copyWith(
                color: LuxuryColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionTile(DeviceSession session, bool isDark) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: session.isCurrent
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
              : (isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurface),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          _getDeviceIcon(session.deviceType),
          color: session.isCurrent ? LuxuryColors.rolexGreen : LuxuryColors.textMuted,
          size: 22,
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              session.deviceName,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (session.isCurrent)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'This Device',
                style: IrisTheme.labelSmall.copyWith(
                  color: LuxuryColors.rolexGreen,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Text(
            _formatLastActive(session.lastActive),
            style: IrisTheme.bodySmall.copyWith(
              color: LuxuryColors.textMuted,
            ),
          ),
          if (session.location != null) ...[
            const SizedBox(height: 2),
            Row(
              children: [
                Icon(
                  Iconsax.location,
                  size: 12,
                  color: LuxuryColors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  session.location!,
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      trailing: session.isCurrent
          ? null
          : IconButton(
              icon: Icon(
                Iconsax.logout,
                color: LuxuryColors.errorRuby,
                size: 20,
              ),
              onPressed: () => _revokeSession(session),
            ),
    );
  }
}
