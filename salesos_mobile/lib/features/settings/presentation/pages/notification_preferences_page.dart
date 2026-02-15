import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../core/services/user_preferences_service.dart';

// ============================================================================
// NOTIFICATION PREFERENCES MODELS
// ============================================================================

/// Push notification settings
class PushNotificationSettings {
  final bool masterEnabled;
  final bool dealUpdates;
  final bool taskReminders;
  final bool aiInsights;
  final bool meetingReminders;

  const PushNotificationSettings({
    this.masterEnabled = true,
    this.dealUpdates = true,
    this.taskReminders = true,
    this.aiInsights = true,
    this.meetingReminders = true,
  });

  PushNotificationSettings copyWith({
    bool? masterEnabled,
    bool? dealUpdates,
    bool? taskReminders,
    bool? aiInsights,
    bool? meetingReminders,
  }) {
    return PushNotificationSettings(
      masterEnabled: masterEnabled ?? this.masterEnabled,
      dealUpdates: dealUpdates ?? this.dealUpdates,
      taskReminders: taskReminders ?? this.taskReminders,
      aiInsights: aiInsights ?? this.aiInsights,
      meetingReminders: meetingReminders ?? this.meetingReminders,
    );
  }

  Map<String, dynamic> toJson() => {
        'masterEnabled': masterEnabled,
        'dealUpdates': dealUpdates,
        'taskReminders': taskReminders,
        'aiInsights': aiInsights,
        'meetingReminders': meetingReminders,
      };

  factory PushNotificationSettings.fromJson(Map<String, dynamic> json) {
    return PushNotificationSettings(
      masterEnabled: json['masterEnabled'] as bool? ?? true,
      dealUpdates: json['dealUpdates'] as bool? ?? true,
      taskReminders: json['taskReminders'] as bool? ?? true,
      aiInsights: json['aiInsights'] as bool? ?? true,
      meetingReminders: json['meetingReminders'] as bool? ?? true,
    );
  }
}

/// Email notification settings
class EmailNotificationSettings {
  final bool masterEnabled;
  final bool dailyDigest;
  final bool weeklySummary;
  final bool dealAlerts;

  const EmailNotificationSettings({
    this.masterEnabled = true,
    this.dailyDigest = true,
    this.weeklySummary = true,
    this.dealAlerts = true,
  });

  EmailNotificationSettings copyWith({
    bool? masterEnabled,
    bool? dailyDigest,
    bool? weeklySummary,
    bool? dealAlerts,
  }) {
    return EmailNotificationSettings(
      masterEnabled: masterEnabled ?? this.masterEnabled,
      dailyDigest: dailyDigest ?? this.dailyDigest,
      weeklySummary: weeklySummary ?? this.weeklySummary,
      dealAlerts: dealAlerts ?? this.dealAlerts,
    );
  }

  Map<String, dynamic> toJson() => {
        'masterEnabled': masterEnabled,
        'dailyDigest': dailyDigest,
        'weeklySummary': weeklySummary,
        'dealAlerts': dealAlerts,
      };

  factory EmailNotificationSettings.fromJson(Map<String, dynamic> json) {
    return EmailNotificationSettings(
      masterEnabled: json['masterEnabled'] as bool? ?? true,
      dailyDigest: json['dailyDigest'] as bool? ?? true,
      weeklySummary: json['weeklySummary'] as bool? ?? true,
      dealAlerts: json['dealAlerts'] as bool? ?? true,
    );
  }
}

/// Days selection mode for quiet hours
enum QuietHoursDaysMode {
  weekdaysOnly,
  weekendsOnly,
  allDays,
  custom,
}

/// Quiet hours configuration
class QuietHoursConfig {
  final bool enabled;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final QuietHoursDaysMode daysMode;
  final Set<int> customDays; // 0 = Sunday, 6 = Saturday

  const QuietHoursConfig({
    this.enabled = false,
    this.startTime = const TimeOfDay(hour: 22, minute: 0),
    this.endTime = const TimeOfDay(hour: 7, minute: 0),
    this.daysMode = QuietHoursDaysMode.allDays,
    this.customDays = const {0, 1, 2, 3, 4, 5, 6},
  });

  /// Get active days based on mode
  Set<int> get activeDays {
    switch (daysMode) {
      case QuietHoursDaysMode.weekdaysOnly:
        return {1, 2, 3, 4, 5}; // Mon-Fri
      case QuietHoursDaysMode.weekendsOnly:
        return {0, 6}; // Sat-Sun
      case QuietHoursDaysMode.allDays:
        return {0, 1, 2, 3, 4, 5, 6};
      case QuietHoursDaysMode.custom:
        return customDays;
    }
  }

  QuietHoursConfig copyWith({
    bool? enabled,
    TimeOfDay? startTime,
    TimeOfDay? endTime,
    QuietHoursDaysMode? daysMode,
    Set<int>? customDays,
  }) {
    return QuietHoursConfig(
      enabled: enabled ?? this.enabled,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      daysMode: daysMode ?? this.daysMode,
      customDays: customDays ?? this.customDays,
    );
  }

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'startHour': startTime.hour,
        'startMinute': startTime.minute,
        'endHour': endTime.hour,
        'endMinute': endTime.minute,
        'daysMode': daysMode.index,
        'customDays': customDays.toList(),
      };

  factory QuietHoursConfig.fromJson(Map<String, dynamic> json) {
    return QuietHoursConfig(
      enabled: json['enabled'] as bool? ?? false,
      startTime: TimeOfDay(
        hour: json['startHour'] as int? ?? 22,
        minute: json['startMinute'] as int? ?? 0,
      ),
      endTime: TimeOfDay(
        hour: json['endHour'] as int? ?? 7,
        minute: json['endMinute'] as int? ?? 0,
      ),
      daysMode: QuietHoursDaysMode.values[json['daysMode'] as int? ?? 2],
      customDays: (json['customDays'] as List<dynamic>?)
              ?.map((e) => e as int)
              .toSet() ??
          {0, 1, 2, 3, 4, 5, 6},
    );
  }
}

/// Sound option model
class SoundOption {
  final String id;
  final String name;
  final String? assetPath;

  const SoundOption({
    required this.id,
    required this.name,
    this.assetPath,
  });
}

/// Sound & vibration settings
class SoundVibrationSettings {
  final bool soundEnabled;
  final bool vibrationEnabled;
  final String selectedSound;

  const SoundVibrationSettings({
    this.soundEnabled = true,
    this.vibrationEnabled = true,
    this.selectedSound = 'default',
  });

  SoundVibrationSettings copyWith({
    bool? soundEnabled,
    bool? vibrationEnabled,
    String? selectedSound,
  }) {
    return SoundVibrationSettings(
      soundEnabled: soundEnabled ?? this.soundEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
      selectedSound: selectedSound ?? this.selectedSound,
    );
  }

  Map<String, dynamic> toJson() => {
        'soundEnabled': soundEnabled,
        'vibrationEnabled': vibrationEnabled,
        'selectedSound': selectedSound,
      };

  factory SoundVibrationSettings.fromJson(Map<String, dynamic> json) {
    return SoundVibrationSettings(
      soundEnabled: json['soundEnabled'] as bool? ?? true,
      vibrationEnabled: json['vibrationEnabled'] as bool? ?? true,
      selectedSound: json['selectedSound'] as String? ?? 'default',
    );
  }
}

/// Complete notification preferences state
class NotificationPreferencesState {
  final PushNotificationSettings push;
  final EmailNotificationSettings email;
  final QuietHoursConfig quietHours;
  final SoundVibrationSettings soundVibration;
  final bool isLoading;
  final bool isSyncing;

  const NotificationPreferencesState({
    this.push = const PushNotificationSettings(),
    this.email = const EmailNotificationSettings(),
    this.quietHours = const QuietHoursConfig(),
    this.soundVibration = const SoundVibrationSettings(),
    this.isLoading = false,
    this.isSyncing = false,
  });

  NotificationPreferencesState copyWith({
    PushNotificationSettings? push,
    EmailNotificationSettings? email,
    QuietHoursConfig? quietHours,
    SoundVibrationSettings? soundVibration,
    bool? isLoading,
    bool? isSyncing,
  }) {
    return NotificationPreferencesState(
      push: push ?? this.push,
      email: email ?? this.email,
      quietHours: quietHours ?? this.quietHours,
      soundVibration: soundVibration ?? this.soundVibration,
      isLoading: isLoading ?? this.isLoading,
      isSyncing: isSyncing ?? this.isSyncing,
    );
  }

  Map<String, dynamic> toJson() => {
        'push': push.toJson(),
        'email': email.toJson(),
        'quietHours': quietHours.toJson(),
        'soundVibration': soundVibration.toJson(),
      };

  factory NotificationPreferencesState.fromJson(Map<String, dynamic> json) {
    return NotificationPreferencesState(
      push: json['push'] != null
          ? PushNotificationSettings.fromJson(json['push'] as Map<String, dynamic>)
          : const PushNotificationSettings(),
      email: json['email'] != null
          ? EmailNotificationSettings.fromJson(json['email'] as Map<String, dynamic>)
          : const EmailNotificationSettings(),
      quietHours: json['quietHours'] != null
          ? QuietHoursConfig.fromJson(json['quietHours'] as Map<String, dynamic>)
          : const QuietHoursConfig(),
      soundVibration: json['soundVibration'] != null
          ? SoundVibrationSettings.fromJson(json['soundVibration'] as Map<String, dynamic>)
          : const SoundVibrationSettings(),
    );
  }
}

// ============================================================================
// NOTIFICATION PREFERENCES NOTIFIER
// ============================================================================

class NotificationPreferencesNotifier extends Notifier<NotificationPreferencesState> {
  static const String _storageKey = 'notification_preferences';

  @override
  NotificationPreferencesState build() {
    _loadPreferences();
    return const NotificationPreferencesState();
  }

  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);
  ApiClient get _apiClient => ref.read(apiClientProvider);

  Future<void> _loadPreferences() async {
    state = state.copyWith(isLoading: true);
    try {
      final json = _prefs.getString(_storageKey);
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        state = NotificationPreferencesState.fromJson(data);
      }
    } catch (e) {
      // Keep default state on error
    }
    state = state.copyWith(isLoading: false);
  }

  Future<void> _savePreferences() async {
    state = state.copyWith(isSyncing: true);
    try {
      final json = jsonEncode(state.toJson());
      await _prefs.setString(_storageKey, json);
      // Sync to backend
      await _syncToBackend();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('NotificationPreferencesNotifier: Error saving preferences: $e');
      }
    }
    state = state.copyWith(isSyncing: false);
  }

  Future<void> _syncToBackend() async {
    try {
      await _apiClient.patch(
        '/users/me/preferences',
        data: {
          'notificationPreferences': state.toJson(),
        },
      );
    } catch (e) {
      // Ignore sync errors, local storage is primary
      if (kDebugMode) {
        debugPrint('NotificationPreferencesNotifier: Backend sync failed: $e');
      }
    }
  }

  // Push notification methods
  void togglePushMaster(bool value) {
    state = state.copyWith(push: state.push.copyWith(masterEnabled: value));
    _savePreferences();
  }

  void togglePushDealUpdates(bool value) {
    state = state.copyWith(push: state.push.copyWith(dealUpdates: value));
    _savePreferences();
  }

  void togglePushTaskReminders(bool value) {
    state = state.copyWith(push: state.push.copyWith(taskReminders: value));
    _savePreferences();
  }

  void togglePushAiInsights(bool value) {
    state = state.copyWith(push: state.push.copyWith(aiInsights: value));
    _savePreferences();
  }

  void togglePushMeetingReminders(bool value) {
    state = state.copyWith(push: state.push.copyWith(meetingReminders: value));
    _savePreferences();
  }

  // Email notification methods
  void toggleEmailMaster(bool value) {
    state = state.copyWith(email: state.email.copyWith(masterEnabled: value));
    _savePreferences();
  }

  void toggleEmailDailyDigest(bool value) {
    state = state.copyWith(email: state.email.copyWith(dailyDigest: value));
    _savePreferences();
  }

  void toggleEmailWeeklySummary(bool value) {
    state = state.copyWith(email: state.email.copyWith(weeklySummary: value));
    _savePreferences();
  }

  void toggleEmailDealAlerts(bool value) {
    state = state.copyWith(email: state.email.copyWith(dealAlerts: value));
    _savePreferences();
  }

  // Quiet hours methods
  void toggleQuietHours(bool value) {
    state = state.copyWith(quietHours: state.quietHours.copyWith(enabled: value));
    _savePreferences();
  }

  void setQuietHoursStartTime(TimeOfDay time) {
    state = state.copyWith(quietHours: state.quietHours.copyWith(startTime: time));
    _savePreferences();
  }

  void setQuietHoursEndTime(TimeOfDay time) {
    state = state.copyWith(quietHours: state.quietHours.copyWith(endTime: time));
    _savePreferences();
  }

  void setQuietHoursDaysMode(QuietHoursDaysMode mode) {
    state = state.copyWith(quietHours: state.quietHours.copyWith(daysMode: mode));
    _savePreferences();
  }

  void setQuietHoursCustomDays(Set<int> days) {
    state = state.copyWith(
      quietHours: state.quietHours.copyWith(
        daysMode: QuietHoursDaysMode.custom,
        customDays: days,
      ),
    );
    _savePreferences();
  }

  // Sound & vibration methods
  void toggleSound(bool value) {
    state = state.copyWith(soundVibration: state.soundVibration.copyWith(soundEnabled: value));
    _savePreferences();
  }

  void toggleVibration(bool value) {
    state = state.copyWith(soundVibration: state.soundVibration.copyWith(vibrationEnabled: value));
    _savePreferences();
  }

  void setSelectedSound(String soundId) {
    state = state.copyWith(soundVibration: state.soundVibration.copyWith(selectedSound: soundId));
    _savePreferences();
  }
}

/// Provider for notification preferences
final notificationPreferencesProvider =
    NotifierProvider<NotificationPreferencesNotifier, NotificationPreferencesState>(
  NotificationPreferencesNotifier.new,
);

// ============================================================================
// NOTIFICATION PREFERENCES PAGE
// ============================================================================

class NotificationPreferencesPage extends ConsumerStatefulWidget {
  const NotificationPreferencesPage({super.key});

  @override
  ConsumerState<NotificationPreferencesPage> createState() => _NotificationPreferencesPageState();
}

class _NotificationPreferencesPageState extends ConsumerState<NotificationPreferencesPage> {
  // Sound options
  static const List<SoundOption> _soundOptions = [
    SoundOption(id: 'default', name: 'Default'),
    SoundOption(id: 'chime', name: 'Chime'),
    SoundOption(id: 'bell', name: 'Bell'),
    SoundOption(id: 'gentle', name: 'Gentle'),
    SoundOption(id: 'premium', name: 'Premium'),
    SoundOption(id: 'none', name: 'None'),
  ];

  // Day names for quiet hours
  static const List<String> _dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  @override
  Widget build(BuildContext context) {
    final prefs = ref.watch(notificationPreferencesProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            expandedHeight: 100,
            floating: false,
            pinned: true,
            backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
            leading: IconButton(
              icon: Icon(
                Iconsax.arrow_left,
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
              onPressed: () => context.pop(),
            ),
            actions: [
              if (prefs.isSyncing)
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.rolexGreen),
                    ),
                  ),
                ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 56, bottom: 16),
              title: Text(
                'Notification Preferences',
                style: IrisTheme.titleLarge.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontSize: 18,
                ),
              ),
            ),
          ),

          // Content
          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Push Notifications Section
                _buildSectionHeader('Push Notifications', isDark, delay: 0),
                const SizedBox(height: 12),
                _buildPushNotificationsCard(prefs, isDark),

                const SizedBox(height: 28),

                // Email Notifications Section
                _buildSectionHeader('Email Notifications', isDark, delay: 50),
                const SizedBox(height: 12),
                _buildEmailNotificationsCard(prefs, isDark),

                const SizedBox(height: 28),

                // Quiet Hours Section
                _buildSectionHeader('Quiet Hours', isDark, delay: 100),
                const SizedBox(height: 12),
                _buildQuietHoursCard(prefs, isDark),

                const SizedBox(height: 28),

                // Sound & Vibration Section
                _buildSectionHeader('Sound & Vibration', isDark, delay: 150),
                const SizedBox(height: 12),
                _buildSoundVibrationCard(prefs, isDark),

                const SizedBox(height: 100),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark, {int delay = 0}) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 20,
          decoration: BoxDecoration(
            gradient: LuxuryColors.emeraldGradient,
            borderRadius: BorderRadius.circular(2),
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                blurRadius: 4,
                spreadRadius: 0,
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title.toUpperCase(),
          style: IrisTheme.labelMedium.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            letterSpacing: 1.2,
            fontWeight: IrisTheme.weightSemiBold,
          ),
        ),
      ],
    ).animate().fadeIn(duration: 300.ms, delay: Duration(milliseconds: delay)).slideX(begin: -0.1);
  }

  // ============================================================================
  // PUSH NOTIFICATIONS SECTION
  // ============================================================================

  Widget _buildPushNotificationsCard(NotificationPreferencesState prefs, bool isDark) {
    final isEnabled = prefs.push.masterEnabled;

    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          // Master toggle
          _buildMasterToggle(
            title: 'All Push Notifications',
            subtitle: 'Enable or disable all push notifications',
            icon: Iconsax.notification,
            value: isEnabled,
            onChanged: (value) {
              HapticFeedback.lightImpact();
              ref.read(notificationPreferencesProvider.notifier).togglePushMaster(value);
            },
            isDark: isDark,
            isMaster: true,
          ),

          // Sub-toggles (disabled when master is off)
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                _buildDivider(isDark),
                _buildToggleItem(
                  title: 'Deal Updates',
                  subtitle: 'Stage changes and deal progress',
                  icon: Iconsax.chart_success,
                  value: prefs.push.dealUpdates,
                  onChanged: isEnabled
                      ? (value) {
                          HapticFeedback.lightImpact();
                          ref.read(notificationPreferencesProvider.notifier).togglePushDealUpdates(value);
                        }
                      : null,
                  isDark: isDark,
                ),
                _buildDivider(isDark),
                _buildToggleItem(
                  title: 'Task Reminders',
                  subtitle: 'Upcoming deadlines and due tasks',
                  icon: Iconsax.task_square,
                  value: prefs.push.taskReminders,
                  onChanged: isEnabled
                      ? (value) {
                          HapticFeedback.lightImpact();
                          ref.read(notificationPreferencesProvider.notifier).togglePushTaskReminders(value);
                        }
                      : null,
                  isDark: isDark,
                ),
                _buildDivider(isDark),
                _buildToggleItem(
                  title: 'AI Insights',
                  subtitle: 'SalesOS recommendations and alerts',
                  icon: Iconsax.cpu,
                  value: prefs.push.aiInsights,
                  onChanged: isEnabled
                      ? (value) {
                          HapticFeedback.lightImpact();
                          ref.read(notificationPreferencesProvider.notifier).togglePushAiInsights(value);
                        }
                      : null,
                  isDark: isDark,
                ),
                _buildDivider(isDark),
                _buildToggleItem(
                  title: 'Meeting Reminders',
                  subtitle: 'Upcoming meetings and appointments',
                  icon: Iconsax.calendar,
                  value: prefs.push.meetingReminders,
                  onChanged: isEnabled
                      ? (value) {
                          HapticFeedback.lightImpact();
                          ref.read(notificationPreferencesProvider.notifier).togglePushMeetingReminders(value);
                        }
                      : null,
                  isDark: isDark,
                  showDivider: false,
                ),
              ],
            ),
            crossFadeState: isEnabled ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 300),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms, delay: 100.ms).slideY(begin: 0.1);
  }

  // ============================================================================
  // EMAIL NOTIFICATIONS SECTION
  // ============================================================================

  Widget _buildEmailNotificationsCard(NotificationPreferencesState prefs, bool isDark) {
    final isEnabled = prefs.email.masterEnabled;

    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          // Master toggle
          _buildMasterToggle(
            title: 'All Email Notifications',
            subtitle: 'Enable or disable all email notifications',
            icon: Iconsax.sms,
            value: isEnabled,
            onChanged: (value) {
              HapticFeedback.lightImpact();
              ref.read(notificationPreferencesProvider.notifier).toggleEmailMaster(value);
            },
            isDark: isDark,
            isMaster: true,
          ),

          // Sub-toggles (disabled when master is off)
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                _buildDivider(isDark),
                _buildToggleItem(
                  title: 'Daily Digest',
                  subtitle: 'Daily summary of activities',
                  icon: Iconsax.document_text,
                  value: prefs.email.dailyDigest,
                  onChanged: isEnabled
                      ? (value) {
                          HapticFeedback.lightImpact();
                          ref.read(notificationPreferencesProvider.notifier).toggleEmailDailyDigest(value);
                        }
                      : null,
                  isDark: isDark,
                ),
                _buildDivider(isDark),
                _buildToggleItem(
                  title: 'Weekly Summary',
                  subtitle: 'Weekly performance report',
                  icon: Iconsax.chart_2,
                  value: prefs.email.weeklySummary,
                  onChanged: isEnabled
                      ? (value) {
                          HapticFeedback.lightImpact();
                          ref.read(notificationPreferencesProvider.notifier).toggleEmailWeeklySummary(value);
                        }
                      : null,
                  isDark: isDark,
                ),
                _buildDivider(isDark),
                _buildToggleItem(
                  title: 'Deal Alerts',
                  subtitle: 'Important deal updates via email',
                  icon: Iconsax.dollar_circle,
                  value: prefs.email.dealAlerts,
                  onChanged: isEnabled
                      ? (value) {
                          HapticFeedback.lightImpact();
                          ref.read(notificationPreferencesProvider.notifier).toggleEmailDealAlerts(value);
                        }
                      : null,
                  isDark: isDark,
                  showDivider: false,
                ),
              ],
            ),
            crossFadeState: isEnabled ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 300),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms, delay: 150.ms).slideY(begin: 0.1);
  }

  // ============================================================================
  // QUIET HOURS SECTION
  // ============================================================================

  Widget _buildQuietHoursCard(NotificationPreferencesState prefs, bool isDark) {
    final isEnabled = prefs.quietHours.enabled;

    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          // Enable toggle
          _buildMasterToggle(
            title: 'Enable Quiet Hours',
            subtitle: 'Silence notifications during specific times',
            icon: Iconsax.moon,
            value: isEnabled,
            onChanged: (value) {
              HapticFeedback.lightImpact();
              ref.read(notificationPreferencesProvider.notifier).toggleQuietHours(value);
            },
            isDark: isDark,
            isMaster: true,
          ),

          // Time and day settings (only shown when enabled)
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                _buildDivider(isDark),
                _buildTimeRangePicker(prefs, isDark),
                _buildDivider(isDark),
                _buildDaysModeSelector(prefs, isDark),
              ],
            ),
            crossFadeState: isEnabled ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 300),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms, delay: 200.ms).slideY(begin: 0.1);
  }

  Widget _buildTimeRangePicker(NotificationPreferencesState prefs, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: _buildTimePicker(
              label: 'Start Time',
              time: prefs.quietHours.startTime,
              onTap: () => _selectTime(context, prefs.quietHours.startTime, true),
              isDark: isDark,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Icon(
                  Iconsax.arrow_right_3,
                  size: 20,
                  color: LuxuryColors.rolexGreen,
                ),
                const SizedBox(height: 4),
                Text(
                  'to',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _buildTimePicker(
              label: 'End Time',
              time: prefs.quietHours.endTime,
              onTap: () => _selectTime(context, prefs.quietHours.endTime, false),
              isDark: isDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimePicker({
    required String label,
    required TimeOfDay time,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark
              ? LuxuryColors.obsidian.withValues(alpha: 0.5)
              : Colors.grey.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: IrisTheme.labelSmall.copyWith(
                color: LuxuryColors.rolexGreen,
                fontWeight: IrisTheme.weightSemiBold,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  _formatTimeOfDay(time),
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const Spacer(),
                Icon(
                  Iconsax.clock,
                  size: 18,
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.7),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDaysModeSelector(NotificationPreferencesState prefs, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Iconsax.calendar_1,
                  size: 18,
                  color: LuxuryColors.rolexGreen,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Active Days',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontWeight: IrisTheme.weightMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Days mode chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildDaysModeChip(
                label: 'Weekdays Only',
                mode: QuietHoursDaysMode.weekdaysOnly,
                currentMode: prefs.quietHours.daysMode,
                isDark: isDark,
              ),
              _buildDaysModeChip(
                label: 'Weekends Only',
                mode: QuietHoursDaysMode.weekendsOnly,
                currentMode: prefs.quietHours.daysMode,
                isDark: isDark,
              ),
              _buildDaysModeChip(
                label: 'All Days',
                mode: QuietHoursDaysMode.allDays,
                currentMode: prefs.quietHours.daysMode,
                isDark: isDark,
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Custom day selector (always visible for visual feedback)
          Text(
            'Or select specific days:',
            style: IrisTheme.labelSmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(7, (index) {
              final isSelected = prefs.quietHours.activeDays.contains(index);
              final isCustomMode = prefs.quietHours.daysMode == QuietHoursDaysMode.custom;

              return GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  final newDays = Set<int>.from(prefs.quietHours.customDays);
                  if (isSelected && isCustomMode) {
                    newDays.remove(index);
                  } else {
                    newDays.add(index);
                  }
                  ref.read(notificationPreferencesProvider.notifier).setQuietHoursCustomDays(newDays);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? LuxuryColors.rolexGreen
                        : (isDark
                            ? LuxuryColors.obsidian.withValues(alpha: 0.5)
                            : Colors.grey.withValues(alpha: 0.1)),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected
                          ? LuxuryColors.rolexGreen
                          : (isDark
                              ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                              : Colors.grey.withValues(alpha: 0.3)),
                      width: 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: Text(
                      _dayNames[index],
                      style: IrisTheme.labelSmall.copyWith(
                        color: isSelected
                            ? Colors.white
                            : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                        fontWeight: isSelected ? IrisTheme.weightSemiBold : IrisTheme.weightMedium,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildDaysModeChip({
    required String label,
    required QuietHoursDaysMode mode,
    required QuietHoursDaysMode currentMode,
    required bool isDark,
  }) {
    final isSelected = currentMode == mode;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        ref.read(notificationPreferencesProvider.notifier).setQuietHoursDaysMode(mode);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen
              : (isDark
                  ? LuxuryColors.obsidian.withValues(alpha: 0.5)
                  : Colors.grey.withValues(alpha: 0.08)),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? LuxuryColors.rolexGreen : LuxuryColors.rolexGreen.withValues(alpha: 0.3),
            width: 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: IrisTheme.labelMedium.copyWith(
            color: isSelected
                ? Colors.white
                : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
            fontWeight: isSelected ? IrisTheme.weightSemiBold : IrisTheme.weightMedium,
          ),
        ),
      ),
    );
  }

  // ============================================================================
  // SOUND & VIBRATION SECTION
  // ============================================================================

  Widget _buildSoundVibrationCard(NotificationPreferencesState prefs, bool isDark) {
    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          // Sound toggle
          _buildToggleItem(
            title: 'Sound',
            subtitle: 'Play sound for notifications',
            icon: Iconsax.volume_high,
            value: prefs.soundVibration.soundEnabled,
            onChanged: (value) {
              HapticFeedback.lightImpact();
              ref.read(notificationPreferencesProvider.notifier).toggleSound(value);
            },
            isDark: isDark,
          ),

          // Sound picker (only shown when sound is enabled)
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                _buildDivider(isDark),
                _buildSoundPicker(prefs, isDark),
              ],
            ),
            crossFadeState:
                prefs.soundVibration.soundEnabled ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 300),
          ),

          _buildDivider(isDark),

          // Vibration toggle
          _buildToggleItem(
            title: 'Vibration',
            subtitle: 'Vibrate when notifications arrive',
            icon: Iconsax.mobile,
            value: prefs.soundVibration.vibrationEnabled,
            onChanged: (value) {
              HapticFeedback.lightImpact();
              ref.read(notificationPreferencesProvider.notifier).toggleVibration(value);
            },
            isDark: isDark,
            showDivider: false,
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms, delay: 250.ms).slideY(begin: 0.1);
  }

  Widget _buildSoundPicker(NotificationPreferencesState prefs, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Iconsax.music,
                  size: 18,
                  color: LuxuryColors.rolexGreen,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Notification Sound',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontWeight: IrisTheme.weightMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Sound dropdown with preview
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.obsidian.withValues(alpha: 0.5)
                  : Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: prefs.soundVibration.selectedSound,
                isExpanded: true,
                icon: Icon(
                  Iconsax.arrow_down_1,
                  color: LuxuryColors.rolexGreen,
                  size: 20,
                ),
                dropdownColor: isDark ? LuxuryColors.obsidian : Colors.white,
                borderRadius: BorderRadius.circular(12),
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
                items: _soundOptions.map((option) {
                  return DropdownMenuItem<String>(
                    value: option.id,
                    child: Row(
                      children: [
                        Text(
                          option.name,
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const Spacer(),
                        if (prefs.soundVibration.selectedSound == option.id)
                          Icon(
                            Iconsax.tick_circle5,
                            color: LuxuryColors.rolexGreen,
                            size: 18,
                          ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    HapticFeedback.lightImpact();
                    ref.read(notificationPreferencesProvider.notifier).setSelectedSound(value);
                    _playPreviewSound(value);
                  }
                },
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Preview button
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              _playPreviewSound(prefs.soundVibration.selectedSound);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Iconsax.play,
                    size: 16,
                    color: LuxuryColors.rolexGreen,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Preview Sound',
                    style: IrisTheme.labelMedium.copyWith(
                      color: LuxuryColors.rolexGreen,
                      fontWeight: IrisTheme.weightMedium,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================================
  // SHARED WIDGETS
  // ============================================================================

  Widget _buildMasterToggle({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isDark,
    bool isMaster = false,
  }) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: isMaster && value ? LuxuryColors.emeraldGradient : null,
              color: isMaster && value ? null : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              boxShadow: isMaster && value
                  ? [
                      BoxShadow(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Icon(
              icon,
              size: 22,
              color: isMaster && value ? Colors.white : LuxuryColors.rolexGreen,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: isMaster ? IrisTheme.weightSemiBold : IrisTheme.weightMedium,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          _buildLuxurySwitch(value, onChanged, isDark, isPrimary: isMaster),
        ],
      ),
    );
  }

  Widget _buildToggleItem({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool>? onChanged,
    required bool isDark,
    bool showDivider = true,
  }) {
    final isDisabled = onChanged == null;

    return Opacity(
      opacity: isDisabled ? 0.5 : 1.0,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 20,
                color: LuxuryColors.rolexGreen.withValues(alpha: isDisabled ? 0.5 : 1.0),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      fontWeight: IrisTheme.weightMedium,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            _buildLuxurySwitch(value, onChanged, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildLuxurySwitch(bool value, ValueChanged<bool>? onChanged, bool isDark, {bool isPrimary = false}) {
    return GestureDetector(
      onTap: onChanged != null
          ? () {
              onChanged(!value);
            }
          : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        width: isPrimary ? 56 : 52,
        height: isPrimary ? 34 : 32,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          gradient: value && isPrimary ? LuxuryColors.emeraldGradient : null,
          color: value && !isPrimary
              ? LuxuryColors.rolexGreen
              : (!value ? (isDark ? Colors.grey.shade800 : Colors.grey.shade300) : null),
          borderRadius: BorderRadius.circular(isPrimary ? 17 : 16),
          boxShadow: value
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                    blurRadius: isPrimary ? 12 : 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOutCubic,
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: isPrimary ? 28 : 26,
            height: isPrimary ? 28 : 26,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: value && isPrimary
                ? Icon(
                    Iconsax.tick_circle5,
                    size: 14,
                    color: LuxuryColors.rolexGreen,
                  )
                : null,
          ),
        ),
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Divider(
      height: 1,
      thickness: 1,
      indent: 70,
      color: isDark
          ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
          : LuxuryColors.rolexGreen.withValues(alpha: 0.08),
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  String _formatTimeOfDay(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  Future<void> _selectTime(BuildContext context, TimeOfDay initialTime, bool isStartTime) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: initialTime,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: isDark
                ? const ColorScheme.dark(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: LuxuryColors.obsidian,
                    onSurface: Colors.white,
                  )
                : const ColorScheme.light(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: Colors.white,
                    onSurface: Colors.black,
                  ),
            timePickerTheme: TimePickerThemeData(
              backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
              hourMinuteShape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              dayPeriodShape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      if (isStartTime) {
        ref.read(notificationPreferencesProvider.notifier).setQuietHoursStartTime(picked);
      } else {
        ref.read(notificationPreferencesProvider.notifier).setQuietHoursEndTime(picked);
      }
    }
  }

  void _playPreviewSound(String soundId) {
    // Play haptic feedback as audio preview placeholder
    if (soundId != 'none') {
      HapticFeedback.mediumImpact();

      // Show snackbar indicating sound preview
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                Iconsax.volume_high,
                color: Colors.white,
                size: 18,
              ),
              const SizedBox(width: 12),
              Text(
                'Playing "${_soundOptions.firstWhere((o) => o.id == soundId).name}" preview',
                style: IrisTheme.bodyMedium.copyWith(color: Colors.white),
              ),
            ],
          ),
          backgroundColor: LuxuryColors.rolexGreen,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }
}
