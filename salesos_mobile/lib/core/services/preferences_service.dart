import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';

/// Font size options
enum FontSize {
  compact,
  comfortable,
  large,
}

extension FontSizeExtension on FontSize {
  String get displayName {
    switch (this) {
      case FontSize.compact:
        return 'Compact';
      case FontSize.comfortable:
        return 'Comfortable';
      case FontSize.large:
        return 'Large';
    }
  }

  double get scaleFactor {
    switch (this) {
      case FontSize.compact:
        return 0.9;
      case FontSize.comfortable:
        return 1.0;
      case FontSize.large:
        return 1.15;
    }
  }
}

/// Language options
enum AppLanguage {
  english,
  spanish,
  french,
  german,
  japanese,
}

extension AppLanguageExtension on AppLanguage {
  String get displayName {
    switch (this) {
      case AppLanguage.english:
        return 'English';
      case AppLanguage.spanish:
        return 'Español';
      case AppLanguage.french:
        return 'Français';
      case AppLanguage.german:
        return 'Deutsch';
      case AppLanguage.japanese:
        return '日本語';
    }
  }

  String get code {
    switch (this) {
      case AppLanguage.english:
        return 'en';
      case AppLanguage.spanish:
        return 'es';
      case AppLanguage.french:
        return 'fr';
      case AppLanguage.german:
        return 'de';
      case AppLanguage.japanese:
        return 'ja';
    }
  }
}

/// Timezone options
enum AppTimezone {
  pst,
  mst,
  cst,
  est,
  utc,
}

extension AppTimezoneExtension on AppTimezone {
  String get displayName {
    switch (this) {
      case AppTimezone.pst:
        return 'Pacific (PST)';
      case AppTimezone.mst:
        return 'Mountain (MST)';
      case AppTimezone.cst:
        return 'Central (CST)';
      case AppTimezone.est:
        return 'Eastern (EST)';
      case AppTimezone.utc:
        return 'UTC';
    }
  }

  String get offset {
    switch (this) {
      case AppTimezone.pst:
        return '-08:00';
      case AppTimezone.mst:
        return '-07:00';
      case AppTimezone.cst:
        return '-06:00';
      case AppTimezone.est:
        return '-05:00';
      case AppTimezone.utc:
        return '+00:00';
    }
  }
}

/// Response format options for AI responses
enum AIResponseFormat {
  auto,
  text,
  json,
  markdown,
}

extension AIResponseFormatExtension on AIResponseFormat {
  String get displayName {
    switch (this) {
      case AIResponseFormat.auto:
        return 'Auto';
      case AIResponseFormat.text:
        return 'Plain Text';
      case AIResponseFormat.json:
        return 'JSON';
      case AIResponseFormat.markdown:
        return 'Markdown';
    }
  }

  String get description {
    switch (this) {
      case AIResponseFormat.auto:
        return 'Let AI choose the best format';
      case AIResponseFormat.text:
        return 'Simple text responses';
      case AIResponseFormat.json:
        return 'Structured JSON data';
      case AIResponseFormat.markdown:
        return 'Rich formatted text';
    }
  }
}

/// AI Model configuration
class AIModelConfig {
  final String model;
  final double temperature;
  final int maxTokens;
  final String systemPrompt;
  final AIResponseFormat responseFormat;

  const AIModelConfig({
    this.model = 'claude-3-sonnet',
    this.temperature = 0.7,
    this.maxTokens = 4096,
    this.systemPrompt = '',
    this.responseFormat = AIResponseFormat.auto,
  });

  AIModelConfig copyWith({
    String? model,
    double? temperature,
    int? maxTokens,
    String? systemPrompt,
    AIResponseFormat? responseFormat,
  }) {
    return AIModelConfig(
      model: model ?? this.model,
      temperature: temperature ?? this.temperature,
      maxTokens: maxTokens ?? this.maxTokens,
      systemPrompt: systemPrompt ?? this.systemPrompt,
      responseFormat: responseFormat ?? this.responseFormat,
    );
  }

  Map<String, dynamic> toJson() => {
        'model': model,
        'temperature': temperature,
        'maxTokens': maxTokens,
        'systemPrompt': systemPrompt,
        'responseFormat': responseFormat.name,
      };

  factory AIModelConfig.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AIModelConfig();
    return AIModelConfig(
      model: json['model'] as String? ?? 'claude-3-sonnet',
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.7,
      maxTokens: json['maxTokens'] as int? ?? 4096,
      systemPrompt: json['systemPrompt'] as String? ?? '',
      responseFormat: AIResponseFormat.values.firstWhere(
        (e) => e.name == json['responseFormat'],
        orElse: () => AIResponseFormat.auto,
      ),
    );
  }
}

/// User preferences model
class UserPreferences {
  final bool darkMode;
  final FontSize fontSize;
  final AppLanguage language;
  final AppTimezone timezone;
  final bool chatHistoryTraining;
  final bool contextRetention;
  final bool usageAnalytics;
  final bool pushNotifications;
  final bool emailNotifications;
  final AIModelConfig modelConfig;

  const UserPreferences({
    this.darkMode = true,
    this.fontSize = FontSize.comfortable,
    this.language = AppLanguage.english,
    this.timezone = AppTimezone.pst,
    this.chatHistoryTraining = false,
    this.contextRetention = true,
    this.usageAnalytics = false,
    this.pushNotifications = true,
    this.emailNotifications = true,
    this.modelConfig = const AIModelConfig(),
  });

  UserPreferences copyWith({
    bool? darkMode,
    FontSize? fontSize,
    AppLanguage? language,
    AppTimezone? timezone,
    bool? chatHistoryTraining,
    bool? contextRetention,
    bool? usageAnalytics,
    bool? pushNotifications,
    bool? emailNotifications,
    AIModelConfig? modelConfig,
  }) {
    return UserPreferences(
      darkMode: darkMode ?? this.darkMode,
      fontSize: fontSize ?? this.fontSize,
      language: language ?? this.language,
      timezone: timezone ?? this.timezone,
      chatHistoryTraining: chatHistoryTraining ?? this.chatHistoryTraining,
      contextRetention: contextRetention ?? this.contextRetention,
      usageAnalytics: usageAnalytics ?? this.usageAnalytics,
      pushNotifications: pushNotifications ?? this.pushNotifications,
      emailNotifications: emailNotifications ?? this.emailNotifications,
      modelConfig: modelConfig ?? this.modelConfig,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'darkMode': darkMode,
      'fontSize': fontSize.name,
      'language': language.code,
      'timezone': timezone.name,
      'chatHistoryTraining': chatHistoryTraining,
      'contextRetention': contextRetention,
      'usageAnalytics': usageAnalytics,
      'pushNotifications': pushNotifications,
      'emailNotifications': emailNotifications,
      'modelConfig': modelConfig.toJson(),
    };
  }
}

/// Preferences service provider
final preferencesServiceProvider = Provider<PreferencesService>((ref) {
  return PreferencesService(ref.watch(apiClientProvider));
});

/// User preferences state provider
final userPreferencesProvider =
    NotifierProvider<UserPreferencesNotifier, UserPreferences>(UserPreferencesNotifier.new);

/// Preferences service for managing user settings
class PreferencesService {
  final ApiClient _apiClient;

  static const String _darkModeKey = 'iris_dark_mode';
  static const String _fontSizeKey = 'iris_font_size';
  static const String _languageKey = 'iris_language';
  static const String _timezoneKey = 'iris_timezone';
  static const String _chatTrainingKey = 'iris_chat_training';
  static const String _contextRetentionKey = 'iris_context_retention';
  static const String _usageAnalyticsKey = 'iris_usage_analytics';
  static const String _pushNotificationsKey = 'iris_push_notifications';
  static const String _emailNotificationsKey = 'iris_email_notifications';
  static const String _aiModelKey = 'iris_ai_model';
  static const String _aiTemperatureKey = 'iris_ai_temperature';
  static const String _aiMaxTokensKey = 'iris_ai_max_tokens';
  static const String _aiSystemPromptKey = 'iris_ai_system_prompt';

  PreferencesService(this._apiClient);

  /// Load preferences from local storage
  Future<UserPreferences> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();

    return UserPreferences(
      darkMode: prefs.getBool(_darkModeKey) ?? true,
      fontSize: FontSize.values.firstWhere(
        (f) => f.name == prefs.getString(_fontSizeKey),
        orElse: () => FontSize.comfortable,
      ),
      language: AppLanguage.values.firstWhere(
        (l) => l.code == prefs.getString(_languageKey),
        orElse: () => AppLanguage.english,
      ),
      timezone: AppTimezone.values.firstWhere(
        (t) => t.name == prefs.getString(_timezoneKey),
        orElse: () => AppTimezone.pst,
      ),
      chatHistoryTraining: prefs.getBool(_chatTrainingKey) ?? false,
      contextRetention: prefs.getBool(_contextRetentionKey) ?? true,
      usageAnalytics: prefs.getBool(_usageAnalyticsKey) ?? false,
      pushNotifications: prefs.getBool(_pushNotificationsKey) ?? true,
      emailNotifications: prefs.getBool(_emailNotificationsKey) ?? true,
      modelConfig: AIModelConfig(
        model: prefs.getString(_aiModelKey) ?? 'claude-3-sonnet',
        temperature: prefs.getDouble(_aiTemperatureKey) ?? 0.7,
        maxTokens: prefs.getInt(_aiMaxTokensKey) ?? 4096,
        systemPrompt: prefs.getString(_aiSystemPromptKey) ?? '',
      ),
    );
  }

  /// Save preferences to local storage and sync to backend
  Future<void> savePreferences(UserPreferences preferences) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setBool(_darkModeKey, preferences.darkMode);
    await prefs.setString(_fontSizeKey, preferences.fontSize.name);
    await prefs.setString(_languageKey, preferences.language.code);
    await prefs.setString(_timezoneKey, preferences.timezone.name);
    await prefs.setBool(_chatTrainingKey, preferences.chatHistoryTraining);
    await prefs.setBool(_contextRetentionKey, preferences.contextRetention);
    await prefs.setBool(_usageAnalyticsKey, preferences.usageAnalytics);
    await prefs.setBool(_pushNotificationsKey, preferences.pushNotifications);
    await prefs.setBool(_emailNotificationsKey, preferences.emailNotifications);
    await prefs.setString(_aiModelKey, preferences.modelConfig.model);
    await prefs.setDouble(_aiTemperatureKey, preferences.modelConfig.temperature);
    await prefs.setInt(_aiMaxTokensKey, preferences.modelConfig.maxTokens);
    await prefs.setString(_aiSystemPromptKey, preferences.modelConfig.systemPrompt);

    // Sync to backend
    try {
      await _apiClient.patch(
        '/users/me/preferences',
        data: preferences.toJson(),
      );
    } catch (e) {
      // Ignore sync errors, local storage is primary
    }
  }
}

/// User preferences notifier
class UserPreferencesNotifier extends Notifier<UserPreferences> {
  late final PreferencesService _service;

  @override
  UserPreferences build() {
    _service = ref.watch(preferencesServiceProvider);
    _loadPreferences();
    return const UserPreferences();
  }

  Future<void> _loadPreferences() async {
    state = await _service.loadPreferences();
  }

  Future<void> setDarkMode(bool value) async {
    state = state.copyWith(darkMode: value);
    await _service.savePreferences(state);
  }

  Future<void> setFontSize(FontSize value) async {
    state = state.copyWith(fontSize: value);
    await _service.savePreferences(state);
  }

  Future<void> setLanguage(AppLanguage value) async {
    state = state.copyWith(language: value);
    await _service.savePreferences(state);
  }

  Future<void> setTimezone(AppTimezone value) async {
    state = state.copyWith(timezone: value);
    await _service.savePreferences(state);
  }

  Future<void> setChatHistoryTraining(bool value) async {
    state = state.copyWith(chatHistoryTraining: value);
    await _service.savePreferences(state);
  }

  Future<void> setContextRetention(bool value) async {
    state = state.copyWith(contextRetention: value);
    await _service.savePreferences(state);
  }

  Future<void> setUsageAnalytics(bool value) async {
    state = state.copyWith(usageAnalytics: value);
    await _service.savePreferences(state);
  }

  Future<void> setPushNotifications(bool value) async {
    state = state.copyWith(pushNotifications: value);
    await _service.savePreferences(state);
  }

  Future<void> setEmailNotifications(bool value) async {
    state = state.copyWith(emailNotifications: value);
    await _service.savePreferences(state);
  }

  Future<void> setAIModel(String model) async {
    state = state.copyWith(
      modelConfig: state.modelConfig.copyWith(model: model),
    );
    await _service.savePreferences(state);
  }

  Future<void> setAITemperature(double temperature) async {
    state = state.copyWith(
      modelConfig: state.modelConfig.copyWith(temperature: temperature),
    );
    await _service.savePreferences(state);
  }

  Future<void> setAIMaxTokens(int maxTokens) async {
    state = state.copyWith(
      modelConfig: state.modelConfig.copyWith(maxTokens: maxTokens),
    );
    await _service.savePreferences(state);
  }

  Future<void> setAISystemPrompt(String systemPrompt) async {
    state = state.copyWith(
      modelConfig: state.modelConfig.copyWith(systemPrompt: systemPrompt),
    );
    await _service.savePreferences(state);
  }

  Future<void> setAIResponseFormat(AIResponseFormat format) async {
    state = state.copyWith(
      modelConfig: state.modelConfig.copyWith(responseFormat: format),
    );
    await _service.savePreferences(state);
  }

  Future<void> updateAIConfig(AIModelConfig config) async {
    state = state.copyWith(modelConfig: config);
    await _service.savePreferences(state);
  }
}
