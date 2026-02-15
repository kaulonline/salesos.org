import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/deal_health_indicator.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/entity_notes_section.dart';
import '../widgets/deal_form.dart';
import '../widgets/buyer_committee_section.dart';
import '../widgets/deal_score_card.dart';
import '../widgets/deal_actions_sheet.dart';
import '../widgets/competitor_tags.dart';
import '../../../../features/playbooks/presentation/widgets/playbook_mini_widget.dart';

/// Provider for a single opportunity/deal - autoDispose ensures fresh data
final opportunityDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>?, String>((ref, dealId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getOpportunityById(dealId);
});

/// Provider for opportunity activities - autoDispose ensures fresh data
final opportunityActivitiesProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, dealId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getOpportunityActivities(dealId);
});

class DealDetailPage extends ConsumerStatefulWidget {
  final String dealId;
  final String? initialAction;

  const DealDetailPage({super.key, required this.dealId, this.initialAction});

  @override
  ConsumerState<DealDetailPage> createState() => _DealDetailPageState();
}

class _DealDetailPageState extends ConsumerState<DealDetailPage> {
  bool _hasHandledInitialAction = false;

  Future<void> _onRefresh() async {
    ref.invalidate(opportunityDetailProvider(widget.dealId));
    ref.invalidate(opportunityActivitiesProvider(widget.dealId));
  }

  void _handleInitialAction(Map<String, dynamic> deal) {
    if (_hasHandledInitialAction || widget.initialAction == null) return;
    _hasHandledInitialAction = true;

    // Handle the action after the current frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      switch (widget.initialAction) {
        case 'edit_close_date':
          // Show edit form focused on close date
          _handleEdit(deal, focusField: 'closeDate');
          break;
        default:
          // Unknown action, just show the page normally
          break;
      }
    });
  }

  void _handleEdit(Map<String, dynamic> deal, {String? focusField}) {
    DealForm.show(
      context: context,
      initialData: deal,
      mode: IrisFormMode.edit,
      focusField: focusField,
      onSuccess: () {
        ref.invalidate(opportunityDetailProvider(widget.dealId));
      },
    );
  }

  Future<void> _handleDelete() async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Deal',
      message: 'Are you sure you want to delete this deal? This action cannot be undone.',
    );
    if (confirmed == true) {
      try {
        final crmService = ref.read(crmDataServiceProvider);
        await crmService.deleteOpportunity(widget.dealId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Deal deleted successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete deal: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  void _showSnackBar(BuildContext context, String message, {bool isError = false}) {
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

  Future<void> _handleCallAction(Map<String, dynamic> deal) async {
    HapticFeedback.lightImpact();

    // Try to get contact phone from deal data
    final contactPhone = deal['contactPhone'] as String? ??
        (deal['contact'] as Map?)?['phone'] as String? ??
        (deal['Contact'] as Map?)?['Phone'] as String? ??
        (deal['Account'] as Map?)?['Phone'] as String? ??
        deal['phone'] as String?;

    if (contactPhone != null && contactPhone.isNotEmpty) {
      final phoneUri = Uri(scheme: 'tel', path: contactPhone);
      if (await canLaunchUrl(phoneUri)) {
        await launchUrl(phoneUri);
      } else {
        if (mounted) {
          _showSnackBar(context, 'Could not open phone app', isError: true);
        }
      }
    } else {
      if (mounted) {
        _showSnackBar(context, 'No contact phone number available', isError: true);
      }
    }
  }

  Future<void> _handleEmailAction(Map<String, dynamic> deal) async {
    HapticFeedback.lightImpact();

    // Try to get contact email from deal data
    final contactEmail = deal['contactEmail'] as String? ??
        (deal['contact'] as Map?)?['email'] as String? ??
        (deal['Contact'] as Map?)?['Email'] as String?;
    final dealName = deal['name'] as String? ?? deal['Name'] as String? ?? 'Deal';

    if (contactEmail != null && contactEmail.isNotEmpty) {
      final emailUri = Uri(
        scheme: 'mailto',
        path: contactEmail,
        queryParameters: {
          'subject': 'Re: $dealName',
        },
      );
      if (await canLaunchUrl(emailUri)) {
        await launchUrl(emailUri);
      } else {
        if (mounted) {
          _showSnackBar(context, 'Could not open email app', isError: true);
        }
      }
    } else {
      if (mounted) {
        _showSnackBar(context, 'No contact email available', isError: true);
      }
    }
  }

  Future<void> _handleNoteAction(Map<String, dynamic> deal) async {
    HapticFeedback.lightImpact();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final noteController = TextEditingController();
    final dealName = deal['name'] as String? ?? deal['Name'] as String? ?? 'Deal';

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Add Note',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        content: TextField(
          controller: noteController,
          maxLines: 4,
          autofocus: true,
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
          decoration: InputDecoration(
            hintText: 'Enter your note...',
            hintStyle: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
            filled: true,
            fillColor: isDark
                ? IrisTheme.darkBackground
                : IrisTheme.lightBackground,
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
              borderSide: BorderSide(color: LuxuryColors.jadePremium),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              if (noteController.text.trim().isNotEmpty) {
                Navigator.pop(ctx, noteController.text.trim());
              }
            },
            child: Text(
              'Save',
              style: TextStyle(color: LuxuryColors.jadePremium),
            ),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty && mounted) {
      try {
        final crmService = ref.read(crmDataServiceProvider);
        await crmService.createNote({
          'title': 'Note: $dealName',
          'body': result,
          'parentId': widget.dealId,
        });
        if (mounted) {
          _showSnackBar(context, 'Note added successfully');
          ref.invalidate(opportunityActivitiesProvider(widget.dealId));
        }
      } catch (e) {
        if (mounted) {
          _showSnackBar(context, 'Failed to save note: $e', isError: true);
        }
      }
    }
  }

  void _handleViewAllActivities() {
    HapticFeedback.lightImpact();
    // Navigate to activity page (activities are already loaded in this detail view)
    context.push(AppRoutes.activity);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dealAsync = ref.watch(opportunityDetailProvider(widget.dealId));
    final activitiesAsync = ref.watch(opportunityActivitiesProvider(widget.dealId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Deal Details',
        showBackButton: true,
        actions: [
          dealAsync.maybeWhen(
            data: (deal) => deal != null
                ? Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          Iconsax.edit,
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        onPressed: () => _handleEdit(deal),
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
      body: dealAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text(
                'Failed to load deal',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(opportunityDetailProvider(widget.dealId)),
                child: Text('Retry', style: TextStyle(color: LuxuryColors.jadePremium)),
              ),
            ],
          ),
        ),
        data: (deal) {
          if (deal == null) {
            return Center(
              child: Text(
                'Deal not found',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            );
          }

          // Handle initial action (e.g., edit_close_date from deal health actions)
          _handleInitialAction(deal);

          return RefreshIndicator(
            onRefresh: _onRefresh,
            color: LuxuryColors.jadePremium,
            backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
            child: _buildDealContent(context, ref, deal, activitiesAsync, isDark),
          );
        },
      ),
      floatingActionButton: dealAsync.maybeWhen(
        data: (deal) => deal != null
            ? FloatingActionButton(
                backgroundColor: LuxuryColors.jadePremium,
                onPressed: () {
                  HapticFeedback.lightImpact();
                  DealActionsSheet.show(
                    context: context,
                    dealId: deal['id'] as String? ?? deal['Id'] as String? ?? widget.dealId,
                    currentStage: deal['stage'] as String? ?? deal['StageName'] as String? ?? 'Unknown',
                    onActionComplete: _onRefresh,
                  );
                },
                child: const Icon(Iconsax.more, color: Colors.white),
              )
            : null,
        orElse: () => null,
      ),
    );
  }

  Widget _buildDealContent(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> deal,
    AsyncValue<List<Map<String, dynamic>>> activitiesAsync,
    bool isDark,
  ) {
    // Parse deal data - support both local and Salesforce field names
    final name = deal['name'] as String? ?? deal['Name'] as String? ?? 'Untitled Deal';
    final accountName = deal['accountName'] as String? ??
        (deal['account'] as Map?)?['name'] as String? ??
        (deal['Account'] as Map?)?['Name'] as String? ??
        '';
    final amount = (deal['amount'] as num?)?.toDouble() ??
        (deal['Amount'] as num?)?.toDouble() ?? 0;
    final stage = deal['stage'] as String? ?? deal['StageName'] as String? ?? 'Unknown';
    final probability = deal['probability'] as int? ??
        (deal['Probability'] as num?)?.toInt() ?? 0;
    final closeDate = deal['closeDate'] as String? ?? deal['CloseDate'] as String?;
    final leadSource = deal['leadSource'] as String? ?? deal['LeadSource'] as String? ?? '';
    final nextStep = deal['nextStep'] as String? ?? deal['NextStep'] as String?;
    final description = deal['description'] as String? ?? deal['Description'] as String?;
    final contactName = deal['contactName'] as String? ??
        (deal['contact'] as Map?)?['name'] as String? ?? '';

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          IrisCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Iconsax.building,
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            accountName.isNotEmpty ? accountName : 'No Account',
                            style: IrisTheme.titleLarge.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            name,
                            style: IrisTheme.bodyMedium.copyWith(
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
                const SizedBox(height: 20),
                // Amount & Stage
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Deal Value',
                            style: IrisTheme.labelSmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatCurrency(amount),
                            style: IrisTheme.headlineSmall.copyWith(
                              color: LuxuryColors.jadePremium,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _buildStageBadge(stage, isDark),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Quick Actions
          Row(
            children: [
              Expanded(
                child: IrisButton(
                  label: 'Call',
                  icon: Iconsax.call,
                  variant: IrisButtonVariant.outline,
                  onPressed: () => _handleCallAction(deal),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: IrisButton(
                  label: 'Email',
                  icon: Iconsax.sms,
                  variant: IrisButtonVariant.outline,
                  onPressed: () => _handleEmailAction(deal),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: IrisButton(
                  label: 'Note',
                  icon: Iconsax.note,
                  variant: IrisButtonVariant.outline,
                  onPressed: () => _handleNoteAction(deal),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Health Section
          _buildHealthSection(context, deal, isDark),

          const SizedBox(height: 24),

          // Deal Score Card
          DealScoreCard(score: (deal['dealScore'] as num?)?.toInt() ?? (deal['probability'] as num?)?.toInt() ?? (deal['Probability'] as num?)?.toInt() ?? 0),

          const SizedBox(height: 24),

          // Competitor Tags
          CompetitorTags(competitors: (deal['competitors'] as List<dynamic>?)?.cast<String>() ?? []),

          const SizedBox(height: 24),

          // Buyer Committee
          BuyerCommitteeSection(dealId: deal['id'] as String? ?? deal['Id'] as String? ?? widget.dealId),

          const SizedBox(height: 24),

          // Active Playbook Progress
          PlaybookMiniWidget(playbookId: deal['playbookId'] as String?),

          const SizedBox(height: 24),

          // Details Section
          Text(
            'Details',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),
          IrisCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _DetailRow(
                  icon: Iconsax.calendar,
                  label: 'Close Date',
                  value: closeDate != null ? _formatDate(closeDate) : 'Not set',
                ),
                if (contactName.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.user,
                    label: 'Contact',
                    value: contactName,
                  ),
                _DetailRow(
                  icon: Iconsax.chart_2,
                  label: 'Probability',
                  value: '$probability%',
                ),
                if (leadSource.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.tag,
                    label: 'Source',
                    value: leadSource,
                  ),
                if (nextStep != null && nextStep.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.arrow_right,
                    label: 'Next Step',
                    value: nextStep,
                    showDivider: description == null || description.isEmpty,
                  ),
                if (description != null && description.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.document_text,
                    label: 'Description',
                    value: description.length > 50
                        ? '${description.substring(0, 50)}...'
                        : description,
                    showDivider: false,
                  ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Activity Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Activity',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
              TextButton(
                onPressed: _handleViewAllActivities,
                child: Text(
                  'See All',
                  style: IrisTheme.labelMedium.copyWith(
                    color: LuxuryColors.jadePremium,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildActivitiesSection(activitiesAsync, isDark),

          const SizedBox(height: 24),

          // Notes Section
          Text(
            'Notes',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),
          EntityNotesSection(
            entityId: deal['id'] as String? ?? deal['Id'] as String? ?? widget.dealId,
            entityType: 'opportunity',
            entityName: name,
            isSalesforceId: ((deal['Id'] as String?)?.length == 15 || (deal['Id'] as String?)?.length == 18),
          ),

          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildStageBadge(String stage, bool isDark) {
    final stageColor = _getStageColor(stage);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: stageColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        stage,
        style: IrisTheme.labelMedium.copyWith(
          color: stageColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getStageColor(String stage) {
    final normalized = stage.toLowerCase().replaceAll(' ', '').replaceAll('_', '').replaceAll('/', '');
    if (normalized.contains('prospecting')) return IrisTheme.stageProspecting;
    if (normalized.contains('qualification') || normalized.contains('qualified')) {
      return IrisTheme.stageQualified;
    }
    if (normalized.contains('needsanalysis')) return IrisTheme.stageQualified;
    if (normalized.contains('valueproposition')) return IrisTheme.stageProposal;
    if (normalized.contains('decisionmakers') || normalized.contains('iddecisionmakers')) {
      return IrisTheme.stageProposal;
    }
    if (normalized.contains('perceptionanalysis')) return IrisTheme.stageNegotiation;
    if (normalized.contains('proposal')) return IrisTheme.stageProposal;
    if (normalized.contains('negotiat')) return IrisTheme.stageNegotiation;
    if (normalized.contains('closedwon') || normalized.contains('won')) {
      return IrisTheme.success;
    }
    if (normalized.contains('closedlost') || normalized.contains('lost')) {
      return IrisTheme.error;
    }
    return IrisTheme.stageQualified;
  }

  Widget _buildHealthSection(BuildContext context, Map<String, dynamic> deal, bool isDark) {
    // Check if deal is closed - skip health section for closed deals
    final stage = deal['stage'] as String? ?? deal['StageName'] as String? ?? '';
    final normalizedStage = stage.toLowerCase().replaceAll(' ', '');
    if (normalizedStage.contains('closedwon') || normalizedStage.contains('closedlost') ||
        normalizedStage.contains('won') || normalizedStage.contains('lost')) {
      return const SizedBox.shrink();
    }

    final healthData = DealHealthData.fromDeal(deal);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Deal Health',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
            CompactDealHealthIndicator(
              health: healthData,
              showVelocity: true,
            ),
          ],
        ).animate(delay: 50.ms).fadeIn(),
        const SizedBox(height: 12),
        // Enhanced health card with Next Best Action and Recommended Actions
        EnhancedDealHealthCard(
          health: healthData,
          deal: deal,
          showNextBestAction: true,
          showRecommendedActions: true,
          onActionTap: (action) {
            HapticFeedback.lightImpact();
            // Handle action tap - navigate to appropriate action route
            if (action.actionRoute != null) {
              context.push(action.actionRoute!);
            } else {
              // Show a snackbar for actions without specific routes
              _showSnackBar(context, 'Action: ${action.title}');
            }
          },
        ),
      ],
    );
  }

  Widget _buildActivitiesSection(
    AsyncValue<List<Map<String, dynamic>>> activitiesAsync,
    bool isDark,
  ) {
    return activitiesAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (_, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Text(
            'Failed to load activities',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ),
      ),
      data: (activities) {
        if (activities.isEmpty) {
          return IrisCard(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Icon(
                      Iconsax.activity,
                      size: 32,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'No recent activity',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return _ActivityTimeline(activities: activities, isDark: isDark);
      },
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(0)}K';
    }
    return '\$${value.toStringAsFixed(0)}';
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('MMM d, yyyy').format(date);
    } catch (e) {
      return dateString;
    }
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool showDivider;

  const _DetailRow({
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                icon,
                size: 18,
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 110,
                child: Text(
                  label,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  value,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.left,
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
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

class _ActivityTimeline extends StatelessWidget {
  final List<Map<String, dynamic>> activities;
  final bool isDark;

  const _ActivityTimeline({required this.activities, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: activities.asMap().entries.map((entry) {
        final index = entry.key;
        final activity = entry.value;
        final isLast = index == activities.length - 1;

        // Parse activity data - support both local and Salesforce field names
        final activityType = activity['activityType'] as String? ??
            activity['type'] as String? ?? 'task';
        final subject = activity['subject'] as String? ??
            activity['Subject'] as String? ??
            activity['title'] as String? ?? 'Activity';
        final createdDate = activity['createdDate'] as String? ??
            activity['CreatedDate'] as String? ?? '';

        final iconData = _getActivityIcon(activityType);
        final color = _getActivityColor(activityType);

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    iconData,
                    size: 14,
                    color: color,
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 40,
                    color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subject,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatRelativeTime(createdDate),
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      }).toList(),
    );
  }

  IconData _getActivityIcon(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('call')) return Iconsax.call;
    if (normalized.contains('email')) return Iconsax.sms;
    if (normalized.contains('meeting') || normalized.contains('event')) {
      return Iconsax.calendar;
    }
    if (normalized.contains('note')) return Iconsax.note;
    return Iconsax.task_square;
  }

  Color _getActivityColor(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('call')) return IrisTheme.success;
    if (normalized.contains('email')) return IrisTheme.info;
    if (normalized.contains('meeting') || normalized.contains('event')) {
      return LuxuryColors.rolexGreen;
    }
    if (normalized.contains('note')) return IrisTheme.warning;
    return IrisTheme.stageQualified;
  }

  String _formatRelativeTime(String dateString) {
    if (dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inDays == 0) return 'Today';
      if (diff.inDays == 1) return 'Yesterday';
      if (diff.inDays < 7) return '${diff.inDays} days ago';
      if (diff.inDays < 30) return '${(diff.inDays / 7).floor()} week(s) ago';
      if (diff.inDays < 365) return '${(diff.inDays / 30).floor()} month(s) ago';
      return DateFormat('MMM d, yyyy').format(date);
    } catch (e) {
      return dateString;
    }
  }
}
