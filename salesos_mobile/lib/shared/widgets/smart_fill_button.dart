import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/smart_fill_service.dart';
import '../../core/services/prefill_service.dart';
import 'luxury_card.dart';

/// Type of entity for smart fill
enum SmartFillEntityType {
  contact,
  account,
  lead,
  task,
}

/// Callback for when smart fill extracts data
typedef SmartFillCallback = void Function(Map<String, dynamic> extractedData);

/// Smart Fill button widget that extracts data from clipboard or pasted text
class SmartFillButton extends ConsumerStatefulWidget {
  final SmartFillEntityType entityType;
  final SmartFillCallback onDataExtracted;
  final bool showAsIcon;

  const SmartFillButton({
    super.key,
    required this.entityType,
    required this.onDataExtracted,
    this.showAsIcon = false,
  });

  @override
  ConsumerState<SmartFillButton> createState() => _SmartFillButtonState();
}

class _SmartFillButtonState extends ConsumerState<SmartFillButton> {
  bool _isLoading = false;

  Future<void> _showSmartFillDialog() async {
    final textController = TextEditingController();
    final prefillService = ref.read(prefillServiceProvider);

    // Try to get clipboard text
    final clipboardText = await prefillService.getClipboardText();
    if (clipboardText != null && clipboardText.isNotEmpty) {
      textController.text = clipboardText;
    }

    if (!mounted) return;

    final result = await showDialog<String>(
      context: context,
      builder: (context) => _SmartFillDialog(
        controller: textController,
        entityType: widget.entityType,
      ),
    );

    if (result != null && result.isNotEmpty && mounted) {
      await _extractData(result);
    }
  }

  Future<void> _extractData(String text) async {
    setState(() => _isLoading = true);

    try {
      final prefillService = ref.read(prefillServiceProvider);
      SmartFillResult result;

      switch (widget.entityType) {
        case SmartFillEntityType.contact:
        case SmartFillEntityType.lead:
          result = await prefillService.smartFillContact(text);
          break;
        case SmartFillEntityType.account:
          result = await prefillService.smartFillAccount(text);
          break;
        case SmartFillEntityType.task:
          result = await prefillService.smartFillTask(text);
          break;
      }

      if (result.success && result.extractedData.isNotEmpty) {
        HapticFeedback.mediumImpact();
        widget.onDataExtracted(result.extractedData);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Text('Extracted ${result.extractedData.length} fields'),
                ],
              ),
              backgroundColor: LuxuryColors.rolexGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } else {
        HapticFeedback.heavyImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.errorMessage ?? 'Could not extract data'),
              backgroundColor: LuxuryColors.errorRuby,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Smart Fill failed: ${e.toString()}'),
            backgroundColor: LuxuryColors.errorRuby,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (widget.showAsIcon) {
      return IconButton(
        onPressed: _isLoading ? null : _showSmartFillDialog,
        icon: _isLoading
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(
                    isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
                  ),
                ),
              )
            : Icon(
                Icons.auto_awesome,
                color: isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
              ),
        tooltip: 'Smart Fill',
      );
    }

    return OutlinedButton.icon(
      onPressed: _isLoading ? null : _showSmartFillDialog,
      icon: _isLoading
          ? SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(
                  isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
                ),
              ),
            )
          : Icon(
              Icons.auto_awesome,
              size: 18,
              color: isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
            ),
      label: Text(
        _isLoading ? 'Extracting...' : 'Smart Fill',
        style: TextStyle(
          color: isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
          fontWeight: FontWeight.w500,
        ),
      ),
      style: OutlinedButton.styleFrom(
        side: BorderSide(
          color: isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.5)
              : LuxuryColors.warmGold.withValues(alpha: 0.5),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      ),
    );
  }
}

/// Dialog for smart fill text input
class _SmartFillDialog extends StatelessWidget {
  final TextEditingController controller;
  final SmartFillEntityType entityType;

  const _SmartFillDialog({
    required this.controller,
    required this.entityType,
  });

  String get _hintText {
    switch (entityType) {
      case SmartFillEntityType.contact:
      case SmartFillEntityType.lead:
        return 'Paste a business card, email signature, or contact info...';
      case SmartFillEntityType.account:
        return 'Paste company information, website content, or company description...';
      case SmartFillEntityType.task:
        return 'Describe the task or meeting, e.g., "Call John tomorrow at 2pm about the proposal"';
    }
  }

  String get _title {
    switch (entityType) {
      case SmartFillEntityType.contact:
        return 'Smart Fill Contact';
      case SmartFillEntityType.lead:
        return 'Smart Fill Lead';
      case SmartFillEntityType.account:
        return 'Smart Fill Account';
      case SmartFillEntityType.task:
        return 'Smart Fill Task';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(
            Icons.auto_awesome,
            color: isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _title,
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Paste or type text to extract information using AI',
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.white60 : Colors.black54,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              maxLines: 8,
              minLines: 4,
              decoration: InputDecoration(
                hintText: _hintText,
                hintStyle: TextStyle(
                  color: isDark ? Colors.white38 : Colors.black38,
                  fontSize: 13,
                ),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.black.withValues(alpha: 0.03),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark ? Colors.white24 : Colors.black12,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark ? Colors.white24 : Colors.black12,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
                  ),
                ),
              ),
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 14,
                  color: isDark ? Colors.white38 : Colors.black38,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'AI will extract and fill matching fields',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white38 : Colors.black38,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(
            'Cancel',
            style: TextStyle(
              color: isDark ? Colors.white60 : Colors.black54,
            ),
          ),
        ),
        FilledButton.icon(
          onPressed: () {
            if (controller.text.trim().isNotEmpty) {
              Navigator.of(context).pop(controller.text.trim());
            }
          },
          icon: const Icon(Icons.auto_awesome, size: 18),
          label: const Text('Extract'),
          style: FilledButton.styleFrom(
            backgroundColor: isDark ? LuxuryColors.champagneGold : LuxuryColors.warmGold,
            foregroundColor: isDark ? Colors.black : Colors.white,
          ),
        ),
      ],
    );
  }
}

/// Extension to add smart fill support to forms
extension SmartFillFormExtension on Map<String, dynamic> {
  /// Apply extracted data to form controllers
  void applyToControllers({
    TextEditingController? firstName,
    TextEditingController? lastName,
    TextEditingController? email,
    TextEditingController? phone,
    TextEditingController? mobilePhone,
    TextEditingController? company,
    TextEditingController? title,
    TextEditingController? department,
    TextEditingController? website,
    TextEditingController? street,
    TextEditingController? city,
    TextEditingController? state,
    TextEditingController? postalCode,
    TextEditingController? country,
    TextEditingController? description,
  }) {
    if (this['firstName'] != null) firstName?.text = this['firstName'];
    if (this['lastName'] != null) lastName?.text = this['lastName'];
    if (this['email'] != null) email?.text = this['email'];
    if (this['phone'] != null) phone?.text = this['phone'];
    if (this['mobilePhone'] != null) mobilePhone?.text = this['mobilePhone'];
    if (this['company'] != null) company?.text = this['company'];
    if (this['title'] != null) title?.text = this['title'];
    if (this['department'] != null) department?.text = this['department'];
    if (this['website'] != null) website?.text = this['website'];
    if (this['street'] != null) street?.text = this['street'];
    if (this['city'] != null) city?.text = this['city'];
    if (this['state'] != null) state?.text = this['state'];
    if (this['postalCode'] != null) postalCode?.text = this['postalCode'];
    if (this['country'] != null) country?.text = this['country'];
    if (this['description'] != null || this['notes'] != null) {
      description?.text = this['description'] ?? this['notes'] ?? '';
    }
  }
}
