import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

class PriceBookFormDialog extends StatefulWidget {
  final String? initialName;
  final String? initialDescription;
  final String? initialCurrency;
  final bool initialIsStandard;
  final Function(Map<String, dynamic>) onSave;

  const PriceBookFormDialog({
    super.key,
    this.initialName,
    this.initialDescription,
    this.initialCurrency,
    this.initialIsStandard = false,
    required this.onSave,
  });

  @override
  State<PriceBookFormDialog> createState() => _PriceBookFormDialogState();
}

class _PriceBookFormDialogState extends State<PriceBookFormDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _currencyController;
  late bool _isStandard;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _descriptionController = TextEditingController(text: widget.initialDescription);
    _currencyController = TextEditingController(text: widget.initialCurrency ?? 'USD');
    _isStandard = widget.initialIsStandard;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _currencyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Icon(Iconsax.book, size: 20, color: LuxuryColors.champagneGold),
          const SizedBox(width: 8),
          Text(
            widget.initialName != null ? 'Edit Price Book' : 'New Price Book',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildField('Name', _nameController, isDark),
            const SizedBox(height: 12),
            _buildField('Description', _descriptionController, isDark, maxLines: 3),
            const SizedBox(height: 12),
            _buildField('Currency', _currencyController, isDark),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  'Standard Price Book',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const Spacer(),
                Switch(
                  value: _isStandard,
                  onChanged: (v) => setState(() => _isStandard = v),
                  activeTrackColor: LuxuryColors.rolexGreen,
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('Cancel', style: IrisTheme.labelMedium.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          )),
        ),
        TextButton(
          onPressed: () {
            if (_nameController.text.trim().isEmpty) return;
            widget.onSave({
              'name': _nameController.text.trim(),
              'description': _descriptionController.text.trim(),
              'currency': _currencyController.text.trim(),
              'isStandard': _isStandard,
            });
            Navigator.of(context).pop();
          },
          child: Text('Save', style: IrisTheme.labelMedium.copyWith(
            color: LuxuryColors.jadePremium,
            fontWeight: IrisTheme.weightSemiBold,
          )),
        ),
      ],
    );
  }

  Widget _buildField(String label, TextEditingController controller, bool isDark, {int maxLines = 1}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      style: TextStyle(
        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
      ),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: LuxuryColors.textMuted),
        filled: true,
        fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: LuxuryColors.champagneGold),
        ),
      ),
    );
  }
}
