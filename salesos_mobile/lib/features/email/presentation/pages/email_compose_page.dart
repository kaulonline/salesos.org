import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/email_service.dart';
import '../widgets/template_picker.dart';

class EmailComposePage extends ConsumerStatefulWidget {
  final EmailTemplateModel? initialTemplate;

  const EmailComposePage({super.key, this.initialTemplate});

  @override
  ConsumerState<EmailComposePage> createState() => _EmailComposePageState();
}

class _EmailComposePageState extends ConsumerState<EmailComposePage> {
  final _toController = TextEditingController();
  final _subjectController = TextEditingController();
  final _bodyController = TextEditingController();
  bool _trackOpens = true;
  bool _trackClicks = false;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialTemplate != null) {
      _subjectController.text = widget.initialTemplate!.subject;
      _bodyController.text = widget.initialTemplate!.body;
    }
  }

  @override
  void dispose() {
    _toController.dispose();
    _subjectController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _onSend() async {
    final to = _toController.text.trim();
    final subject = _subjectController.text.trim();
    final body = _bodyController.text.trim();

    if (to.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a recipient')),
      );
      return;
    }
    if (subject.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a subject')),
      );
      return;
    }
    if (body.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a message body')),
      );
      return;
    }

    setState(() => _isSending = true);
    final service = ref.read(emailServiceProvider);
    final success = await service.sendEmail(
      to: to,
      subject: subject,
      body: body,
      trackOpens: _trackOpens,
      trackClicks: _trackClicks,
    );
    setState(() => _isSending = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Email sent successfully')),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send email')),
        );
      }
    }
  }

  Future<void> _onInsertTemplate() async {
    final template = await TemplatePicker.show(context);
    if (template != null) {
      setState(() {
        if (_subjectController.text.isEmpty) {
          _subjectController.text = template.subject;
        }
        _bodyController.text = template.body;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      context.pop();
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? IrisTheme.darkSurfaceElevated
                            : IrisTheme.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.arrow_left,
                        size: 20,
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      'Compose Email',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ),
                  // Template button
                  GestureDetector(
                    onTap: _onInsertTemplate,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.document_text_1,
                        size: 20,
                        color: LuxuryColors.champagneGold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Send button
                  IrisButton(
                    label: 'Send',
                    icon: Iconsax.send_1,
                    variant: IrisButtonVariant.emerald,
                    size: IrisButtonSize.small,
                    isLoading: _isSending,
                    onPressed: _onSend,
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms),

            // Compose form
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // To field
                    IrisTextField(
                      label: 'To',
                      hint: 'recipient@example.com',
                      controller: _toController,
                      prefixIcon: Iconsax.user,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

                    const SizedBox(height: 16),

                    // Subject field
                    IrisTextField(
                      label: 'Subject',
                      hint: 'Email subject...',
                      controller: _subjectController,
                      prefixIcon: Iconsax.text,
                      textInputAction: TextInputAction.next,
                    ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.05),

                    const SizedBox(height: 16),

                    // Body field
                    IrisTextField(
                      label: 'Message',
                      hint: 'Write your email...',
                      controller: _bodyController,
                      maxLines: 12,
                      minLines: 6,
                      textInputAction: TextInputAction.newline,
                    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.05),

                    const SizedBox(height: 20),

                    // Tracking options
                    IrisCard(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'TRACKING',
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.textMuted,
                              fontWeight: FontWeight.w500,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _TrackingToggle(
                            label: 'Track Opens',
                            subtitle: 'Know when recipient opens the email',
                            icon: Iconsax.eye,
                            value: _trackOpens,
                            onChanged: (v) =>
                                setState(() => _trackOpens = v),
                          ),
                          const SizedBox(height: 8),
                          _TrackingToggle(
                            label: 'Track Clicks',
                            subtitle: 'Monitor link clicks in the email',
                            icon: Iconsax.mouse,
                            value: _trackClicks,
                            onChanged: (v) =>
                                setState(() => _trackClicks = v),
                          ),
                        ],
                      ),
                    ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.05),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tracking toggle widget
class _TrackingToggle extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _TrackingToggle({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: value
                ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                : (isDark
                    ? IrisTheme.darkSurfaceElevated
                    : IrisTheme.lightSurfaceElevated),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            size: 18,
            color: value
                ? LuxuryColors.rolexGreen
                : LuxuryColors.textMuted,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                subtitle,
                style: IrisTheme.caption.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
              ),
            ],
          ),
        ),
        Switch.adaptive(
          value: value,
          onChanged: onChanged,
          activeTrackColor: LuxuryColors.rolexGreen,
        ),
      ],
    );
  }
}
