import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/network/api_client.dart';

/// Lead conversion wizard bottom sheet
///
/// A multi-step wizard to convert a lead into:
/// 1. An Account (from lead company)
/// 2. A Contact (from lead name/email)
/// 3. Optionally, an Opportunity
class LeadConvertSheet extends ConsumerStatefulWidget {
  final String leadId;
  final Map<String, dynamic> leadData;

  const LeadConvertSheet({
    super.key,
    required this.leadId,
    required this.leadData,
  });

  /// Show the lead conversion wizard
  static Future<void> show({
    required BuildContext context,
    required String leadId,
    required Map<String, dynamic> leadData,
  }) {
    HapticFeedback.mediumImpact();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (sheetContext) => LeadConvertSheet(
        leadId: leadId,
        leadData: leadData,
      ),
    );
  }

  @override
  ConsumerState<LeadConvertSheet> createState() => _LeadConvertSheetState();
}

class _LeadConvertSheetState extends ConsumerState<LeadConvertSheet> {
  int _currentStep = 0;
  bool _isConverting = false;
  bool _createOpportunity = true;

  // Step 1: Account
  late final TextEditingController _accountNameController;
  late final TextEditingController _accountWebsiteController;
  late final TextEditingController _accountIndustryController;

  // Step 2: Contact
  late final TextEditingController _contactNameController;
  late final TextEditingController _contactEmailController;
  late final TextEditingController _contactPhoneController;
  late final TextEditingController _contactTitleController;

  // Step 3: Opportunity
  late final TextEditingController _opportunityNameController;
  late final TextEditingController _opportunityAmountController;

  @override
  void initState() {
    super.initState();
    final lead = widget.leadData;

    // Pre-fill from lead data
    final firstName = lead['firstName'] as String? ?? '';
    final lastName = lead['lastName'] as String? ?? '';
    final fullName = lead['name'] as String? ??
        '$firstName $lastName'.trim();
    final company = lead['company'] as String? ??
        lead['companyName'] as String? ?? '';
    final email = lead['email'] as String? ?? '';
    final phone = lead['phone'] as String? ?? '';
    final title = lead['title'] as String? ?? '';
    final website = lead['website'] as String? ?? '';
    final industry = lead['industry'] as String? ?? '';

    _accountNameController = TextEditingController(text: company);
    _accountWebsiteController = TextEditingController(text: website);
    _accountIndustryController = TextEditingController(text: industry);

    _contactNameController = TextEditingController(text: fullName);
    _contactEmailController = TextEditingController(text: email);
    _contactPhoneController = TextEditingController(text: phone);
    _contactTitleController = TextEditingController(text: title);

    _opportunityNameController = TextEditingController(
      text: company.isNotEmpty ? '$company - New Opportunity' : 'New Opportunity',
    );
    _opportunityAmountController = TextEditingController();
  }

  @override
  void dispose() {
    _accountNameController.dispose();
    _accountWebsiteController.dispose();
    _accountIndustryController.dispose();
    _contactNameController.dispose();
    _contactEmailController.dispose();
    _contactPhoneController.dispose();
    _contactTitleController.dispose();
    _opportunityNameController.dispose();
    _opportunityAmountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.2)
                        : Colors.black.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Icon(
                        Iconsax.convert_3d_cube,
                        size: 20,
                        color: LuxuryColors.rolexGreen,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Convert Lead',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                          ),
                        ),
                        Text(
                          'Step ${_currentStep + 1} of 3',
                          style: IrisTheme.caption.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _isConverting ? null : () => Navigator.of(context).pop(),
                    icon: Icon(
                      Iconsax.close_circle,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.5)
                          : Colors.black.withValues(alpha: 0.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Progress indicator
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _buildProgressIndicator(isDark),
            ),
            const SizedBox(height: 20),

            // Step content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: _buildStepContent(isDark),
                ),
              ),
            ),

            // Bottom buttons
            Padding(
              padding: const EdgeInsets.all(24),
              child: _buildBottomButtons(isDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressIndicator(bool isDark) {
    return Row(
      children: List.generate(3, (index) {
        final isActive = index <= _currentStep;
        final isCompleted = index < _currentStep;

        return Expanded(
          child: Row(
            children: [
              // Step circle
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isCompleted
                      ? LuxuryColors.rolexGreen
                      : (isActive
                          ? LuxuryColors.champagneGold
                          : (isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.black.withValues(alpha: 0.06))),
                  border: Border.all(
                    color: isActive
                        ? (isCompleted
                            ? LuxuryColors.rolexGreen
                            : LuxuryColors.champagneGold)
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: Center(
                  child: isCompleted
                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                      : Text(
                          '${index + 1}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isActive
                                ? (isDark
                                    ? LuxuryColors.richBlack
                                    : Colors.white)
                                : LuxuryColors.textMuted,
                          ),
                        ),
                ),
              ),
              // Connector line
              if (index < 2)
                Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    color: index < _currentStep
                        ? LuxuryColors.rolexGreen
                        : (isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.black.withValues(alpha: 0.06)),
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildStepContent(bool isDark) {
    switch (_currentStep) {
      case 0:
        return _buildAccountStep(isDark);
      case 1:
        return _buildContactStep(isDark);
      case 2:
        return _buildOpportunityStep(isDark);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildAccountStep(bool isDark) {
    return Column(
      key: const ValueKey('account_step'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStepHeader(
          'Create Account',
          'Account will be created from the lead company information',
          Iconsax.buildings,
          LuxuryColors.infoCobalt,
          isDark,
        ),
        const SizedBox(height: 20),
        _buildTextField(
          _accountNameController,
          'Account Name',
          'Company name',
          Iconsax.buildings,
          isDark,
        ),
        const SizedBox(height: 12),
        _buildTextField(
          _accountWebsiteController,
          'Website',
          'https://example.com',
          Iconsax.global,
          isDark,
          keyboardType: TextInputType.url,
        ),
        const SizedBox(height: 12),
        _buildTextField(
          _accountIndustryController,
          'Industry',
          'Technology, Healthcare, etc.',
          Iconsax.category,
          isDark,
        ),
        const SizedBox(height: 16),
      ],
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.03);
  }

  Widget _buildContactStep(bool isDark) {
    return Column(
      key: const ValueKey('contact_step'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStepHeader(
          'Create Contact',
          'Contact will be linked to the new account',
          Iconsax.user,
          LuxuryColors.rolexGreen,
          isDark,
        ),
        const SizedBox(height: 20),
        _buildTextField(
          _contactNameController,
          'Full Name',
          'John Smith',
          Iconsax.user,
          isDark,
        ),
        const SizedBox(height: 12),
        _buildTextField(
          _contactEmailController,
          'Email',
          'john@company.com',
          Iconsax.sms,
          isDark,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 12),
        _buildTextField(
          _contactPhoneController,
          'Phone',
          '+1 (555) 000-0000',
          Iconsax.call,
          isDark,
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 12),
        _buildTextField(
          _contactTitleController,
          'Job Title',
          'VP of Sales',
          Iconsax.briefcase,
          isDark,
        ),
        const SizedBox(height: 16),
      ],
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.03);
  }

  Widget _buildOpportunityStep(bool isDark) {
    return Column(
      key: const ValueKey('opportunity_step'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStepHeader(
          'Create Opportunity',
          'Optionally create a new deal from this lead',
          Iconsax.money_recive,
          LuxuryColors.champagneGold,
          isDark,
        ),
        const SizedBox(height: 16),

        // Toggle
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.02),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.06),
            ),
          ),
          child: Row(
            children: [
              const Icon(
                Iconsax.money_recive,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Create an opportunity',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Switch(
                value: _createOpportunity,
                onChanged: (val) => setState(() => _createOpportunity = val),
                activeThumbColor: LuxuryColors.champagneGold,
              ),
            ],
          ),
        ),

        if (_createOpportunity) ...[
          const SizedBox(height: 16),
          _buildTextField(
            _opportunityNameController,
            'Opportunity Name',
            'New deal name',
            Iconsax.money_recive,
            isDark,
          ),
          const SizedBox(height: 12),
          _buildTextField(
            _opportunityAmountController,
            'Amount',
            '0.00',
            Iconsax.dollar_circle,
            isDark,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
        ],

        const SizedBox(height: 16),
      ],
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.03);
  }

  Widget _buildStepHeader(
    String title,
    String subtitle,
    IconData icon,
    Color color,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.1 : 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 22, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: IrisTheme.caption.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    String hint,
    IconData icon,
    bool isDark, {
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: TextStyle(
        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
        fontSize: 14,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, size: 18),
        labelStyle: TextStyle(color: LuxuryColors.textMuted),
        hintStyle: TextStyle(
          color: isDark
              ? IrisTheme.darkTextTertiary
              : IrisTheme.lightTextTertiary,
        ),
      ),
    );
  }

  Widget _buildBottomButtons(bool isDark) {
    return Row(
      children: [
        // Back button
        if (_currentStep > 0)
          Expanded(
            child: OutlinedButton(
              onPressed: _isConverting
                  ? null
                  : () => setState(() => _currentStep--),
              style: OutlinedButton.styleFrom(
                foregroundColor: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                side: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.2)
                      : Colors.black.withValues(alpha: 0.15),
                ),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Back'),
            ),
          ),

        if (_currentStep > 0) const SizedBox(width: 12),

        // Next / Convert button
        Expanded(
          flex: 2,
          child: ElevatedButton(
            onPressed: _isConverting ? null : _handleNext,
            style: ElevatedButton.styleFrom(
              backgroundColor: _currentStep == 2
                  ? LuxuryColors.rolexGreen
                  : LuxuryColors.champagneGold,
              foregroundColor: _currentStep == 2
                  ? Colors.white
                  : LuxuryColors.richBlack,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              disabledBackgroundColor: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.08),
            ),
            child: _isConverting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    _currentStep == 2 ? 'Convert Lead' : 'Next',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
          ),
        ),
      ],
    );
  }

  void _handleNext() {
    if (_currentStep < 2) {
      setState(() => _currentStep++);
      return;
    }

    // Final step - perform conversion
    _performConversion();
  }

  Future<void> _performConversion() async {
    setState(() => _isConverting = true);

    try {
      final api = ref.read(apiClientProvider);

      final convertData = {
        'account': {
          'name': _accountNameController.text.trim(),
          'website': _accountWebsiteController.text.trim(),
          'industry': _accountIndustryController.text.trim(),
        },
        'contact': {
          'name': _contactNameController.text.trim(),
          'email': _contactEmailController.text.trim(),
          'phone': _contactPhoneController.text.trim(),
          'title': _contactTitleController.text.trim(),
        },
        if (_createOpportunity)
          'opportunity': {
            'name': _opportunityNameController.text.trim(),
            'amount': double.tryParse(
                    _opportunityAmountController.text.trim()) ??
                0,
          },
      };

      final response = await api.post(
        '/leads/${widget.leadId}/convert',
        data: convertData,
      );

      if (mounted) {
        Navigator.of(context).pop();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lead converted successfully!'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );

        // Navigate to the newly created contact
        final responseData = response.data;
        final contactId = responseData is Map
            ? (responseData['contactId'] as String? ??
                responseData['contact']?['id'] as String?)
            : null;

        if (contactId != null && context.mounted) {
          context.push('${AppRoutes.contacts}/$contactId');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isConverting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Conversion failed: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }
}
