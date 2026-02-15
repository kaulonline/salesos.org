import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/import_service.dart';
import '../widgets/import_progress.dart';

class ImportPage extends ConsumerStatefulWidget {
  const ImportPage({super.key});

  @override
  ConsumerState<ImportPage> createState() => _ImportPageState();
}

class _ImportPageState extends ConsumerState<ImportPage> {
  int _currentStep = 0;
  String? _selectedEntityType;
  String? _selectedFilePath;
  ImportJobModel? _activeJob;

  static const _entityTypes = [
    {'label': 'Leads', 'value': 'LEAD', 'icon': Iconsax.profile_2user},
    {'label': 'Contacts', 'value': 'CONTACT', 'icon': Iconsax.user},
    {'label': 'Deals', 'value': 'DEAL', 'icon': Iconsax.dollar_circle},
    {'label': 'Accounts', 'value': 'ACCOUNT', 'icon': Iconsax.building},
  ];

  void _selectEntityType(String type) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedEntityType = type;
      _currentStep = 1;
    });
  }

  void _selectFile() {
    // In a real app, this would use file_picker
    HapticFeedback.lightImpact();
    setState(() {
      _selectedFilePath = 'import_data.csv';
      _currentStep = 2;
    });
  }

  void _confirmMapping() {
    HapticFeedback.lightImpact();
    setState(() => _currentStep = 3);
  }

  Future<void> _startImport() async {
    if (_selectedEntityType == null || _selectedFilePath == null) return;

    HapticFeedback.mediumImpact();
    setState(() => _currentStep = 4);

    final service = ref.read(importServiceProvider);
    final job = await service.startImport(
      filePath: _selectedFilePath!,
      entityType: _selectedEntityType!,
    );

    if (job != null && mounted) {
      setState(() => _activeJob = job);
      ref.invalidate(importHistoryProvider);
    }
  }

  void _reset() {
    setState(() {
      _currentStep = 0;
      _selectedEntityType = null;
      _selectedFilePath = null;
      _activeJob = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(importHistoryProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Data Import',
        showBackButton: true,
        tier: LuxuryTier.gold,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Step indicator
            _StepIndicator(currentStep: _currentStep),
            const SizedBox(height: 24),

            // Active import progress
            if (_activeJob != null) ...[
              ImportProgress(job: _activeJob!),
              const SizedBox(height: 16),
              Center(
                child: IrisButton(
                  label: 'New Import',
                  onPressed: _reset,
                  variant: IrisButtonVariant.secondary,
                  icon: Iconsax.add,
                ),
              ),
              const SizedBox(height: 24),
            ] else ...[
              // Wizard steps
              if (_currentStep == 0) _buildEntitySelection(),
              if (_currentStep == 1) _buildFileUpload(),
              if (_currentStep == 2) _buildFieldMapping(),
              if (_currentStep == 3) _buildPreview(),
              if (_currentStep == 4) _buildExecuting(),
              const SizedBox(height: 24),
            ],

            // History
            LuxurySectionHeader(
              title: 'Import History',
              subtitle: 'Past imports',
              tier: LuxuryTier.gold,
            ),
            const SizedBox(height: 12),
            historyAsync.when(
              loading: () => const IrisCardShimmer(),
              error: (_, _) => const SizedBox.shrink(),
              data: (history) {
                if (history.isEmpty) {
                  return LuxuryCard(
                    tier: LuxuryTier.gold,
                    padding: const EdgeInsets.all(20),
                    child: Center(
                      child: Text(
                        'No previous imports',
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ),
                  );
                }

                return Column(
                  children: history.map((job) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: LuxuryCard(
                        tier: LuxuryTier.gold,
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: (job.isComplete
                                        ? LuxuryColors.successGreen
                                        : job.hasFailed
                                            ? LuxuryColors.errorRuby
                                            : LuxuryColors.warningAmber)
                                    .withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                job.isComplete
                                    ? Iconsax.tick_circle
                                    : job.hasFailed
                                        ? Iconsax.close_circle
                                        : Iconsax.clock,
                                size: 18,
                                color: job.isComplete
                                    ? LuxuryColors.successGreen
                                    : job.hasFailed
                                        ? LuxuryColors.errorRuby
                                        : LuxuryColors.warningAmber,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    job.fileName,
                                    style: IrisTheme.bodySmall.copyWith(
                                      color: isDark
                                          ? LuxuryColors.textOnDark
                                          : LuxuryColors.textOnLight,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${job.entityType} - ${job.processedRows}/${job.totalRows} rows',
                                    style: IrisTheme.labelSmall.copyWith(
                                      color: LuxuryColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            LuxuryBadge(
                              text: job.status,
                              color: job.isComplete
                                  ? LuxuryColors.successGreen
                                  : job.hasFailed
                                      ? LuxuryColors.errorRuby
                                      : LuxuryColors.warningAmber,
                              tier: LuxuryTier.gold,
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEntitySelection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select Entity Type',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Choose what type of data you want to import',
          style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.6,
          children: _entityTypes.map((type) {
            final isSelected = _selectedEntityType == type['value'];
            return LuxuryCard(
              tier: isSelected ? LuxuryTier.gold : LuxuryTier.platinum,
              padding: const EdgeInsets.all(16),
              onTap: () => _selectEntityType(type['value'] as String),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    type['icon'] as IconData,
                    size: 28,
                    color: isSelected
                        ? LuxuryColors.champagneGold
                        : LuxuryColors.textMuted,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    type['label'] as String,
                    style: IrisTheme.bodySmall.copyWith(
                      fontWeight: FontWeight.w500,
                      color: isSelected
                          ? LuxuryColors.champagneGold
                          : LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildFileUpload() {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              Iconsax.document_upload,
              size: 32,
              color: LuxuryColors.champagneGold,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Upload CSV File',
            style: IrisTheme.titleMedium.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Select a CSV file to import',
            style: IrisTheme.bodySmall.copyWith(
              color: LuxuryColors.textMuted,
            ),
          ),
          const SizedBox(height: 20),
          IrisButton(
            label: 'Choose File',
            onPressed: _selectFile,
            variant: IrisButtonVariant.gold,
            icon: Iconsax.folder_open,
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildFieldMapping() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Map Fields',
          style: IrisTheme.titleMedium.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Text(
          'Match CSV columns to CRM fields',
          style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
        ),
        const SizedBox(height: 16),
        LuxuryCard(
          tier: LuxuryTier.gold,
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _MappingRow(csvColumn: 'Name', crmField: 'name'),
              const LuxuryDivider(),
              _MappingRow(csvColumn: 'Email', crmField: 'email'),
              const LuxuryDivider(),
              _MappingRow(csvColumn: 'Phone', crmField: 'phone'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Center(
          child: IrisButton(
            label: 'Continue',
            onPressed: _confirmMapping,
            variant: IrisButtonVariant.primary,
            icon: Iconsax.arrow_right_3,
          ),
        ),
      ],
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildPreview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Preview Import',
          style: IrisTheme.titleMedium.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Text(
          'Review data before importing',
          style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
        ),
        const SizedBox(height: 16),
        LuxuryCard(
          tier: LuxuryTier.gold,
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _PreviewRow(label: 'Entity Type', value: _selectedEntityType ?? ''),
              const SizedBox(height: 8),
              _PreviewRow(label: 'File', value: _selectedFilePath ?? ''),
              const SizedBox(height: 8),
              _PreviewRow(label: 'Estimated Rows', value: '~100'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IrisButton(
              label: 'Back',
              onPressed: () => setState(() => _currentStep = 2),
              variant: IrisButtonVariant.secondary,
            ),
            const SizedBox(width: 12),
            IrisButton(
              label: 'Start Import',
              onPressed: _startImport,
              variant: IrisButtonVariant.gold,
              icon: Iconsax.import_1,
            ),
          ],
        ),
      ],
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildExecuting() {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: LuxuryColors.champagneGold,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Importing data...',
            style: IrisTheme.titleMedium.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'This may take a moment',
            style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }
}

class _StepIndicator extends StatelessWidget {
  final int currentStep;

  const _StepIndicator({required this.currentStep});

  static const _steps = ['Entity', 'Upload', 'Map', 'Preview', 'Import'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(_steps.length * 2 - 1, (index) {
        if (index.isOdd) {
          // Connector line
          final stepIndex = index ~/ 2;
          final isCompleted = stepIndex < currentStep;
          return Expanded(
            child: Container(
              height: 2,
              color: isCompleted
                  ? LuxuryColors.champagneGold
                  : LuxuryColors.textMuted.withValues(alpha: 0.2),
            ),
          );
        }

        final stepIndex = index ~/ 2;
        final isActive = stepIndex == currentStep;
        final isCompleted = stepIndex < currentStep;

        return Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: isActive || isCompleted
                ? LuxuryColors.champagneGold
                : LuxuryColors.textMuted.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isCompleted
                ? Icon(Icons.check, size: 14, color: Colors.white)
                : Text(
                    '${stepIndex + 1}',
                    style: IrisTheme.labelSmall.copyWith(
                      color: isActive ? Colors.white : LuxuryColors.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        );
      }),
    );
  }
}

class _MappingRow extends StatelessWidget {
  final String csvColumn;
  final String crmField;

  const _MappingRow({required this.csvColumn, required this.crmField});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              csvColumn,
              style: IrisTheme.bodySmall.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Icon(Iconsax.arrow_right_3,
              size: 16, color: LuxuryColors.champagneGold),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              crmField,
              style: IrisTheme.bodySmall.copyWith(
                color: LuxuryColors.champagneGold,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

class _PreviewRow extends StatelessWidget {
  final String label;
  final String value;

  const _PreviewRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
        ),
        Text(
          value,
          style: IrisTheme.bodySmall.copyWith(fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
