import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/config/theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Dialog for exporting user data (GDPR compliance)
class DataExportDialog extends ConsumerStatefulWidget {
  const DataExportDialog({super.key});

  static Future<void> show(BuildContext context) {
    HapticFeedback.mediumImpact();
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: const Center(
            child: DataExportDialog(),
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

  @override
  ConsumerState<DataExportDialog> createState() => _DataExportDialogState();
}

class _DataExportDialogState extends ConsumerState<DataExportDialog> {
  bool _isExporting = false;
  bool _exportComplete = false;
  String? _errorMessage;
  double _progress = 0;
  String _statusMessage = 'Preparing export...';

  // Data categories to export
  final Map<String, bool> _selectedCategories = {
    'profile': true,
    'contacts': true,
    'leads': true,
    'accounts': true,
    'opportunities': true,
    'activities': true,
    'notes': true,
    'conversations': true,
  };

  Future<void> _startExport() async {
    setState(() {
      _isExporting = true;
      _errorMessage = null;
      _progress = 0;
      _statusMessage = 'Preparing export...';
    });

    try {
      final api = ref.read(apiClientProvider);

      // Build query params based on selected categories
      final categories = _selectedCategories.entries
          .where((e) => e.value)
          .map((e) => e.key)
          .toList();

      setState(() {
        _progress = 0.1;
        _statusMessage = 'Requesting data export...';
      });

      // Request data export from backend
      final response = await api.post(
        '/users/export',
        data: {'categories': categories},
      );

      setState(() {
        _progress = 0.3;
        _statusMessage = 'Processing data...';
      });

      // Get the export data
      final exportData = response.data;

      setState(() {
        _progress = 0.6;
        _statusMessage = 'Generating file...';
      });

      // Convert to JSON string
      final jsonString = _formatExportData(exportData);

      setState(() {
        _progress = 0.8;
        _statusMessage = 'Saving file...';
      });

      // Save to temporary file
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().toIso8601String().replaceAll(':', '-').split('.').first;
      final file = File('${directory.path}/iris_data_export_$timestamp.json');
      await file.writeAsString(jsonString);

      setState(() {
        _progress = 1.0;
        _statusMessage = 'Export complete!';
        _exportComplete = true;
      });

      HapticFeedback.heavyImpact();

      // Share the file
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          subject: 'SalesOS Data Export',
          text: 'Your SalesOS data export',
        ),
      );
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to export data. Please try again.';
        _isExporting = false;
      });
    }
  }

  String _formatExportData(dynamic data) {
    // Format the data as pretty JSON
    if (data is Map) {
      return _prettyJson(data);
    }
    return data.toString();
  }

  String _prettyJson(Map data, [int indent = 0]) {
    final buffer = StringBuffer();
    final spaces = '  ' * indent;
    buffer.writeln('{');

    final entries = data.entries.toList();
    for (var i = 0; i < entries.length; i++) {
      final entry = entries[i];
      buffer.write('$spaces  "${entry.key}": ');

      if (entry.value is Map) {
        buffer.write(_prettyJson(entry.value as Map, indent + 1));
      } else if (entry.value is List) {
        buffer.write(_prettyList(entry.value as List, indent + 1));
      } else if (entry.value is String) {
        buffer.write('"${entry.value}"');
      } else {
        buffer.write(entry.value);
      }

      if (i < entries.length - 1) buffer.write(',');
      buffer.writeln();
    }

    buffer.write('$spaces}');
    return buffer.toString();
  }

  String _prettyList(List list, int indent) {
    if (list.isEmpty) return '[]';

    final buffer = StringBuffer();
    final spaces = '  ' * indent;
    buffer.writeln('[');

    for (var i = 0; i < list.length; i++) {
      final item = list[i];
      buffer.write('$spaces  ');

      if (item is Map) {
        buffer.write(_prettyJson(item, indent + 1));
      } else if (item is List) {
        buffer.write(_prettyList(item, indent + 1));
      } else if (item is String) {
        buffer.write('"$item"');
      } else {
        buffer.write(item);
      }

      if (i < list.length - 1) buffer.write(',');
      buffer.writeln();
    }

    buffer.write('$spaces]');
    return buffer.toString();
  }

  IconData _getCategoryIconData(String category) {
    switch (category) {
      case 'profile':
        return Iconsax.user;
      case 'contacts':
        return Iconsax.people;
      case 'leads':
        return Iconsax.user_add;
      case 'accounts':
        return Iconsax.building;
      case 'opportunities':
        return Iconsax.chart;
      case 'activities':
        return Iconsax.calendar;
      case 'notes':
        return Iconsax.note;
      case 'conversations':
        return Iconsax.message;
      default:
        return Iconsax.document;
    }
  }

  String _getCategoryLabel(String category) {
    switch (category) {
      case 'profile':
        return 'Profile Information';
      case 'contacts':
        return 'Contacts';
      case 'leads':
        return 'Leads';
      case 'accounts':
        return 'Accounts';
      case 'opportunities':
        return 'Opportunities';
      case 'activities':
        return 'Activities & Tasks';
      case 'notes':
        return 'Notes';
      case 'conversations':
        return 'AI Conversations';
      default:
        return category;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 450, maxHeight: 650),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
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
        child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LuxuryColors.emeraldGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Iconsax.document_download,
                      size: 24,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Export Your Data',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Download a copy of your personal data',
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              if (_isExporting) ...[
                // Progress View
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark ? LuxuryColors.obsidian : LuxuryColors.cream.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      if (_exportComplete)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Iconsax.tick_circle,
                            size: 40,
                            color: LuxuryColors.rolexGreen,
                          ),
                        )
                      else
                        SizedBox(
                          width: 60,
                          height: 60,
                          child: CircularProgressIndicator(
                            value: _progress,
                            strokeWidth: 4,
                            backgroundColor: LuxuryColors.textMuted.withValues(alpha: 0.2),
                            valueColor: AlwaysStoppedAnimation(LuxuryColors.rolexGreen),
                          ),
                        ),
                      const SizedBox(height: 16),
                      Text(
                        _statusMessage,
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (!_exportComplete) ...[
                        const SizedBox(height: 8),
                        Text(
                          '${(_progress * 100).toInt()}%',
                          style: IrisTheme.labelMedium.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                if (_exportComplete)
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: LuxuryColors.rolexGreen,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Done',
                      style: IrisTheme.labelLarge.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ] else ...[
                // Error message
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Iconsax.warning_2,
                          size: 18,
                          color: LuxuryColors.errorRuby,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: IrisTheme.bodySmall.copyWith(
                              color: LuxuryColors.errorRuby,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Category Selection
                Text(
                  'SELECT DATA TO EXPORT',
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.textMuted,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 12),

                Container(
                  decoration: BoxDecoration(
                    color: isDark ? LuxuryColors.obsidian : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark
                          ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                          : LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Column(
                    children: _selectedCategories.keys.map((category) {
                      final isLast = category == _selectedCategories.keys.last;
                      return Column(
                        children: [
                          CheckboxListTile(
                            value: _selectedCategories[category],
                            onChanged: (value) {
                              setState(() {
                                _selectedCategories[category] = value ?? false;
                              });
                            },
                            title: Row(
                              children: [
                                Icon(
                                  _getCategoryIconData(category),
                                  size: 18,
                                  color: LuxuryColors.textMuted,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  _getCategoryLabel(category),
                                  style: IrisTheme.bodyMedium.copyWith(
                                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                  ),
                                ),
                              ],
                            ),
                            activeColor: LuxuryColors.rolexGreen,
                            checkboxShape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            controlAffinity: ListTileControlAffinity.trailing,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          if (!isLast)
                            Divider(
                              height: 1,
                              indent: 48,
                              color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                            ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // Info text
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: LuxuryColors.jadePremium.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Iconsax.info_circle,
                        size: 18,
                        color: LuxuryColors.jadePremium,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your data will be exported as a JSON file that you can save or share.',
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.jadePremium,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: BorderSide(color: LuxuryColors.textMuted.withValues(alpha: 0.3)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          'Cancel',
                          style: IrisTheme.labelLarge.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: _selectedCategories.values.any((v) => v) ? _startExport : null,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: LuxuryColors.rolexGreen,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: LuxuryColors.textMuted.withValues(alpha: 0.3),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          'Export Data',
                          style: IrisTheme.labelLarge.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 16),
            ],
          ),
        ),
        ),
      ),
    );
  }
}
