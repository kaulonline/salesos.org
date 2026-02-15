import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../core/services/ai_email_draft_service.dart';

/// Email Draft Bottom Sheet - displays AI-generated email for review and editing
class EmailDraftSheet extends ConsumerStatefulWidget {
  final String entityType;
  final String entityId;
  final String entityName;
  final String? entityEmail;
  final EmailType? initialEmailType;

  const EmailDraftSheet({
    super.key,
    required this.entityType,
    required this.entityId,
    required this.entityName,
    this.entityEmail,
    this.initialEmailType,
  });

  @override
  ConsumerState<EmailDraftSheet> createState() => _EmailDraftSheetState();
}

class _EmailDraftSheetState extends ConsumerState<EmailDraftSheet> {
  late TextEditingController _subjectController;
  late TextEditingController _bodyController;
  late EmailType _selectedEmailType;
  bool _isLoading = true;
  bool _isSending = false;
  String? _error;
  EmailDraft? _draft;

  @override
  void initState() {
    super.initState();
    _subjectController = TextEditingController();
    _bodyController = TextEditingController();
    _selectedEmailType = widget.initialEmailType ?? EmailType.followUp;
    _generateDraft();
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _generateDraft() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(aiEmailDraftServiceProvider);
      final draft = await service.generateDraft(
        entityType: widget.entityType,
        entityId: widget.entityId,
        entityName: widget.entityName,
        entityEmail: widget.entityEmail,
        emailType: _selectedEmailType,
      );

      setState(() {
        _draft = draft;
        _subjectController.text = draft.subject;
        _bodyController.text = draft.body;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to generate email draft';
        _isLoading = false;
      });
    }
  }

  Future<void> _sendEmail() async {
    if (_draft == null) return;

    setState(() {
      _isSending = true;
    });

    try {
      final service = ref.read(aiEmailDraftServiceProvider);
      final updatedDraft = _draft!.copyWith(
        subject: _subjectController.text,
        body: _bodyController.text,
      );

      final success = await service.sendDraft(updatedDraft);

      if (success) {
        HapticFeedback.mediumImpact();
        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Email sent successfully'),
              backgroundColor: IrisTheme.success,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } else {
        setState(() {
          _error = 'Failed to send email';
          _isSending = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to send email';
        _isSending = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
        maxWidth: 500,
      ),
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 30,
            spreadRadius: 5,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 20),
          // Header
          _buildHeader(isDark),
          const SizedBox(height: 16),
          Divider(
            height: 1,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
          // Content
          Flexible(
            child: _isLoading
                ? _buildLoadingState(isDark)
                : _error != null
                    ? _buildErrorState(isDark)
                    : _buildContent(isDark),
          ),
          // Bottom actions
          if (!_isLoading && _error == null) _buildBottomActions(isDark),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: IrisTheme.goldGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Iconsax.sms,
              color: Colors.black,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Compose Email',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: IrisTheme.weightSemiBold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'AI',
                        style: IrisTheme.caption.copyWith(
                          color: LuxuryColors.champagneGold,
                          fontWeight: IrisTheme.weightBold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'To: ${widget.entityName}',
                  style: IrisTheme.caption.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(
              Iconsax.close_circle,
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: LuxuryColors.champagneGold),
            const SizedBox(height: 20),
            Text(
              'Generating email draft...',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'AI is crafting a personalized message',
              style: IrisTheme.caption.copyWith(
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

  Widget _buildErrorState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Iconsax.warning_2,
              size: 48,
              color: IrisTheme.warning.withValues(alpha: 0.7),
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'An error occurred',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _generateDraft,
              icon: const Icon(Iconsax.refresh, size: 18),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: LuxuryColors.champagneGold,
                foregroundColor: Colors.black,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Email type selector
          _buildEmailTypeSelector(isDark),
          const SizedBox(height: 20),
          // Subject field
          _buildTextField(
            controller: _subjectController,
            label: 'Subject',
            isDark: isDark,
            maxLines: 1,
          ).animate().fadeIn(delay: 100.ms),
          const SizedBox(height: 16),
          // Body field
          _buildTextField(
            controller: _bodyController,
            label: 'Message',
            isDark: isDark,
            maxLines: 12,
            minLines: 6,
          ).animate().fadeIn(delay: 150.ms),
          const SizedBox(height: 16),
          // Tips section
          _buildTips(isDark).animate().fadeIn(delay: 200.ms),
        ],
      ),
    );
  }

  Widget _buildEmailTypeSelector(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Email Type',
          style: IrisTheme.labelMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: EmailType.values.length,
            separatorBuilder: (context, i) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final type = EmailType.values[index];
              final isSelected = type == _selectedEmailType;
              return GestureDetector(
                onTap: () {
                  if (!isSelected) {
                    setState(() {
                      _selectedEmailType = type;
                    });
                    _generateDraft();
                  }
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? LuxuryColors.champagneGold
                        : (isDark
                            ? IrisTheme.darkSurfaceElevated
                            : IrisTheme.lightSurfaceElevated),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isSelected
                          ? LuxuryColors.champagneGold
                          : (isDark
                              ? IrisTheme.darkBorder
                              : IrisTheme.lightBorder),
                    ),
                  ),
                  child: Text(
                    type.label,
                    style: IrisTheme.labelSmall.copyWith(
                      color: isSelected
                          ? Colors.black
                          : (isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary),
                      fontWeight:
                          isSelected ? IrisTheme.weightSemiBold : null,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required bool isDark,
    int maxLines = 1,
    int minLines = 1,
  }) {
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
        TextField(
          controller: controller,
          maxLines: maxLines,
          minLines: minLines,
          style: IrisTheme.bodyMedium.copyWith(
            color:
                isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark
                ? IrisTheme.darkSurfaceElevated
                : IrisTheme.lightSurfaceElevated,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: LuxuryColors.champagneGold,
                width: 1.5,
              ),
            ),
            contentPadding: const EdgeInsets.all(14),
          ),
        ),
      ],
    );
  }

  Widget _buildTips(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: IrisTheme.info.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: IrisTheme.info.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Iconsax.magic_star,
            size: 18,
            color: IrisTheme.info,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Tips',
                  style: IrisTheme.labelSmall.copyWith(
                    color: IrisTheme.info,
                    fontWeight: IrisTheme.weightSemiBold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'This draft was personalized based on your CRM data. Feel free to edit before sending.',
                  style: IrisTheme.caption.copyWith(
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
    );
  }

  Widget _buildBottomActions(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
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
          // Regenerate button
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _isLoading ? null : _generateDraft,
              icon: const Icon(Iconsax.refresh, size: 18),
              label: const Text('Regenerate'),
              style: OutlinedButton.styleFrom(
                foregroundColor: LuxuryColors.champagneGold,
                side: const BorderSide(color: LuxuryColors.champagneGold),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Send button
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: _isSending ||
                      widget.entityEmail == null ||
                      widget.entityEmail!.isEmpty
                  ? null
                  : _sendEmail,
              icon: _isSending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.black,
                      ),
                    )
                  : const Icon(Iconsax.send_1, size: 18),
              label: Text(_isSending ? 'Sending...' : 'Send Email'),
              style: ElevatedButton.styleFrom(
                backgroundColor: LuxuryColors.champagneGold,
                foregroundColor: Colors.black,
                disabledBackgroundColor: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Show the email draft dialog
Future<bool?> showEmailDraftSheet(
  BuildContext context, {
  required String entityType,
  required String entityId,
  required String entityName,
  String? entityEmail,
  EmailType? initialEmailType,
}) {
  HapticFeedback.mediumImpact();
  return showGeneralDialog<bool>(
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
            child: EmailDraftSheet(
              entityType: entityType,
              entityId: entityId,
              entityName: entityName,
              entityEmail: entityEmail,
              initialEmailType: initialEmailType,
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
