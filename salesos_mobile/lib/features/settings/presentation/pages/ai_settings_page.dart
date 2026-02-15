import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/services/preferences_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_button.dart';

/// AI Model options
enum AIModel {
  claudeOpus,
  claudeSonnet,
  claudeHaiku,
  gpt4Turbo,
  gpt35Turbo,
}

extension AIModelExtension on AIModel {
  String get displayName {
    switch (this) {
      case AIModel.claudeOpus:
        return 'Claude 3 Opus';
      case AIModel.claudeSonnet:
        return 'Claude 3 Sonnet';
      case AIModel.claudeHaiku:
        return 'Claude 3 Haiku';
      case AIModel.gpt4Turbo:
        return 'GPT-4 Turbo';
      case AIModel.gpt35Turbo:
        return 'GPT-3.5 Turbo';
    }
  }

  String get description {
    switch (this) {
      case AIModel.claudeOpus:
        return 'Most capable model for complex tasks';
      case AIModel.claudeSonnet:
        return 'Balanced performance and speed';
      case AIModel.claudeHaiku:
        return 'Fast and efficient for simple tasks';
      case AIModel.gpt4Turbo:
        return 'OpenAI\'s most advanced model';
      case AIModel.gpt35Turbo:
        return 'Fast and cost-effective';
    }
  }

  String get provider {
    switch (this) {
      case AIModel.claudeOpus:
      case AIModel.claudeSonnet:
      case AIModel.claudeHaiku:
        return 'Anthropic';
      case AIModel.gpt4Turbo:
      case AIModel.gpt35Turbo:
        return 'OpenAI';
    }
  }

  String get modelId {
    switch (this) {
      case AIModel.claudeOpus:
        return 'claude-3-opus';
      case AIModel.claudeSonnet:
        return 'claude-3-sonnet';
      case AIModel.claudeHaiku:
        return 'claude-3-haiku';
      case AIModel.gpt4Turbo:
        return 'gpt-4-turbo';
      case AIModel.gpt35Turbo:
        return 'gpt-3.5-turbo';
    }
  }

  static AIModel fromModelId(String modelId) {
    switch (modelId) {
      case 'claude-3-opus':
        return AIModel.claudeOpus;
      case 'claude-3-sonnet':
        return AIModel.claudeSonnet;
      case 'claude-3-haiku':
        return AIModel.claudeHaiku;
      case 'gpt-4-turbo':
        return AIModel.gpt4Turbo;
      case 'gpt-3.5-turbo':
        return AIModel.gpt35Turbo;
      default:
        return AIModel.claudeSonnet;
    }
  }
}

class AISettingsPage extends ConsumerStatefulWidget {
  const AISettingsPage({super.key});

  @override
  ConsumerState<AISettingsPage> createState() => _AISettingsPageState();
}

class _AISettingsPageState extends ConsumerState<AISettingsPage> {
  final _systemPromptController = TextEditingController();
  bool _hasChanges = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final config = ref.read(userPreferencesProvider).modelConfig;
      _systemPromptController.text = config.systemPrompt;
    });
    _systemPromptController.addListener(() {
      if (!_hasChanges) setState(() => _hasChanges = true);
    });
  }

  @override
  void dispose() {
    _systemPromptController.dispose();
    super.dispose();
  }

  String _getTemperatureLabel(double value) {
    if (value < 0.3) return 'Precise';
    if (value < 0.7) return 'Balanced';
    return 'Creative';
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    HapticFeedback.lightImpact();

    try {
      await ref.read(userPreferencesProvider.notifier).setAISystemPrompt(
            _systemPromptController.text,
          );

      if (mounted) {
        setState(() {
          _isSaving = false;
          _hasChanges = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('AI settings saved and synced'),
            backgroundColor: IrisTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: ${e.toString()}'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final preferences = ref.watch(userPreferencesProvider);
    final prefsNotifier = ref.read(userPreferencesProvider.notifier);
    final config = preferences.modelConfig;
    final currentModel = AIModelExtension.fromModelId(config.model);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'AI Settings',
          style: IrisTheme.titleLarge.copyWith(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
        ),
        actions: [
          if (_hasChanges)
            TextButton(
              onPressed: _isSaving ? null : _saveSettings,
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                      ),
                    )
                  : Text(
                      'Save',
                      style: IrisTheme.labelLarge.copyWith(
                        color: LuxuryColors.jadePremium,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Model Selection Section
              Text(
                'AI Model',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                child: Column(
                  children: AIModel.values.map((model) {
                    final isSelected = currentModel == model;
                    return _buildModelOption(
                      model: model,
                      isSelected: isSelected,
                      isDark: isDark,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        prefsNotifier.setAIModel(model.modelId);
                        setState(() => _hasChanges = true);
                      },
                    );
                  }).toList(),
                ),
              ).animate().fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Temperature Control Section
              Text(
                'Temperature',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Response Style',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _getTemperatureLabel(config.temperature),
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.jadePremium,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Icon(Iconsax.cpu, size: 18, color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                        const SizedBox(width: 8),
                        Text(
                          'Precise',
                          style: IrisTheme.labelSmall.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                        Expanded(
                          child: Slider(
                            value: config.temperature,
                            min: 0.0,
                            max: 1.0,
                            divisions: 10,
                            activeColor: LuxuryColors.rolexGreen,
                            inactiveColor: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                            onChanged: (value) {
                              prefsNotifier.setAITemperature(value);
                              setState(() => _hasChanges = true);
                            },
                          ),
                        ),
                        Text(
                          'Creative',
                          style: IrisTheme.labelSmall.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(Iconsax.magic_star, size: 18, color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Lower values produce more focused, deterministic responses. Higher values increase creativity and variation.',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // System Prompt Section
              Text(
                'System Instructions',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Custom System Prompt',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Define how SalesOS should behave. This prompt is prepended to every conversation.',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
                      ),
                      child: TextField(
                        controller: _systemPromptController,
                        maxLines: 6,
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        decoration: InputDecoration(
                          hintText: 'e.g., You are a helpful sales assistant focused on B2B enterprise deals...',
                          hintStyle: IrisTheme.bodySmall.copyWith(
                            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.all(14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: IrisButton(
                            label: 'Reset to Default',
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              _systemPromptController.clear();
                              prefsNotifier.setAISystemPrompt('');
                            },
                            variant: IrisButtonVariant.outline,
                            size: IrisButtonSize.small,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Advanced Settings
              Text(
                'Advanced',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    _AdvancedTile(
                      icon: Iconsax.document_text,
                      title: 'Max Tokens',
                      value: '${config.maxTokens}',
                      onTap: () => _showMaxTokensDialog(config, prefsNotifier),
                    ),
                    _AdvancedTile(
                      icon: Iconsax.setting_2,
                      title: 'Response Format',
                      value: config.responseFormat.displayName,
                      onTap: () => _showResponseFormatDialog(config, prefsNotifier),
                      showDivider: false,
                    ),
                  ],
                ),
              ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModelOption({
    required AIModel model,
    required bool isSelected,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isSelected ? LuxuryColors.rolexGreen.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? LuxuryColors.rolexGreen : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected ? LuxuryColors.rolexGreen : (isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Iconsax.cpu,
                size: 20,
                color: isSelected ? Colors.white : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        model.displayName,
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isSelected ? LuxuryColors.jadePremium : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          model.provider,
                          style: IrisTheme.labelSmall.copyWith(
                            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    model.description,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Iconsax.tick_circle, color: LuxuryColors.jadePremium, size: 20),
          ],
        ),
      ),
    );
  }

  void _showMaxTokensDialog(AIModelConfig config, UserPreferencesNotifier notifier) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                width: MediaQuery.of(ctx).size.width * 0.9,
                constraints: const BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  color: isDark ? LuxuryColors.obsidian : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Max Response Tokens',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 20),
                      ...[1024, 2048, 4096, 8192].map((tokens) => _buildTokenOption(
                        tokens: tokens,
                        isSelected: config.maxTokens == tokens,
                        isDark: isDark,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          notifier.setAIMaxTokens(tokens);
                          setState(() => _hasChanges = true);
                          Navigator.pop(ctx);
                        },
                      )),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  void _showResponseFormatDialog(AIModelConfig config, UserPreferencesNotifier notifier) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                width: MediaQuery.of(ctx).size.width * 0.9,
                constraints: const BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  color: isDark ? LuxuryColors.obsidian : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Response Format',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Choose how AI responses should be formatted',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 20),
                      ...AIResponseFormat.values.map((format) => _buildResponseFormatOption(
                        format: format,
                        isSelected: config.responseFormat == format,
                        isDark: isDark,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          notifier.setAIResponseFormat(format);
                          setState(() => _hasChanges = true);
                          Navigator.pop(ctx);
                        },
                      )),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  Widget _buildResponseFormatOption({
    required AIResponseFormat format,
    required bool isSelected,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isSelected ? LuxuryColors.rolexGreen.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: isSelected ? Border.all(color: LuxuryColors.rolexGreen, width: 1) : null,
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    format.displayName,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isSelected ? LuxuryColors.jadePremium : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    format.description,
                    style: IrisTheme.labelSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Iconsax.tick_circle, color: LuxuryColors.jadePremium, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildTokenOption({
    required int tokens,
    required bool isSelected,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? LuxuryColors.rolexGreen.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: isSelected ? Border.all(color: LuxuryColors.rolexGreen, width: 1) : null,
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                '$tokens tokens',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isSelected ? LuxuryColors.jadePremium : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
            if (isSelected)
              const Icon(Iconsax.tick_circle, color: LuxuryColors.jadePremium, size: 20),
          ],
        ),
      ),
    );
  }
}

class _AdvancedTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;
  final bool showDivider;

  const _AdvancedTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, size: 20, color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),
                ),
                Text(
                  value,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Iconsax.arrow_right_3, size: 16, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(height: 1, indent: 48, color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
      ],
    );
  }
}
