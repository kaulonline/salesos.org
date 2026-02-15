import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/entity_notes_section.dart';
import '../widgets/lead_form.dart';
import '../widgets/lead_score_badge.dart';
import '../widgets/lead_convert_sheet.dart';
import '../../../../shared/widgets/enrich_button.dart';

/// Provider for a single lead - autoDispose ensures fresh data
final leadDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>?, String>((ref, leadId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getLeadById(leadId);
});

class LeadDetailPage extends ConsumerStatefulWidget {
  final String leadId;

  const LeadDetailPage({super.key, required this.leadId});

  @override
  ConsumerState<LeadDetailPage> createState() => _LeadDetailPageState();
}

class _LeadDetailPageState extends ConsumerState<LeadDetailPage> {
  Future<void> _onRefresh() async {
    ref.invalidate(leadDetailProvider(widget.leadId));
  }

  void _handleEdit(Map<String, dynamic> lead) {
    LeadForm.show(
      context: context,
      initialData: lead,
      mode: IrisFormMode.edit,
      onSuccess: () {
        ref.invalidate(leadDetailProvider(widget.leadId));
      },
    );
  }

  Future<void> _handleDelete() async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
    );
    if (confirmed == true) {
      try {
        final crmService = ref.read(crmDataServiceProvider);
        await crmService.deleteLead(widget.leadId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Lead deleted successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete lead: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final leadAsync = ref.watch(leadDetailProvider(widget.leadId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Lead Details',
        showBackButton: true,
        actions: [
          leadAsync.maybeWhen(
            data: (lead) => lead != null
                ? Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          Iconsax.edit,
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        onPressed: () => _handleEdit(lead),
                        tooltip: 'Edit',
                      ),
                      IconButton(
                        icon: Icon(
                          Iconsax.trash,
                          color: IrisTheme.error,
                        ),
                        onPressed: _handleDelete,
                        tooltip: 'Delete',
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: leadAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text(
                'Failed to load lead',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(leadDetailProvider(widget.leadId)),
                child: Text('Retry', style: TextStyle(color: LuxuryColors.jadePremium)),
              ),
            ],
          ),
        ),
        data: (lead) {
          if (lead == null) {
            return Center(
              child: Text(
                'Lead not found',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _onRefresh,
            color: LuxuryColors.jadePremium,
            backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
            child: _buildLeadContent(context, lead, isDark),
          );
        },
      ),
    );
  }

  Widget _buildLeadContent(BuildContext context, Map<String, dynamic> lead, bool isDark) {
    // Parse lead data - support both local and Salesforce field names
    final firstName = lead['firstName'] as String? ?? lead['FirstName'] as String? ?? '';
    final lastName = lead['lastName'] as String? ?? lead['LastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final initials = _getInitials(firstName, lastName);
    final company = lead['company'] as String? ?? lead['Company'] as String? ?? '';
    final title = lead['title'] as String? ?? lead['Title'] as String? ?? '';
    final email = lead['email'] as String? ?? lead['Email'] as String? ?? '';
    final phone = lead['phone'] as String? ?? lead['Phone'] as String? ?? '';
    final mobilePhone = lead['mobilePhone'] as String? ?? lead['MobilePhone'] as String? ?? '';
    final status = lead['status'] as String? ?? lead['Status'] as String? ?? '';
    final rating = lead['rating'] as String? ?? lead['Rating'] as String? ?? '';
    final industry = lead['industry'] as String? ?? lead['Industry'] as String? ?? '';
    final leadSource = lead['leadSource'] as String? ?? lead['LeadSource'] as String? ?? '';
    final website = lead['website'] as String? ?? lead['Website'] as String? ?? '';
    final description = lead['description'] as String? ?? lead['Description'] as String? ?? '';
    final city = lead['city'] as String? ?? lead['City'] as String? ?? '';
    final state = lead['state'] as String? ?? lead['State'] as String? ?? '';
    final location = [city, state].where((s) => s.isNotEmpty).join(', ');
    final annualRevenue = (lead['annualRevenue'] as num?)?.toDouble() ??
        (lead['AnnualRevenue'] as num?)?.toDouble();
    final numberOfEmployees = lead['numberOfEmployees'] as int? ??
        (lead['NumberOfEmployees'] as num?)?.toInt();

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Profile Card
          IrisCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (status.isNotEmpty) _buildStatusBadge(status),
                  ],
                ),
                CircleAvatar(
                  radius: 40,
                  backgroundColor: _getRatingColor(rating).withValues(alpha: 0.2),
                  child: Text(
                    initials,
                    style: IrisTheme.headlineSmall.copyWith(
                      color: _getRatingColor(rating),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  fullName.isNotEmpty ? fullName : 'Unknown Lead',
                  style: IrisTheme.titleLarge.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                if (title.isNotEmpty || company.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    title.isNotEmpty
                        ? (company.isNotEmpty ? '$title at $company' : title)
                        : company,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (rating.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildRatingBadge(rating),
                ],
                const SizedBox(height: 8),
                LeadScoreBadge(score: (lead['leadScore'] as num?)?.toInt() ?? (lead['score'] as num?)?.toInt() ?? 0),
                const SizedBox(height: 20),
                // Action Buttons - 5 colorful buttons matching Dribbble design
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _ActionButton(
                      icon: Iconsax.message,
                      label: 'Message',
                      color: IrisTheme.accentBlueLight,
                      onTap: () => _launchSms(mobilePhone.isNotEmpty ? mobilePhone : phone),
                    ),
                    _ActionButton(
                      icon: Iconsax.call,
                      label: 'Call',
                      color: IrisTheme.success,
                      onTap: () => _launchPhone(phone.isNotEmpty ? phone : mobilePhone),
                    ),
                    _ActionButton(
                      icon: Iconsax.video,
                      label: 'Video',
                      color: LuxuryColors.jadePremium,
                      onTap: () => _handleVideoCall(email),
                    ),
                    _ActionButton(
                      icon: Iconsax.sms,
                      label: 'Email',
                      color: IrisTheme.accentTealLight,
                      onTap: () => _launchEmail(email),
                    ),
                    _ActionButton(
                      icon: Iconsax.calendar,
                      label: 'Schedule',
                      color: LuxuryColors.champagneGoldDark,
                      onTap: () => _handleScheduleMeeting(lead),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Contact Info
          IrisCard(
            padding: EdgeInsets.zero,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (email.isNotEmpty)
                  _InfoRow(icon: Iconsax.sms, label: 'Email', value: email),
                if (phone.isNotEmpty)
                  _InfoRow(icon: Iconsax.call, label: 'Phone', value: phone),
                if (mobilePhone.isNotEmpty && mobilePhone != phone)
                  _InfoRow(icon: Iconsax.mobile, label: 'Mobile', value: mobilePhone),
                if (location.isNotEmpty)
                  _InfoRow(icon: Iconsax.location, label: 'Location', value: location),
                if (website.isNotEmpty)
                  _InfoRow(icon: Iconsax.global, label: 'Website', value: website, showDivider: false),
                if (email.isEmpty && phone.isEmpty && location.isEmpty && website.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      'No contact information available',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Company Info
          if (company.isNotEmpty || industry.isNotEmpty || leadSource.isNotEmpty ||
              annualRevenue != null || numberOfEmployees != null) ...[
            Row(
              children: [
                Text(
                  'Company Info',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            IrisCard(
              padding: EdgeInsets.zero,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (company.isNotEmpty)
                    _InfoRow(icon: Iconsax.building, label: 'Company', value: company),
                  if (industry.isNotEmpty)
                    _InfoRow(icon: Iconsax.category, label: 'Industry', value: industry),
                  if (leadSource.isNotEmpty)
                    _InfoRow(icon: Iconsax.tag, label: 'Lead Source', value: leadSource),
                  if (annualRevenue != null)
                    _InfoRow(icon: Iconsax.dollar_circle, label: 'Annual Revenue', value: _formatCurrency(annualRevenue)),
                  if (numberOfEmployees != null)
                    _InfoRow(icon: Iconsax.people, label: 'Employees', value: numberOfEmployees.toString(), showDivider: description.isEmpty),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Description
          if (description.isNotEmpty) ...[
            Row(
              children: [
                Text(
                  'Description',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            IrisCard(
              child: Text(
                description,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Notes Section
          EntityNotesSection(
            entityId: lead['id'] ?? lead['Id'] ?? widget.leadId,
            entityType: 'lead',
            entityName: fullName.isNotEmpty ? fullName : 'Lead',
            isSalesforceId: (lead['Id'] as String?)?.length == 15 || (lead['Id'] as String?)?.length == 18,
          ),
          const SizedBox(height: 16),

          // Enrich Lead
          EnrichButton(
            entityId: lead['id'] as String? ?? lead['Id'] as String? ?? widget.leadId,
            entityType: 'lead',
            onEnriched: () {
              ref.invalidate(leadDetailProvider(widget.leadId));
            },
          ),
          const SizedBox(height: 16),

          // Convert Button
          IrisButton(
            label: 'Convert Lead',
            onPressed: () {
              LeadConvertSheet.show(
                context: context,
                leadId: widget.leadId,
                leadData: lead,
              );
            },
            isFullWidth: true,
            size: IrisButtonSize.large,
            icon: Iconsax.convert,
          ),

          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: IrisTheme.labelSmall.copyWith(
          color: _getStatusColor(status),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildRatingBadge(String rating) {
    final color = _getRatingColor(rating);
    final icon = _getRatingIcon(rating);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            '$rating Rating',
            style: IrisTheme.labelMedium.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _getInitials(String firstName, String lastName) {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    if (first.isEmpty && last.isEmpty) return '?';
    return '$first$last';
  }

  Color _getRatingColor(String rating) {
    final normalized = rating.toLowerCase();
    if (normalized == 'hot') return IrisTheme.error;
    if (normalized == 'warm') return IrisTheme.warning;
    if (normalized == 'cold') return IrisTheme.info;
    return LuxuryColors.rolexGreen;
  }

  IconData _getRatingIcon(String rating) {
    final normalized = rating.toLowerCase();
    if (normalized == 'hot') return Iconsax.flash_1;
    if (normalized == 'warm') return Iconsax.sun_1;
    if (normalized == 'cold') return Iconsax.cloud;
    return Iconsax.star;
  }

  Color _getStatusColor(String status) {
    final normalized = status.toLowerCase().replaceAll(' ', '').replaceAll('-', '');
    if (normalized.contains('new') || normalized.contains('open')) return IrisTheme.info;
    if (normalized.contains('working') || normalized.contains('contacted')) return IrisTheme.warning;
    if (normalized.contains('qualified')) return IrisTheme.success;
    if (normalized.contains('unqualified') || normalized.contains('closed')) return IrisTheme.error;
    // Use a neutral gray that works in both light and dark themes
    return LuxuryColors.neutralGray;
  }

  String _formatCurrency(double value) {
    if (value >= 1000000000) {
      return '\$${(value / 1000000000).toStringAsFixed(1)}B';
    } else if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(0)}K';
    }
    return '\$${value.toStringAsFixed(0)}';
  }

  void _launchPhone(String phone) async {
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _launchEmail(String email) async {
    if (email.isEmpty) return;
    final uri = Uri.parse('mailto:$email');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _launchSms(String phone) async {
    if (phone.isEmpty) return;
    final uri = Uri.parse('sms:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError
            ? IrisTheme.error
            : (isDark ? IrisTheme.darkSurface : LuxuryColors.rolexGreen),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _handleVideoCall(String email) {
    HapticFeedback.lightImpact();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Show centered dialog with video call options
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
            child: Container(
              margin: const EdgeInsets.all(24),
              constraints: const BoxConstraints(maxWidth: 400),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Start Video Call',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Google Meet option
                    _VideoCallOption(
                      icon: Icons.video_call,
                      label: 'Google Meet',
                      subtitle: 'Create new meeting',
                      color: LuxuryColors.googleMeetTeal,
                      onTap: () {
                        Navigator.pop(ctx);
                        launchUrl(
                          Uri.parse('https://meet.google.com/new'),
                          mode: LaunchMode.externalApplication,
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    // Zoom option
                    _VideoCallOption(
                      icon: Icons.videocam,
                      label: 'Zoom',
                      subtitle: 'Open Zoom app',
                      color: LuxuryColors.zoomBlue,
                      onTap: () async {
                        Navigator.pop(ctx);
                        final zoomUri = Uri.parse('zoomus://');
                        if (await canLaunchUrl(zoomUri)) {
                          await launchUrl(zoomUri);
                        } else {
                          await launchUrl(
                            Uri.parse('https://zoom.us/start/videomeeting'),
                            mode: LaunchMode.externalApplication,
                          );
                        }
                      },
                    ),
                    if (email.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      // FaceTime option (iOS only)
                      _VideoCallOption(
                        icon: Icons.face_retouching_natural,
                        label: 'FaceTime',
                        subtitle: 'iOS only - $email',
                        color: LuxuryColors.faceTimeGreen,
                        onTap: () async {
                          Navigator.pop(ctx);
                          final facetimeUri = Uri.parse('facetime:$email');
                          if (await canLaunchUrl(facetimeUri)) {
                            await launchUrl(facetimeUri);
                          } else {
                            _showSnackBar('FaceTime is only available on iOS devices');
                          }
                        },
                      ),
                    ],
                    const SizedBox(height: 12),
                  ],
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

  Future<void> _handleScheduleMeeting(Map<String, dynamic> lead) async {
    HapticFeedback.lightImpact();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final firstName = lead['firstName'] as String? ?? lead['FirstName'] as String? ?? '';
    final lastName = lead['lastName'] as String? ?? lead['LastName'] as String? ?? '';
    final leadName = '$firstName $lastName'.trim();

    // Show date picker
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.fromSeed(
              seedColor: LuxuryColors.rolexGreen,
              brightness: isDark ? Brightness.dark : Brightness.light,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedDate == null || !mounted) return;

    // Show time picker
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.fromSeed(
              seedColor: LuxuryColors.rolexGreen,
              brightness: isDark ? Brightness.dark : Brightness.light,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedTime == null || !mounted) return;

    // Combine date and time
    final scheduledDateTime = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    try {
      final crmService = ref.read(crmDataServiceProvider);
      await crmService.createActivity({
        'type': 'meeting',
        'subject': 'Meeting with $leadName',
        'startTime': scheduledDateTime.toIso8601String(),
        'endTime': scheduledDateTime.add(const Duration(hours: 1)).toIso8601String(),
        'whoId': widget.leadId,
        'description': 'Scheduled meeting with lead: $leadName',
      });

      if (mounted) {
        final formattedDate = '${pickedDate.day}/${pickedDate.month}/${pickedDate.year}';
        final formattedTime = '${pickedTime.hour.toString().padLeft(2, '0')}:${pickedTime.minute.toString().padLeft(2, '0')}';
        _showSnackBar('Meeting scheduled for $formattedDate at $formattedTime');
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Failed to schedule meeting: $e', isError: true);
      }
    }
  }

}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final buttonColor = color ?? LuxuryColors.rolexGreen;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: buttonColor.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(
                color: buttonColor.withValues(alpha: 0.3),
                width: 1.5,
              ),
            ),
            child: Icon(
              icon,
              color: buttonColor,
              size: 20,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool showDivider;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(
                icon,
                size: 18,
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (showDivider)
          Divider(
            height: 1,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
      ],
    );
  }
}

class _VideoCallOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _VideoCallOption({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ],
        ),
      ),
    );
  }
}
