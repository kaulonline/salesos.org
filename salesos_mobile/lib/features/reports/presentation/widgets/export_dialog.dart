import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/date_range_picker.dart';
import '../../../../core/services/export_service.dart';

/// Factory function to create LuxuryCard - workaround for analyzer issue
Widget _createLuxuryCard({
  required Widget child,
  LuxuryTier tier = LuxuryTier.gold,
  LuxuryCardVariant variant = LuxuryCardVariant.standard,
  EdgeInsetsGeometry padding = const EdgeInsets.all(16),
  VoidCallback? onTap,
}) {
  return LuxuryCard(
    tier: tier,
    variant: variant,
    padding: padding,
    onTap: onTap,
    child: child,
  );
}

/// Dialog for exporting data in various formats with date range and entity selection
class ExportDialog extends ConsumerStatefulWidget {
  final String title;
  final String? subtitle;
  final ExportDataType dataType;
  final List<Map<String, dynamic>> data;
  final String filename;
  final String? exportTitle;
  final DateTime? initialStartDate;
  final DateTime? initialEndDate;
  final bool showDateRangePicker;
  final bool showEntityTypes;
  final Set<ExportDataType>? availableEntityTypes;

  const ExportDialog({
    super.key,
    required this.title,
    this.subtitle,
    required this.dataType,
    required this.data,
    required this.filename,
    this.exportTitle,
    this.initialStartDate,
    this.initialEndDate,
    this.showDateRangePicker = true,
    this.showEntityTypes = false,
    this.availableEntityTypes,
  });

  @override
  ConsumerState<ExportDialog> createState() => _ExportDialogState();
}

class _ExportDialogState extends ConsumerState<ExportDialog> {
  ExportFormat _selectedFormat = ExportFormat.csv;
  bool _isExporting = false;
  ExportResult? _result;

  // Date range selection
  late DateRangeSelection _dateRangeSelection;

  // Entity type selection
  late Set<ExportDataType> _selectedEntityTypes;

  // Export options
  bool _includeHeaders = true;
  bool _includeSummary = true;

  @override
  void initState() {
    super.initState();

    // Initialize date range
    if (widget.initialStartDate != null && widget.initialEndDate != null) {
      _dateRangeSelection = DateRangeSelection(
        startDate: widget.initialStartDate!,
        endDate: widget.initialEndDate!,
        preset: DateRangePreset.custom,
      );
    } else {
      _dateRangeSelection = DateRangeSelection.fromPreset(DateRangePreset.thisMonth);
    }

    // Initialize entity types
    _selectedEntityTypes = widget.availableEntityTypes ?? {widget.dataType};
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final exportState = ref.watch(exportNotifierProvider);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.2)
                        : Colors.black.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title
              _buildHeader(isDark),

              const SizedBox(height: 24),

              // Data info
              _buildDataInfo(isDark),

              const SizedBox(height: 20),

              // Date Range Section (if enabled)
              if (widget.showDateRangePicker) ...[
                _buildDateRangeSection(isDark),
                const SizedBox(height: 20),
              ],

              // Entity Type Section (if enabled)
              if (widget.showEntityTypes && widget.availableEntityTypes != null && widget.availableEntityTypes!.length > 1) ...[
                _buildEntityTypeSection(isDark),
                const SizedBox(height: 20),
              ],

              // Format selection
              _buildFormatSection(isDark),

              const SizedBox(height: 16),

              // Export options
              _buildOptionsSection(isDark),

              const SizedBox(height: 24),

              // Progress indicator
              if (_isExporting || exportState.isExporting) ...[
                _buildProgressIndicator(isDark, exportState),
                const SizedBox(height: 16),
              ],

              // Result message
              if (_result != null) ...[
                _ResultMessage(result: _result!),
                const SizedBox(height: 16),
              ],

              // Actions
              _buildActions(isDark),

              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            Iconsax.export_1,
            size: 22,
            color: LuxuryColors.rolexGreen,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.title,
                style: IrisTheme.titleLarge.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (widget.subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  widget.subtitle!,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    ).animate().fadeIn(duration: 200.ms);
  }

  Widget _buildDataInfo(bool isDark) {
    return _createLuxuryCard(
      variant: LuxuryCardVariant.standard,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(
            Iconsax.document_text,
            size: 20,
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '${widget.data.length} records will be exported',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildDateRangeSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Date Range',
          style: IrisTheme.labelLarge.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () async {
            HapticFeedback.lightImpact();
            final result = await showPremiumDateRangePicker(
              context: context,
              initialSelection: _dateRangeSelection,
              showCompareToggle: false,
              showAllTimeOption: true,
              presets: [
                DateRangePreset.today,
                DateRangePreset.last7Days,
                DateRangePreset.last30Days,
                DateRangePreset.thisMonth,
                DateRangePreset.thisQuarter,
                DateRangePreset.yearToDate,
                DateRangePreset.allTime,
              ],
            );
            if (result != null) {
              setState(() => _dateRangeSelection = result);
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.deepEmerald.withValues(alpha: 0.15)
                  : LuxuryColors.jadePremium.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Iconsax.calendar_1,
                  size: 20,
                  color: LuxuryColors.jadePremium,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _dateRangeSelection.formattedRange,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Icon(
                  Iconsax.arrow_down_1,
                  size: 16,
                  color: LuxuryColors.jadePremium,
                ),
              ],
            ),
          ),
        ),
      ],
    ).animate(delay: 120.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildEntityTypeSection(bool isDark) {
    final availableTypes = widget.availableEntityTypes ?? {widget.dataType};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Include Data Types',
          style: IrisTheme.labelLarge.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: availableTypes.map((type) {
            final isSelected = _selectedEntityTypes.contains(type);
            return _EntityTypeChip(
              type: type,
              isSelected: isSelected,
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() {
                  if (isSelected && _selectedEntityTypes.length > 1) {
                    _selectedEntityTypes.remove(type);
                  } else if (!isSelected) {
                    _selectedEntityTypes.add(type);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    ).animate(delay: 140.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildFormatSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Export Format',
          style: IrisTheme.labelLarge.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _FormatOption(
                icon: Iconsax.document_text,
                label: 'CSV',
                description: 'Spreadsheet',
                isSelected: _selectedFormat == ExportFormat.csv,
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedFormat = ExportFormat.csv);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _FormatOption(
                icon: Iconsax.document,
                label: 'PDF',
                description: 'Document',
                isSelected: _selectedFormat == ExportFormat.pdf,
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedFormat = ExportFormat.pdf);
                },
              ),
            ),
          ],
        ),
      ],
    ).animate(delay: 160.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildOptionsSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Options',
          style: IrisTheme.labelLarge.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        _OptionToggle(
          label: 'Include column headers',
          value: _includeHeaders,
          onChanged: (value) {
            HapticFeedback.selectionClick();
            setState(() => _includeHeaders = value);
          },
        ),
        const SizedBox(height: 8),
        if (_selectedFormat == ExportFormat.pdf)
          _OptionToggle(
            label: 'Include summary section',
            value: _includeSummary,
            onChanged: (value) {
              HapticFeedback.selectionClick();
              setState(() => _includeSummary = value);
            },
          ),
      ],
    ).animate(delay: 180.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildProgressIndicator(bool isDark, ExportState exportState) {
    final progress = exportState.progress;
    final operation = exportState.currentOperation ?? 'Exporting...';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.deepEmerald.withValues(alpha: 0.1)
            : LuxuryColors.jadePremium.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.jadePremium.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  operation,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: IrisTheme.labelMedium.copyWith(
                  color: LuxuryColors.jadePremium,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.05),
              valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
              minHeight: 4,
            ),
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildActions(bool isDark) {
    if (_result?.success == true) {
      return Row(
        children: [
          Expanded(
            child: _ActionButton(
              label: 'Share',
              icon: Iconsax.share,
              isPrimary: true,
              onTap: () => _shareFile(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ActionButton(
              label: 'Save',
              icon: Iconsax.document_download,
              isPrimary: false,
              onTap: () => _saveToDevice(),
            ),
          ),
          const SizedBox(width: 12),
          _ActionButton(
            label: 'Done',
            icon: Iconsax.tick_circle,
            isPrimary: false,
            isCompact: true,
            onTap: () => Navigator.of(context).pop(),
          ),
        ],
      ).animate().fadeIn();
    }

    return Row(
      children: [
        Expanded(
          child: _ActionButton(
            label: 'Cancel',
            icon: Iconsax.close_circle,
            isPrimary: false,
            onTap: () => Navigator.of(context).pop(),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ActionButton(
            label: _isExporting ? 'Exporting...' : 'Export',
            icon: _isExporting ? null : Iconsax.export_1,
            isPrimary: true,
            isLoading: _isExporting,
            onTap: _isExporting ? null : () => _performExport(),
          ),
        ),
      ],
    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1);
  }

  Future<void> _performExport() async {
    if (widget.data.isEmpty) {
      setState(() {
        _result = ExportResult.failure('No data to export');
      });
      return;
    }

    setState(() {
      _isExporting = true;
      _result = null;
    });

    final exportOptions = ExportOptions(
      format: _selectedFormat,
      startDate: _dateRangeSelection.preset == DateRangePreset.allTime
          ? null
          : _dateRangeSelection.startDate,
      endDate: _dateRangeSelection.preset == DateRangePreset.allTime
          ? null
          : _dateRangeSelection.endDate,
      entityTypes: _selectedEntityTypes,
      customTitle: widget.exportTitle,
      includeHeaders: _includeHeaders,
      includeSummary: _includeSummary,
    );

    final exportNotifier = ref.read(exportNotifierProvider.notifier);
    final result = await exportNotifier.exportData(
      data: widget.data,
      filename: widget.filename,
      dataType: widget.dataType,
      format: _selectedFormat,
      title: widget.exportTitle,
      options: exportOptions,
    );

    if (mounted) {
      setState(() {
        _isExporting = false;
        _result = result;
      });
    }
  }

  Future<void> _shareFile() async {
    if (_result?.filePath == null) return;

    final exportNotifier = ref.read(exportNotifierProvider.notifier);
    await exportNotifier.shareExport(_result!.filePath!);
  }

  Future<void> _saveToDevice() async {
    if (_result?.filePath == null) return;

    final exportNotifier = ref.read(exportNotifierProvider.notifier);
    final savedPath = await exportNotifier.saveToDevice(
      _result!.filePath!,
      customFilename: _result!.fileName,
    );

    if (mounted && savedPath != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saved to: $savedPath'),
          backgroundColor: IrisTheme.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

/// Entity type selection chip
class _EntityTypeChip extends StatelessWidget {
  final ExportDataType type;
  final bool isSelected;
  final VoidCallback onTap;

  const _EntityTypeChip({
    required this.type,
    required this.isSelected,
    required this.onTap,
  });

  String get _label {
    switch (type) {
      case ExportDataType.leads:
        return 'Leads';
      case ExportDataType.contacts:
        return 'Contacts';
      case ExportDataType.opportunities:
        return 'Opportunities';
      case ExportDataType.deals:
        return 'Deals';
      case ExportDataType.activities:
        return 'Activities';
      case ExportDataType.reports:
        return 'Reports';
    }
  }

  IconData get _icon {
    switch (type) {
      case ExportDataType.leads:
        return Iconsax.user_tag;
      case ExportDataType.contacts:
        return Iconsax.profile_2user;
      case ExportDataType.opportunities:
        return Iconsax.dollar_circle;
      case ExportDataType.deals:
        return Iconsax.receipt_item;
      case ExportDataType.activities:
        return Iconsax.activity;
      case ExportDataType.reports:
        return Iconsax.chart_2;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
              : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? LuxuryColors.rolexGreen
                : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _icon,
              size: 16,
              color: isSelected
                  ? LuxuryColors.rolexGreen
                  : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
            ),
            const SizedBox(width: 8),
            Text(
              _label,
              style: IrisTheme.labelMedium.copyWith(
                color: isSelected
                    ? LuxuryColors.rolexGreen
                    : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Icon(
                Icons.check,
                size: 14,
                color: LuxuryColors.rolexGreen,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Format selection option card
class _FormatOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final bool isSelected;
  final VoidCallback onTap;

  const _FormatOption({
    required this.icon,
    required this.label,
    required this.description,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
              : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? LuxuryColors.rolexGreen
                : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 28,
              color: isSelected
                  ? LuxuryColors.rolexGreen
                  : (isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: IrisTheme.titleSmall.copyWith(
                color: isSelected
                    ? LuxuryColors.rolexGreen
                    : (isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              description,
              style: IrisTheme.labelSmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Option toggle widget
class _OptionToggle extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _OptionToggle({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 40,
              height: 22,
              decoration: BoxDecoration(
                color: value
                    ? LuxuryColors.rolexGreen
                    : (isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : Colors.black.withValues(alpha: 0.1)),
                borderRadius: BorderRadius.circular(11),
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                alignment: value ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 18,
                  height: 18,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Action button widget
class _ActionButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isPrimary;
  final bool isLoading;
  final bool isCompact;
  final VoidCallback? onTap;

  const _ActionButton({
    required this.label,
    this.icon,
    required this.isPrimary,
    this.isLoading = false,
    this.isCompact = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap != null
          ? () {
              HapticFeedback.lightImpact();
              onTap!();
            }
          : null,
      child: Container(
        padding: EdgeInsets.symmetric(
          vertical: 14,
          horizontal: isCompact ? 16 : 0,
        ),
        decoration: BoxDecoration(
          color: isPrimary
              ? LuxuryColors.rolexGreen
              : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
          borderRadius: BorderRadius.circular(12),
          border: isPrimary
              ? null
              : Border.all(
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: isCompact ? MainAxisSize.min : MainAxisSize.max,
          children: [
            if (isLoading)
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isPrimary ? Colors.white : LuxuryColors.rolexGreen,
                  ),
                ),
              )
            else if (icon != null)
              Icon(
                icon,
                size: 18,
                color: isPrimary
                    ? Colors.white
                    : (isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary),
              ),
            if (!isLoading && icon != null) const SizedBox(width: 8),
            Text(
              label,
              style: IrisTheme.labelLarge.copyWith(
                color: isPrimary
                    ? Colors.white
                    : (isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Result message widget
class _ResultMessage extends StatelessWidget {
  final ExportResult result;

  const _ResultMessage({required this.result});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSuccess = result.success;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isSuccess
            ? IrisTheme.success.withValues(alpha: 0.1)
            : IrisTheme.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSuccess
              ? IrisTheme.success.withValues(alpha: 0.3)
              : IrisTheme.error.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isSuccess ? Iconsax.tick_circle : Iconsax.warning_2,
            size: 20,
            color: isSuccess ? IrisTheme.success : IrisTheme.error,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isSuccess ? 'Export Successful' : 'Export Failed',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isSuccess ? IrisTheme.success : IrisTheme.error,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (isSuccess && result.fileName != null)
                  Text(
                    result.fileName!,
                    style: IrisTheme.labelSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                  )
                else if (!isSuccess && result.error != null)
                  Text(
                    result.error!,
                    style: IrisTheme.labelSmall.copyWith(
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
    ).animate().fadeIn().shake(
          hz: isSuccess ? 0 : 2,
          curve: Curves.easeInOut,
        );
  }
}
