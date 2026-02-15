import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/engagement_gauge.dart';
import '../../../../shared/widgets/activity_timeline.dart';
import '../../../../shared/widgets/entity_notes_section.dart';
import '../widgets/contact_form.dart';

/// Provider for a single contact - autoDispose ensures fresh data
final contactDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>?, String>((ref, contactId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getContactById(contactId);
});

/// Provider for contact's related opportunities - autoDispose ensures fresh data
final contactOpportunitiesProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, contactId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getContactOpportunities(contactId);
});

/// Provider for contact's activities - autoDispose ensures fresh data
final contactActivitiesProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, contactId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getContactActivities(contactId, limit: 50);
});

class ContactDetailPage extends ConsumerStatefulWidget {
  final String contactId;

  const ContactDetailPage({super.key, required this.contactId});

  @override
  ConsumerState<ContactDetailPage> createState() => _ContactDetailPageState();
}

class _ContactDetailPageState extends ConsumerState<ContactDetailPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index != _currentTabIndex) {
        setState(() {
          _currentTabIndex = _tabController.index;
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(contactDetailProvider(widget.contactId));
    ref.invalidate(contactOpportunitiesProvider(widget.contactId));
    ref.invalidate(contactActivitiesProvider(widget.contactId));
  }

  void _handleEdit(Map<String, dynamic> contact) {
    ContactForm.show(
      context: context,
      initialData: contact,
      mode: IrisFormMode.edit,
      onSuccess: () {
        ref.invalidate(contactDetailProvider(widget.contactId));
      },
    );
  }

  Future<void> _handleDelete() async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Contact',
      message: 'Are you sure you want to delete this contact? This action cannot be undone.',
    );
    if (confirmed == true) {
      try {
        final crmService = ref.read(crmDataServiceProvider);
        await crmService.deleteContact(widget.contactId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Contact deleted successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete contact: $e'),
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
    final contactAsync = ref.watch(contactDetailProvider(widget.contactId));
    final opportunitiesAsync = ref.watch(contactOpportunitiesProvider(widget.contactId));
    final activitiesAsync = ref.watch(contactActivitiesProvider(widget.contactId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Contact',
        showBackButton: true,
        actions: [
          contactAsync.maybeWhen(
            data: (contact) => contact != null
                ? Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          Iconsax.edit,
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        onPressed: () => _handleEdit(contact),
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
      body: contactAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text(
                'Failed to load contact',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(contactDetailProvider(widget.contactId)),
                child: Text('Retry', style: TextStyle(color: LuxuryColors.jadePremium)),
              ),
            ],
          ),
        ),
        data: (contact) {
          if (contact == null) {
            return Center(
              child: Text(
                'Contact not found',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            );
          }

          // Extract contact name for FAB
          final firstName = contact['firstName'] as String? ?? contact['FirstName'] as String? ?? '';
          final lastName = contact['lastName'] as String? ?? contact['LastName'] as String? ?? '';
          final contactName = '$firstName $lastName'.trim();

          return Stack(
            children: [
              Column(
                children: [
                  // Tab Bar
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: _buildTabBar(isDark),
                  ),
                  // Tab Content
                  Expanded(
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        // Details Tab
                        RefreshIndicator(
                          onRefresh: _onRefresh,
                          color: LuxuryColors.jadePremium,
                          backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
                          child: _buildContactContent(context, contact, opportunitiesAsync, activitiesAsync, isDark),
                        ),
                        // Activity Tab
                        RefreshIndicator(
                          onRefresh: _onRefresh,
                          color: LuxuryColors.jadePremium,
                          backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
                          child: _buildActivityTab(activitiesAsync, isDark),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              // Log Activity FAB - only show on Activity tab
              if (_currentTabIndex == 1)
                Positioned(
                  right: 20,
                  bottom: 24,
                  child: _LogActivityFab(
                    contactId: widget.contactId,
                    contactName: contactName.isNotEmpty ? contactName : 'Contact',
                    onActivityLogged: _onRefresh,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTabBar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.obsidian.withValues(alpha: 0.5)
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
            width: 1,
          ),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: LuxuryColors.champagneGold,
        unselectedLabelColor: isDark
            ? IrisTheme.darkTextSecondary
            : IrisTheme.lightTextSecondary,
        labelStyle: IrisTheme.labelMedium.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: IrisTheme.labelMedium,
        padding: const EdgeInsets.all(4),
        tabs: const [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.user, size: 16),
                SizedBox(width: 8),
                Text('Details'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.activity, size: 16),
                SizedBox(width: 8),
                Text('Activity'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityTab(
    AsyncValue<List<Map<String, dynamic>>> activitiesAsync,
    bool isDark,
  ) {
    return activitiesAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text(
                'Failed to load activities',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(contactActivitiesProvider(widget.contactId)),
                child: Text('Retry', style: TextStyle(color: LuxuryColors.jadePremium)),
              ),
            ],
          ),
        ),
      ),
      data: (activities) {
        // Convert raw activities to ActivityItem list
        final activityItems = activities.map((activity) {
          final type = _parseActivityType(activity['type'] as String? ?? 'TASK');
          final subject = activity['subject'] as String? ??
              activity['title'] as String? ??
              'Activity';
          final description = activity['description'] as String?;
          final outcome = activity['outcome'] as String?;
          final duration = activity['duration'] as String?;
          final relatedTo = activity['relatedTo'] as String?;
          final dateStr = activity['activityDate'] as String? ??
              activity['createdAt'] as String?;
          final activityDate = dateStr != null
              ? DateTime.tryParse(dateStr) ?? DateTime.now()
              : DateTime.now();

          return ActivityItem(
            id: activity['id'] as String? ?? '',
            type: type,
            subject: subject,
            description: description,
            outcome: outcome,
            duration: duration,
            relatedTo: relatedTo,
            activityDate: activityDate,
          );
        }).toList();

        return ActivityTimeline(
          activities: activityItems,
          isLoading: false,
          hasMore: false,
        );
      },
    );
  }

  ActivityType _parseActivityType(String type) {
    switch (type.toUpperCase()) {
      case 'CALL':
        return ActivityType.call;
      case 'EMAIL':
        return ActivityType.email;
      case 'MEETING':
        return ActivityType.meeting;
      case 'NOTE':
        return ActivityType.note;
      case 'TASK':
      default:
        return ActivityType.task;
    }
  }

  Widget _buildContactContent(
    BuildContext context,
    Map<String, dynamic> contact,
    AsyncValue<List<Map<String, dynamic>>> opportunitiesAsync,
    AsyncValue<List<Map<String, dynamic>>> activitiesAsync,
    bool isDark,
  ) {
    // Parse contact data - support both local and Salesforce field names
    final firstName = contact['firstName'] as String? ?? contact['FirstName'] as String? ?? '';
    final lastName = contact['lastName'] as String? ?? contact['LastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final initials = _getInitials(firstName, lastName);
    final title = contact['title'] as String? ?? contact['Title'] as String? ?? '';
    final department = contact['department'] as String? ?? contact['Department'] as String? ?? '';
    final accountName = contact['accountName'] as String? ??
        (contact['account'] as Map?)?['name'] as String? ??
        (contact['Account'] as Map?)?['Name'] as String? ??
        '';
    final email = contact['email'] as String? ?? contact['Email'] as String? ?? '';
    final phone = contact['phone'] as String? ?? contact['Phone'] as String? ?? '';
    final mobilePhone = contact['mobilePhone'] as String? ?? contact['MobilePhone'] as String? ?? '';
    final city = contact['city'] as String? ?? contact['MailingCity'] as String? ?? '';
    final state = contact['state'] as String? ?? contact['MailingState'] as String? ?? '';
    final location = [city, state].where((s) => s.isNotEmpty).join(', ');

    final jobTitle = title.isNotEmpty
        ? (accountName.isNotEmpty ? '$title at $accountName' : title)
        : (accountName.isNotEmpty ? accountName : '');

    // Parse last contacted date for prominent display
    final lastActivityDateStr = contact['lastActivityDate'] as String? ??
        contact['LastActivityDate'] as String?;
    DateTime? lastContactedDate;
    if (lastActivityDateStr != null) {
      try {
        lastContactedDate = DateTime.parse(lastActivityDateStr);
      } catch (e) {
        // Invalid date format - leave as null, log for debugging
        debugPrint('Failed to parse lastActivityDate: $lastActivityDateStr - $e');
      }
    }

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Profile Card
          IrisCard(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                  child: Text(
                    initials,
                    style: IrisTheme.headlineSmall.copyWith(
                      color: LuxuryColors.jadePremium,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  fullName.isNotEmpty ? fullName : 'Unknown Contact',
                  style: IrisTheme.titleLarge.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                if (jobTitle.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    jobTitle,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                // Last Contacted Badge - Prominent display
                const SizedBox(height: 12),
                _LastContactedBadge(lastContactedDate: lastContactedDate),
                const SizedBox(height: 20),
                // Action Buttons - Inspired by modern CRM designs
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
                      onTap: () => _handleScheduleMeeting(contact),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Engagement Metrics Card - Prominently positioned after profile
          _buildEngagementMetricsCard(contact, activitiesAsync, isDark),

          const SizedBox(height: 16),

          // Contact Info
          IrisCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                if (email.isNotEmpty)
                  _InfoRow(icon: Iconsax.sms, label: 'Email', value: email),
                if (phone.isNotEmpty)
                  _InfoRow(icon: Iconsax.call, label: 'Phone', value: phone),
                if (mobilePhone.isNotEmpty && mobilePhone != phone)
                  _InfoRow(icon: Iconsax.mobile, label: 'Mobile', value: mobilePhone),
                if (location.isNotEmpty)
                  _InfoRow(icon: Iconsax.location, label: 'Location', value: location, showDivider: department.isEmpty),
                if (department.isNotEmpty)
                  _InfoRow(icon: Iconsax.building, label: 'Department', value: department, showDivider: false),
                if (email.isEmpty && phone.isEmpty && location.isEmpty && department.isEmpty)
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

          // Related Deals
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Related Deals',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
              TextButton(
                onPressed: _handleViewAllDeals,
                child: Text(
                  'See All',
                  style: IrisTheme.labelMedium.copyWith(
                    color: LuxuryColors.jadePremium,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildRelatedDealsSection(opportunitiesAsync, isDark),

          const SizedBox(height: 24),

          // Notes Section
          EntityNotesSection(
            entityId: contact['id'] as String? ?? contact['Id'] as String? ?? widget.contactId,
            entityType: 'contact',
            entityName: fullName.isNotEmpty ? fullName : 'Contact',
            isSalesforceId: ((contact['Id'] as String?)?.length == 15 || (contact['Id'] as String?)?.length == 18),
          ),

          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildRelatedDealsSection(
    AsyncValue<List<Map<String, dynamic>>> opportunitiesAsync,
    bool isDark,
  ) {
    return opportunitiesAsync.when(
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
            'Failed to load deals',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ),
      ),
      data: (opportunities) {
        if (opportunities.isEmpty) {
          return IrisCard(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Icon(
                      Iconsax.chart_2,
                      size: 32,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'No related deals',
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

        return Column(
          children: opportunities.map((opp) => _buildDealCard(opp, isDark)).toList(),
        );
      },
    );
  }

  Widget _buildDealCard(Map<String, dynamic> opp, bool isDark) {
    final oppId = opp['id'] as String? ?? opp['Id'] as String? ?? '';
    final name = opp['name'] as String? ?? opp['Name'] as String? ?? 'Untitled Deal';
    final stage = opp['stage'] as String? ?? opp['StageName'] as String? ?? 'Unknown';
    final amount = (opp['amount'] as num?)?.toDouble() ??
        (opp['Amount'] as num?)?.toDouble() ?? 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: IrisCard(
        onTap: oppId.isNotEmpty ? () => _handleViewDealDetail(oppId) : null,
        child: Row(
          children: [
            Container(
              width: 4,
              height: 40,
              decoration: BoxDecoration(
                color: _getStageColor(stage),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  Text(
                    stage,
                    style: IrisTheme.bodySmall.copyWith(
                      color: _getStageColor(stage),
                    ),
                  ),
                ],
              ),
            ),
            Text(
              _formatCurrency(amount),
              style: IrisTheme.titleSmall.copyWith(
                color: LuxuryColors.jadePremium,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEngagementMetricsCard(
    Map<String, dynamic> contact,
    AsyncValue<List<Map<String, dynamic>>> activitiesAsync,
    bool isDark,
  ) {
    // Parse engagement data from contact metadata or use defaults
    // In a real implementation, this would come from the backend
    final metadata = contact['metadata'] as Map<String, dynamic>? ?? {};
    final engagement = metadata['engagement'] as Map<String, dynamic>? ?? {};

    // Extract engagement metrics with fallback defaults
    final engagementScore = (engagement['score'] as num?)?.toInt() ??
        _calculateEngagementScore(contact);
    final responseRate = (engagement['responseRate'] as num?)?.toDouble() ?? 0.65;
    final previousResponseRate = (engagement['previousResponseRate'] as num?)?.toDouble();

    // Parse influence level
    final influenceLevelStr = engagement['influenceLevel'] as String? ??
        _inferInfluenceLevel(contact);
    final influenceLevel = _parseInfluenceLevel(influenceLevelStr);

    // Parse communication style
    final commStyleStr = engagement['communicationStyle'] as String? ?? 'formal';
    final communicationStyle = _parseCommunicationStyle(commStyleStr);

    // Parse interests
    final interestsRaw = engagement['interests'] ?? contact['interests'] ?? [];
    final interests = (interestsRaw is List)
        ? interestsRaw.cast<String>()
        : <String>[];

    // Parse last contacted date
    DateTime? lastContacted;
    final lastContactedStr = engagement['lastContacted'] as String? ??
        contact['lastActivityDate'] as String? ??
        contact['LastActivityDate'] as String?;
    if (lastContactedStr != null) {
      try {
        lastContacted = DateTime.parse(lastContactedStr);
      } catch (_) {
        // If parsing fails, use a fallback
        lastContacted = DateTime.now().subtract(const Duration(days: 7));
      }
    }

    // Get total interactions count from activities
    final totalInteractions = activitiesAsync.maybeWhen(
      data: (activities) => activities.length,
      orElse: () => null,
    );

    return EngagementMetricsCard(
      engagementScore: engagementScore,
      responseRate: responseRate,
      previousResponseRate: previousResponseRate,
      influenceLevel: influenceLevel,
      communicationStyle: communicationStyle,
      interests: interests,
      lastContacted: lastContacted,
      totalInteractions: totalInteractions,
      onStyleTap: () => _showCommunicationStyleHint(communicationStyle),
    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.05);
  }

  /// Calculate engagement score based on contact data
  int _calculateEngagementScore(Map<String, dynamic> contact) {
    int score = 50; // Base score

    // Has email interaction
    final email = contact['email'] as String? ?? contact['Email'] as String? ?? '';
    if (email.isNotEmpty) score += 10;

    // Has phone
    final phone = contact['phone'] as String? ?? contact['Phone'] as String? ?? '';
    if (phone.isNotEmpty) score += 5;

    // Has title (indicates seniority info)
    final title = contact['title'] as String? ?? contact['Title'] as String? ?? '';
    if (title.isNotEmpty) score += 10;

    // Has department
    final department = contact['department'] as String? ?? contact['Department'] as String? ?? '';
    if (department.isNotEmpty) score += 5;

    // Has account association
    final accountName = contact['accountName'] as String? ??
        (contact['account'] as Map?)?['name'] as String? ?? '';
    if (accountName.isNotEmpty) score += 10;

    // Clamp to 0-100
    return score.clamp(0, 100);
  }

  /// Infer influence level from contact data
  String _inferInfluenceLevel(Map<String, dynamic> contact) {
    final title = (contact['title'] as String? ?? contact['Title'] as String? ?? '').toLowerCase();

    if (title.contains('ceo') || title.contains('cto') || title.contains('cfo') ||
        title.contains('chief') || title.contains('president') || title.contains('owner')) {
      return 'critical';
    }
    if (title.contains('vp') || title.contains('vice president') ||
        title.contains('director') || title.contains('head of')) {
      return 'high';
    }
    if (title.contains('manager') || title.contains('lead') || title.contains('senior')) {
      return 'medium';
    }
    return 'low';
  }

  InfluenceLevel _parseInfluenceLevel(String level) {
    switch (level.toLowerCase()) {
      case 'critical':
        return InfluenceLevel.critical;
      case 'high':
        return InfluenceLevel.high;
      case 'medium':
        return InfluenceLevel.medium;
      default:
        return InfluenceLevel.low;
    }
  }

  CommunicationStyle _parseCommunicationStyle(String style) {
    switch (style.toLowerCase()) {
      case 'casual':
        return CommunicationStyle.casual;
      case 'technical':
        return CommunicationStyle.technical;
      case 'executive':
        return CommunicationStyle.executive;
      default:
        return CommunicationStyle.formal;
    }
  }

  void _showCommunicationStyleHint(CommunicationStyle style) {
    HapticFeedback.lightImpact();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    String tips;
    switch (style) {
      case CommunicationStyle.formal:
        tips = 'Use professional greetings and closings.\n'
            'Avoid slang and casual language.\n'
            'Keep messages structured and concise.';
        break;
      case CommunicationStyle.casual:
        tips = 'Feel free to use a friendly tone.\n'
            'Personalize your messages.\n'
            'Emojis are acceptable in moderation.';
        break;
      case CommunicationStyle.technical:
        tips = 'Include relevant data and specifications.\n'
            'Use industry terminology appropriately.\n'
            'Provide detailed technical explanations.';
        break;
      case CommunicationStyle.executive:
        tips = 'Lead with key insights and conclusions.\n'
            'Keep messages brief and action-oriented.\n'
            'Focus on ROI and strategic value.';
        break;
    }

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
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            style.icon,
                            size: 22,
                            color: LuxuryColors.champagneGold,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${style.displayName} Communication',
                                style: IrisTheme.titleMedium.copyWith(
                                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                ),
                              ),
                              Text(
                                'Recommended approach',
                                style: IrisTheme.bodySmall.copyWith(
                                  color: LuxuryColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.close,
                            size: 20,
                            color: LuxuryColors.textMuted,
                          ),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark
                            ? LuxuryColors.deepNavy.withValues(alpha: 0.5)
                            : LuxuryColors.cream.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        tips,
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                          height: 1.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
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

  String _getInitials(String firstName, String lastName) {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    if (first.isEmpty && last.isEmpty) return '?';
    return '$first$last';
  }

  Color _getStageColor(String stage) {
    final normalized = stage.toLowerCase().replaceAll(' ', '');
    if (normalized.contains('prospecting')) return IrisTheme.stageProspecting;
    if (normalized.contains('qualified') || normalized.contains('qualification')) {
      return IrisTheme.stageQualified;
    }
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

  String _formatCurrency(double value) {
    if (value >= 1000000) {
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
                    Row(
                      children: [
                        Icon(
                          Iconsax.video,
                          size: 20,
                          color: LuxuryColors.champagneGold,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Start Video Call',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: Icon(
                            Icons.close,
                            size: 20,
                            color: LuxuryColors.textMuted,
                          ),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
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
                    const SizedBox(height: 8),
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

  Future<void> _handleScheduleMeeting(Map<String, dynamic> contact) async {
    HapticFeedback.lightImpact();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final firstName = contact['firstName'] as String? ?? contact['FirstName'] as String? ?? '';
    final lastName = contact['lastName'] as String? ?? contact['LastName'] as String? ?? '';
    final contactName = '$firstName $lastName'.trim();

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
        'subject': 'Meeting with $contactName',
        'startTime': scheduledDateTime.toIso8601String(),
        'endTime': scheduledDateTime.add(const Duration(hours: 1)).toIso8601String(),
        'whoId': widget.contactId,
        'description': 'Scheduled meeting with contact: $contactName',
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

  void _handleViewAllDeals() {
    HapticFeedback.lightImpact();
    // Navigate to deals page (deals for this contact shown in detail view)
    context.push(AppRoutes.deals);
  }

  void _handleViewDealDetail(String dealId) {
    HapticFeedback.lightImpact();
    context.push('${AppRoutes.deals}/$dealId');
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final buttonColor = color ?? LuxuryColors.rolexGreen;

    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: buttonColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: buttonColor,
              size: 18,
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

/// Log Activity FAB - Premium floating action button for logging activities
class _LogActivityFab extends ConsumerWidget {
  final String contactId;
  final String contactName;
  final Future<void> Function() onActivityLogged;

  const _LogActivityFab({
    required this.contactId,
    required this.contactName,
    required this.onActivityLogged,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => _showLogActivitySheet(context, ref),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              LuxuryColors.rolexGreen,
              LuxuryColors.deepEmerald,
            ],
          ),
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
              blurRadius: 16,
              offset: const Offset(0, 6),
              spreadRadius: -2,
            ),
            BoxShadow(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Iconsax.add,
                color: Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'Log Activity',
              style: IrisTheme.labelMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.3, curve: Curves.easeOutCubic);
  }

  Future<void> _showLogActivitySheet(BuildContext context, WidgetRef ref) async {
    HapticFeedback.lightImpact();

    final result = await LogActivityBottomSheet.show(
      context: context,
      contactId: contactId,
      contactName: contactName,
      onSubmit: (type, data) async {
        try {
          final crmService = ref.read(crmDataServiceProvider);

          // Map activity type to backend format
          String typeStr;
          switch (type) {
            case ActivityType.call:
              typeStr = 'CALL';
              break;
            case ActivityType.email:
              typeStr = 'EMAIL';
              break;
            case ActivityType.meeting:
              typeStr = 'MEETING';
              break;
            case ActivityType.task:
              typeStr = 'TASK';
              break;
            case ActivityType.note:
              typeStr = 'NOTE';
              break;
          }

          await crmService.createActivity({
            'type': typeStr,
            'subject': data['subject'],
            'description': data['description'],
            'outcome': data['outcome'],
            'activityDate': data['activityDate'],
            'whoId': contactId,
          });
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to log activity: $e'),
                backgroundColor: IrisTheme.error,
              ),
            );
          }
          rethrow;
        }
      },
    );

    if (result != null && context.mounted) {
      // Refresh activities after logging
      await onActivityLogged();

      if (!context.mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Activity logged successfully'),
          backgroundColor: LuxuryColors.rolexGreen,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          margin: const EdgeInsets.all(16),
        ),
      );
    }
  }
}

/// Last Contacted Badge - Prominent display of last activity date
class _LastContactedBadge extends StatelessWidget {
  final DateTime? lastContactedDate;

  const _LastContactedBadge({this.lastContactedDate});

  @override
  Widget build(BuildContext context) {
    // Calculate days since last contact
    int? daysSince;
    String statusText;
    Color statusColor;
    IconData statusIcon;

    if (lastContactedDate != null) {
      final now = DateTime.now();
      daysSince = now.difference(lastContactedDate!).inDays;

      if (daysSince == 0) {
        statusText = 'Contacted today';
        statusColor = LuxuryColors.jadePremium;
        statusIcon = Iconsax.tick_circle;
      } else if (daysSince == 1) {
        statusText = 'Contacted yesterday';
        statusColor = LuxuryColors.jadePremium;
        statusIcon = Iconsax.tick_circle;
      } else if (daysSince <= 7) {
        statusText = 'Contacted $daysSince days ago';
        statusColor = LuxuryColors.champagneGold;
        statusIcon = Iconsax.clock;
      } else if (daysSince <= 30) {
        statusText = 'Contacted ${(daysSince / 7).floor()} weeks ago';
        statusColor = const Color(0xFFFF9500);
        statusIcon = Iconsax.warning_2;
      } else {
        final months = (daysSince / 30).floor();
        statusText = months == 1
            ? 'Contacted 1 month ago'
            : 'Contacted $months months ago';
        statusColor = IrisTheme.error;
        statusIcon = Iconsax.danger;
      }
    } else {
      statusText = 'Never contacted';
      statusColor = LuxuryColors.textMuted;
      statusIcon = Iconsax.info_circle;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            statusIcon,
            size: 14,
            color: statusColor,
          ),
          const SizedBox(width: 6),
          Text(
            statusText,
            style: IrisTheme.labelSmall.copyWith(
              color: statusColor,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
