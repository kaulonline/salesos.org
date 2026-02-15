import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../data/agents_service.dart';

/// Provider for available tools
final availableToolsProvider = FutureProvider<List<AvailableTool>>((ref) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getAvailableTools(includeExternalCrm: true);
});

class AgentBuilderPage extends ConsumerStatefulWidget {
  final CustomAgent? agent; // null for create, non-null for edit
  final Function(CustomAgent)? onSaved;

  const AgentBuilderPage({super.key, this.agent, this.onSaved});

  @override
  ConsumerState<AgentBuilderPage> createState() => _AgentBuilderPageState();
}

class _AgentBuilderPageState extends ConsumerState<AgentBuilderPage> {
  final _formKey = GlobalKey<FormState>();
  final _pageController = PageController();
  int _currentStep = 0;
  bool _isSaving = false;

  // AI Generation mode
  bool _showAIMode = true; // Start with AI mode for new agents
  bool _isGenerating = false;
  final _aiDescriptionController = TextEditingController();
  // ignore: unused_field
  GeneratedAgentConfig? _generatedConfig;

  // Form fields
  late TextEditingController _nameController;
  late TextEditingController _descriptionController;
  late TextEditingController _systemPromptController;
  String _category = 'custom';
  String _modelId = 'gpt-4o';
  double _temperature = 0.3;
  int _maxTokens = 4000;
  List<String> _enabledTools = [];
  bool _requiresApproval = true;

  bool get _isEditing => widget.agent != null;
  static const _totalSteps = 4;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.agent?.name ?? '');
    _descriptionController = TextEditingController(
      text: widget.agent?.description ?? '',
    );
    _systemPromptController = TextEditingController(
      text: widget.agent?.systemPrompt ?? '',
    );

    if (widget.agent != null) {
      _category = widget.agent!.category;
      _modelId = widget.agent!.modelId;
      _temperature = widget.agent!.temperature;
      _maxTokens = widget.agent!.maxTokens;
      _enabledTools = List.from(widget.agent!.enabledTools);
      _requiresApproval = widget.agent!.requiresApproval;
      _showAIMode = false; // Skip AI mode when editing
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _systemPromptController.dispose();
    _aiDescriptionController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  /// Generate agent configuration from AI
  Future<void> _generateFromAI() async {
    final description = _aiDescriptionController.text.trim();
    if (description.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Please describe your agent in more detail (at least 10 characters)',
          ),
        ),
      );
      return;
    }

    setState(() => _isGenerating = true);
    HapticFeedback.mediumImpact();

    try {
      final service = ref.read(agentsServiceProvider);
      final config = await service.generateAgentConfig(description);

      if (config != null && mounted) {
        setState(() {
          _generatedConfig = config;
          // Pre-fill form fields with generated config
          _nameController.text = config.name;
          _descriptionController.text = config.description;
          _systemPromptController.text = config.systemPrompt;
          _category = config.category;
          _modelId = config.modelId;
          _temperature = config.temperature;
          _maxTokens = config.maxTokens;
          _enabledTools = List.from(config.enabledTools);
          _requiresApproval = config.requiresApproval;
          _showAIMode = false; // Switch to manual mode with pre-filled data
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Agent "${config.name}" configuration generated! Review and customize below.',
            ),
            backgroundColor: IrisTheme.success,
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Failed to generate configuration. Please try again.',
            ),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Show AI generation mode for new agents
    if (_showAIMode && !_isEditing) {
      return _buildAIGenerationScreen(isDark);
    }

    return Scaffold(
      backgroundColor: isDark
          ? IrisTheme.darkBackground
          : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark
            ? IrisTheme.darkSurface
            : IrisTheme.lightSurface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.close,
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          _isEditing ? 'Edit Agent' : 'Create Agent',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
        actions: [
          if (_currentStep == _totalSteps - 1)
            TextButton(
              onPressed: _isSaving ? null : _handleSave,
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: LuxuryColors.jadePremium,
                      ),
                    )
                  : Text(
                      _isEditing ? 'Save' : 'Create',
                      style: IrisTheme.labelLarge.copyWith(
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Progress indicator
          _buildProgressIndicator(isDark),

          // Form content
          Expanded(
            child: Form(
              key: _formKey,
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (index) => setState(() => _currentStep = index),
                children: [
                  _buildBasicInfoStep(isDark),
                  _buildAIConfigStep(isDark),
                  _buildToolsStep(isDark),
                  _buildReviewStep(isDark),
                ],
              ),
            ),
          ),

          // Navigation buttons
          _buildNavigationButtons(isDark),
        ],
      ),
    );
  }

  /// AI Generation screen - describe your agent in natural language
  Widget _buildAIGenerationScreen(bool isDark) {
    return Scaffold(
      backgroundColor: isDark
          ? IrisTheme.darkBackground
          : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark
            ? IrisTheme.darkSurface
            : IrisTheme.lightSurface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.close,
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Create Agent',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with AI icon
            Center(
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      LuxuryColors.rolexGreen,
                      LuxuryColors.rolexGreen.withValues(alpha: 0.7),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Iconsax.magic_star,
                  size: 40,
                  color: Colors.black,
                ),
              ),
            ).animate().fadeIn().scale(begin: const Offset(0.8, 0.8)),
            const SizedBox(height: 24),

            // Title
            Center(
              child: Text(
                'Describe Your Agent',
                style: IrisTheme.headlineSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ).animate(delay: 100.ms).fadeIn(),
            const SizedBox(height: 8),

            Center(
              child: Text(
                'Tell us what you want your agent to do in plain English.\nOur AI will configure it for you.',
                textAlign: TextAlign.center,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
            ).animate(delay: 150.ms).fadeIn(),
            const SizedBox(height: 32),

            // Text input
            IrisCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: _aiDescriptionController,
                    maxLines: 5,
                    maxLength: 500,
                    enabled: !_isGenerating,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText:
                          'Example: "Create an agent that monitors my deals and alerts me when opportunities have been inactive for more than 7 days, suggesting next steps to re-engage..."',
                      hintStyle: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      border: InputBorder.none,
                    ),
                  ),
                ],
              ),
            ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),
            const SizedBox(height: 24),

            // Example prompts
            Text(
              'Try these examples:',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ).animate(delay: 250.ms).fadeIn(),
            const SizedBox(height: 12),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildExampleChip('Monitor stalled deals', isDark),
                _buildExampleChip('Find hot leads', isDark),
                _buildExampleChip('Track competitor mentions', isDark),
                _buildExampleChip('Pipeline health check', isDark),
              ],
            ).animate(delay: 300.ms).fadeIn(),
            const SizedBox(height: 32),

            // Generate button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isGenerating ? null : _generateFromAI,
                style: ElevatedButton.styleFrom(
                  backgroundColor: LuxuryColors.rolexGreen,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: _isGenerating
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Iconsax.magic_star),
                label: Text(
                  _isGenerating ? 'Generating...' : 'Generate Agent',
                  style: IrisTheme.labelLarge.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ).animate(delay: 350.ms).fadeIn().slideY(begin: 0.1),
            const SizedBox(height: 16),

            // Manual option
            Center(
              child: TextButton(
                onPressed: _isGenerating
                    ? null
                    : () => setState(() => _showAIMode = false),
                child: Text(
                  'Or build manually',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
            ).animate(delay: 400.ms).fadeIn(),
          ],
        ),
      ),
    );
  }

  Widget _buildExampleChip(String text, bool isDark) {
    return GestureDetector(
      onTap: _isGenerating
          ? null
          : () {
              _aiDescriptionController.text = text;
            },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark
              ? IrisTheme.darkSurfaceHigh
              : IrisTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
        ),
        child: Text(
          text,
          style: IrisTheme.labelSmall.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildProgressIndicator(bool isDark) {
    const steps = ['Basic Info', 'AI Config', 'Tools', 'Review'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        border: Border(
          bottom: BorderSide(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
        ),
      ),
      child: Row(
        children: List.generate(steps.length, (index) {
          final isActive = index == _currentStep;
          final isCompleted = index < _currentStep;

          return Expanded(
            child: Row(
              children: [
                if (index > 0)
                  Expanded(
                    child: Container(
                      height: 2,
                      color: isCompleted || isActive
                          ? LuxuryColors.rolexGreen
                          : (isDark
                                ? IrisTheme.darkBorder
                                : IrisTheme.lightBorder),
                    ),
                  ),
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isActive || isCompleted
                        ? LuxuryColors.rolexGreen
                        : (isDark
                              ? IrisTheme.darkSurfaceHigh
                              : IrisTheme.lightSurfaceElevated),
                    border: Border.all(
                      color: isActive || isCompleted
                          ? LuxuryColors.rolexGreen
                          : (isDark
                                ? IrisTheme.darkBorder
                                : IrisTheme.lightBorder),
                    ),
                  ),
                  child: Center(
                    child: isCompleted
                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                        : Text(
                            '${index + 1}',
                            style: IrisTheme.labelSmall.copyWith(
                              color: isActive
                                  ? Colors.white
                                  : (isDark
                                        ? IrisTheme.darkTextSecondary
                                        : IrisTheme.lightTextSecondary),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
                if (index < steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 2,
                      color: isCompleted
                          ? LuxuryColors.rolexGreen
                          : (isDark
                                ? IrisTheme.darkBorder
                                : IrisTheme.lightBorder),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    ).animate().fadeIn(duration: 200.ms);
  }

  Widget _buildBasicInfoStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Basic Information',
            style: IrisTheme.headlineSmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Give your agent a name and describe what it does',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 24),

          // Name field
          _buildTextField(
            controller: _nameController,
            label: 'Agent Name',
            hint: 'e.g., Deal Health Monitor',
            icon: Iconsax.cpu,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Name is required';
              if (value.length < 3) return 'Name must be at least 3 characters';
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Description field
          _buildTextField(
            controller: _descriptionController,
            label: 'Description',
            hint: 'Describe what this agent does...',
            icon: Iconsax.document_text,
            maxLines: 3,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Description is required';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Category selector
          Text(
            'Category',
            style: IrisTheme.labelMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _CategoryChip(
                label: 'Custom',
                icon: Iconsax.cpu,
                isSelected: _category == 'custom',
                onTap: () => setState(() => _category = 'custom'),
              ),
              _CategoryChip(
                label: 'Sales',
                icon: Iconsax.shield_tick,
                isSelected: _category == 'sales',
                onTap: () => setState(() => _category = 'sales'),
              ),
              _CategoryChip(
                label: 'Analytics',
                icon: Iconsax.chart,
                isSelected: _category == 'analytics',
                onTap: () => setState(() => _category = 'analytics'),
              ),
              _CategoryChip(
                label: 'Automation',
                icon: Iconsax.flash,
                isSelected: _category == 'automation',
                onTap: () => setState(() => _category = 'automation'),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.05);
  }

  Widget _buildAIConfigStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'AI Configuration',
            style: IrisTheme.headlineSmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Configure how your agent thinks and responds',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 24),

          // System prompt
          _buildTextField(
            controller: _systemPromptController,
            label: 'System Prompt',
            hint: 'You are a helpful sales assistant that...',
            icon: Iconsax.message_programming,
            maxLines: 6,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'System prompt is required';
              }
              if (value.length < 20) return 'Prompt should be more detailed';
              return null;
            },
          ),
          const SizedBox(height: 20),

          // Model selector
          Text(
            'Model',
            style: IrisTheme.labelMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          IrisCard(
            padding: EdgeInsets.zero,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _ModelOption(
                  name: 'GPT-4o',
                  description: 'Most capable (Recommended)',
                  value: 'gpt-4o',
                  isSelected: _modelId == 'gpt-4o',
                  onTap: () => setState(() => _modelId = 'gpt-4o'),
                ),
                _ModelOption(
                  name: 'GPT-4o Mini',
                  description: 'Fast and efficient',
                  value: 'gpt-4o-mini',
                  isSelected: _modelId == 'gpt-4o-mini',
                  onTap: () => setState(() => _modelId = 'gpt-4o-mini'),
                ),
                _ModelOption(
                  name: 'GPT-4 Turbo',
                  description: 'High capability',
                  value: 'gpt-4-turbo',
                  isSelected: _modelId == 'gpt-4-turbo',
                  onTap: () => setState(() => _modelId = 'gpt-4-turbo'),
                  isLast: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Temperature slider
          Row(
            children: [
              Text(
                'Temperature: ',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              Text(
                _temperature.toStringAsFixed(1),
                style: IrisTheme.labelMedium.copyWith(
                  color: LuxuryColors.jadePremium,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Slider(
            value: _temperature,
            min: 0,
            max: 1,
            divisions: 10,
            activeColor: LuxuryColors.rolexGreen,
            inactiveColor: isDark
                ? IrisTheme.darkBorder
                : IrisTheme.lightBorder,
            onChanged: (value) => setState(() => _temperature = value),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Precise',
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
              ),
              Text(
                'Creative',
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Requires approval toggle
          IrisCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  Iconsax.shield_tick,
                  size: 20,
                  color: LuxuryColors.jadePremium,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Require Approval',
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      Text(
                        'Actions need manual approval before execution',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _requiresApproval,
                  activeTrackColor: LuxuryColors.rolexGreen,
                  onChanged: (value) =>
                      setState(() => _requiresApproval = value),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.05);
  }

  Widget _buildToolsStep(bool isDark) {
    final toolsAsync = ref.watch(availableToolsProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Enable Tools',
            style: IrisTheme.headlineSmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Select the CRM tools your agent can use',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 16),

          // Selected count
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '${_enabledTools.length} tools selected',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.jadePremium,
              ),
            ),
          ),
          const SizedBox(height: 16),

          toolsAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(
                  color: LuxuryColors.jadePremium,
                ),
              ),
            ),
            error: (e, _) => Center(
              child: Text('Failed to load tools', style: IrisTheme.bodyMedium),
            ),
            data: (tools) {
              // Group tools by category
              final grouped = <String, List<AvailableTool>>{};
              for (final tool in tools) {
                grouped.putIfAbsent(tool.category, () => []).add(tool);
              }

              return Column(
                children: grouped.entries.map((entry) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.key.toUpperCase(),
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...entry.value.map(
                        (tool) => _ToolCheckbox(
                          tool: tool,
                          isSelected: _enabledTools.contains(tool.name),
                          onChanged: (selected) {
                            setState(() {
                              if (selected) {
                                _enabledTools.add(tool.name);
                              } else {
                                _enabledTools.remove(tool.name);
                              }
                            });
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.05);
  }

  Widget _buildReviewStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Review & ${_isEditing ? 'Save' : 'Create'}',
            style: IrisTheme.headlineSmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Review your agent configuration before ${_isEditing ? 'saving' : 'creating'}',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 24),

          IrisCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Iconsax.cpu,
                      size: 20,
                      color: LuxuryColors.jadePremium,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Agent Details',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                _ReviewRow(label: 'Name', value: _nameController.text),
                _ReviewRow(label: 'Category', value: _category),
                _ReviewRow(label: 'Model', value: _modelId),
                _ReviewRow(
                  label: 'Temperature',
                  value: _temperature.toStringAsFixed(1),
                ),
                _ReviewRow(
                  label: 'Tools',
                  value: '${_enabledTools.length} enabled',
                ),
                _ReviewRow(
                  label: 'Approval',
                  value: _requiresApproval ? 'Required' : 'Auto',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          IrisCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Iconsax.document_text,
                      size: 20,
                      color: LuxuryColors.jadePremium,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Description',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  _descriptionController.text.isNotEmpty
                      ? _descriptionController.text
                      : 'No description',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          IrisCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Iconsax.message_programming,
                      size: 20,
                      color: LuxuryColors.jadePremium,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'System Prompt',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? IrisTheme.darkBackground
                        : IrisTheme.lightBackground,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _systemPromptController.text.isNotEmpty
                        ? (_systemPromptController.text.length > 200
                              ? '${_systemPromptController.text.substring(0, 200)}...'
                              : _systemPromptController.text)
                        : 'No prompt',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.05);
  }

  Widget _buildNavigationButtons(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        border: Border(
          top: BorderSide(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
        ),
      ),
      child: Row(
        children: [
          if (_currentStep > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: _previousStep,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: BorderSide(
                    color: isDark
                        ? IrisTheme.darkBorder
                        : IrisTheme.lightBorder,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  'Back',
                  style: IrisTheme.labelLarge.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
            ),
          if (_currentStep > 0) const SizedBox(width: 12),
          Expanded(
            flex: _currentStep == 0 ? 1 : 1,
            child: ElevatedButton(
              onPressed: _currentStep < _totalSteps - 1
                  ? _nextStep
                  : (_isSaving ? null : _handleSave),
              style: ElevatedButton.styleFrom(
                backgroundColor: LuxuryColors.rolexGreen,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: _currentStep < _totalSteps - 1
                  ? const Text('Continue')
                  : (_isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(_isEditing ? 'Save Agent' : 'Create Agent')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: IrisTheme.labelMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          validator: validator,
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
            prefixIcon: Icon(icon, size: 20, color: LuxuryColors.jadePremium),
            filled: true,
            fillColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: LuxuryColors.rolexGreen,
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: IrisTheme.error),
            ),
          ),
        ),
      ],
    );
  }

  void _nextStep() {
    if (_currentStep == 0) {
      // Validate basic info
      if (_nameController.text.isEmpty || _descriptionController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please fill in all required fields')),
        );
        return;
      }
    } else if (_currentStep == 1) {
      // Validate AI config
      if (_systemPromptController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('System prompt is required')),
        );
        return;
      }
    }

    _pageController.nextPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _previousStep() {
    _pageController.previousPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _handleSave() async {
    HapticFeedback.mediumImpact();
    setState(() => _isSaving = true);

    try {
      final service = ref.read(agentsServiceProvider);
      final data = {
        'name': _nameController.text,
        'description': _descriptionController.text,
        'category': _category,
        'systemPrompt': _systemPromptController.text,
        'modelId': _modelId,
        'temperature': _temperature,
        'maxTokens': _maxTokens,
        'enabledTools': _enabledTools,
        'requiresApproval': _requiresApproval,
        'triggerConfig': {'manual': true},
      };

      CustomAgent? result;
      if (_isEditing) {
        result = await service.updateAgent(widget.agent!.id, data);
      } else {
        result = await service.createAgent(data);
      }

      if (mounted) {
        if (result != null) {
          widget.onSaved?.call(result);
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_isEditing ? 'Agent updated' : 'Agent created'),
              backgroundColor: IrisTheme.success,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Failed to ${_isEditing ? 'update' : 'create'} agent',
              ),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? LuxuryColors.rolexGreen : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? LuxuryColors.rolexGreen
                : (Theme.of(context).brightness == Brightness.dark
                      ? IrisTheme.darkBorder
                      : IrisTheme.lightBorder),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : LuxuryColors.jadePremium,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: IrisTheme.labelMedium.copyWith(
                color: isSelected
                    ? Colors.black
                    : (Theme.of(context).brightness == Brightness.dark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModelOption extends StatelessWidget {
  final String name;
  final String description;
  final String value;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isLast;

  const _ModelOption({
    required this.name,
    required this.description,
    required this.value,
    required this.isSelected,
    required this.onTap,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
              : Colors.transparent,
          border: isLast
              ? null
              : Border(
                  bottom: BorderSide(
                    color: isDark
                        ? IrisTheme.darkBorder
                        : IrisTheme.lightBorder,
                  ),
                ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Iconsax.tick_circle5 : Iconsax.tick_circle,
              size: 20,
              color: isSelected
                  ? LuxuryColors.rolexGreen
                  : (isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  Text(
                    description,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ToolCheckbox extends StatelessWidget {
  final AvailableTool tool;
  final bool isSelected;
  final Function(bool) onChanged;

  const _ToolCheckbox({
    required this.tool,
    required this.isSelected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      onTap: () => onChanged(!isSelected),
      child: Row(
        children: [
          Icon(
            isSelected ? Iconsax.tick_square5 : Iconsax.tick_square,
            size: 20,
            color: isSelected
                ? LuxuryColors.rolexGreen
                : (isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tool.name,
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                if (tool.description.isNotEmpty)
                  Text(
                    tool.description,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  final String label;
  final String value;

  const _ReviewRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          Text(
            value,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
