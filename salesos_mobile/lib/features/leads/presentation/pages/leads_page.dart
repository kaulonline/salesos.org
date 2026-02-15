import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../core/services/export_service.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/master_detail_layout.dart';
import '../../../../shared/widgets/filter_pill_tabs.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../../../core/services/user_preferences_service.dart';
import '../../../../core/providers/connectivity_provider.dart';
import '../../../reports/presentation/widgets/export_dialog.dart';
import 'lead_detail_page.dart';
import '../widgets/lead_form.dart';
import 'package:intl/intl.dart';

class LeadsPage extends ConsumerStatefulWidget {
  const LeadsPage({super.key});

  @override
  ConsumerState<LeadsPage> createState() => _LeadsPageState();
}

class _LeadsPageState extends ConsumerState<LeadsPage> {
  String _searchQuery = '';
  String _selectedFilter = 'All'; // Filter by status: All, Hot, Warm, Cold
  String? _selectedLeadId; // For tablet master-detail view

  List<Map<String, dynamic>> _filterLeads(List<Map<String, dynamic>> leads) {
    var filtered = leads;

    // Filter by status if not "All"
    if (_selectedFilter != 'All') {
      filtered = filtered.where((lead) {
        final status = _getLeadStatus(lead);
        return status == _selectedFilter;
      }).toList();
    }

    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((lead) {
        final name = _getLeadName(lead).toLowerCase();
        final company = (lead['Company'] as String? ?? lead['company'] as String? ?? '').toLowerCase();
        return name.contains(_searchQuery.toLowerCase()) ||
               company.contains(_searchQuery.toLowerCase());
      }).toList();
    }

    return filtered;
  }

  String _getLeadName(Map<String, dynamic> lead) {
    // Handle both Salesforce format (FirstName/LastName) and local API format (firstName/lastName)
    final firstName = lead['FirstName'] as String? ?? lead['firstName'] as String? ?? '';
    final lastName = lead['LastName'] as String? ?? lead['lastName'] as String? ?? '';
    if (firstName.isNotEmpty || lastName.isNotEmpty) {
      return '$firstName $lastName'.trim();
    }
    return lead['name'] as String? ?? 'Unknown';
  }

  String _getLeadStatus(Map<String, dynamic> lead) {
    // Salesforce uses 'Status', local might use 'status'
    final status = lead['Status'] as String? ?? lead['status'] as String? ?? '';
    // Map common statuses to Hot/Warm/Cold
    final lower = status.toLowerCase();
    if (lower.contains('hot') || lower.contains('qualified') || lower.contains('working')) {
      return 'Hot';
    } else if (lower.contains('warm') || lower.contains('contacted') || lower.contains('open')) {
      return 'Warm';
    } else if (lower.contains('cold') || lower.contains('new') || lower.contains('unqualified')) {
      return 'Cold';
    }
    return status.isNotEmpty ? status : 'New';
  }

  int _getLeadScore(Map<String, dynamic> lead) {
    // Try various score fields
    final rating = lead['Rating'] as String? ?? '';
    if (rating.toLowerCase() == 'hot') return 90;
    if (rating.toLowerCase() == 'warm') return 70;
    if (rating.toLowerCase() == 'cold') return 40;
    // Check for numeric score field
    final score = lead['score'] as num? ?? lead['leadScore'] as num?;
    if (score != null) return score.toInt();
    // Default based on status
    final status = _getLeadStatus(lead);
    if (status == 'Hot') return 85;
    if (status == 'Warm') return 65;
    return 45;
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  void _showExportDialog(BuildContext context, List<Map<String, dynamic>> leads) {
    if (leads.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No leads to export')),
      );
      return;
    }

    // Apply current filters to export data
    final filteredLeads = _filterLeads(leads);

    HapticFeedback.mediumImpact();
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
            child: ExportDialog(
              title: 'Export Leads',
              subtitle: '${filteredLeads.length} leads will be exported',
              dataType: ExportDataType.leads,
              data: filteredLeads,
              filename: 'iris_leads_export',
              exportTitle: 'SalesOS CRM - Leads Export',
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final showSplitView = Responsive.shouldShowSplitView(context);

    // Use master-detail layout on tablets
    if (showSplitView) {
      return MasterDetailLayout<String>(
        masterView: _buildMasterView(context, isDark, isTablet: true),
        selectedItem: _selectedLeadId,
        detailBuilder: (leadId) => LeadDetailContent(leadId: leadId),
        detailTitle: 'Lead Details',
        onDetailClosed: () => setState(() => _selectedLeadId = null),
      );
    }

    // Phone layout (original)
    return _buildMasterView(context, isDark);
  }

  /// Build the master list view (leads list)
  Widget _buildMasterView(BuildContext context, bool isDark, {bool isTablet = false}) {
    final leadsAsync = ref.watch(crmLeadsProvider);
    final viewPrefs = ref.watch(viewPreferencesProvider);
    final isTableView = viewPrefs.leadsView == ListViewType.table;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
              },
            ),
            // Header
            Padding(
              padding: EdgeInsets.fromLTRB(
                isTablet ? 24 : 20,
                16,
                isTablet ? 24 : 20,
                12,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Leads',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        leadsAsync.when(
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (error, _) => Text(
                            'Error loading leads',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                          data: (leads) => Text(
                            '${_filterLeads(leads).length} active leads',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      // View toggle button
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          ref.read(viewPreferencesProvider.notifier).toggleView('leads');
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isTableView
                                ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                                : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            isTableView ? Iconsax.element_3 : Iconsax.row_vertical,
                            size: 20,
                            color: isTableView
                                ? LuxuryColors.rolexGreen
                                : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Export button
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          _showExportDialog(context, ref.read(crmLeadsProvider).value ?? []);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Iconsax.export_1,
                            size: 20,
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Refresh button
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          ref.invalidate(crmLeadsProvider);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Iconsax.refresh,
                            size: 20,
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Add button
                      Semantics(
                        label: 'Add new lead',
                        button: true,
                        child: GestureDetector(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            LeadForm.show(
                              context: context,
                              mode: IrisFormMode.create,
                              onSuccess: () {
                                ref.invalidate(crmLeadsProvider);
                              },
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: LuxuryColors.rolexGreen,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Iconsax.add, size: 20, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Search
            Padding(
              padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 20),
              child: IrisSearchField(
                hint: 'Search leads...',
                onChanged: _onSearch,
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 12),

            // Filter Pills
            Padding(
              padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 20),
              child: FilterPillTabs<String>(
                items: [
                  FilterPillItem(value: 'All', label: 'All', icon: Iconsax.element_3),
                  FilterPillItem(value: 'Hot', label: 'Hot', icon: Iconsax.status_up),
                  FilterPillItem(value: 'Warm', label: 'Warm', icon: Iconsax.status),
                  FilterPillItem(value: 'Cold', label: 'Cold', icon: Iconsax.status_up, iconRotation: 180),
                ],
                selectedValue: _selectedFilter,
                onSelected: (value) {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedFilter = value);
                },
              ),
            ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Leads List with Pull-to-Refresh
            Expanded(
              child: leadsAsync.when(
                loading: () => const IrisListShimmer(itemCount: 5, itemHeight: 80),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load leads',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        error.toString(),
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () => ref.invalidate(crmLeadsProvider),
                        icon: const Icon(Iconsax.refresh),
                        label: const Text('Retry'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: LuxuryColors.rolexGreen,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                data: (leads) {
                  final filteredLeads = _filterLeads(leads);

                  if (filteredLeads.isEmpty) {
                    return _searchQuery.isNotEmpty
                        ? IrisEmptyState.search(query: _searchQuery)
                        : IrisEmptyState.leads(onAdd: () {
                            HapticFeedback.lightImpact();
                            LeadForm.show(
                              context: context,
                              mode: IrisFormMode.create,
                              onSuccess: () {
                                ref.invalidate(crmLeadsProvider);
                              },
                            );
                          });
                  }

                  // Prepare lead data for both views
                  final processedLeads = filteredLeads.map((lead) {
                    final name = _getLeadName(lead);
                    final company = lead['Company'] as String? ?? lead['company'] as String? ?? '';
                    final score = _getLeadScore(lead);
                    final status = _getLeadStatus(lead);
                    final leadId = lead['Id'] as String? ?? lead['id'] as String? ?? '';
                    final createdAt = lead['CreatedDate'] as String? ??
                                      lead['createdAt'] as String? ??
                                      lead['createdDate'] as String?;

                    return {
                      'id': leadId,
                      'name': name,
                      'company': company,
                      'score': score,
                      'status': status,
                      'email': lead['Email'] as String? ?? lead['email'] as String? ?? '',
                      'createdAt': createdAt,
                    };
                  }).toList();

                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(crmLeadsProvider);
                    },
                    color: LuxuryColors.jadePremium,
                    backgroundColor: isDark
                        ? IrisTheme.darkSurface
                        : IrisTheme.lightSurface,
                    child: isTableView
                        ? _LeadsDataTable(
                            leads: processedLeads,
                            isDark: isDark,
                            isTablet: isTablet,
                            onLeadTap: (leadId) {
                              HapticFeedback.lightImpact();
                              if (isTablet) {
                                setState(() => _selectedLeadId = leadId);
                              } else {
                                context.push('${AppRoutes.leads}/$leadId');
                              }
                            },
                          )
                        : ListView.builder(
                            padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 20),
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: processedLeads.length,
                            itemBuilder: (context, index) {
                              final leadData = processedLeads[index];
                              final leadId = leadData['id'] as String;
                              final name = leadData['name'] as String;
                              final company = leadData['company'] as String;
                              final score = leadData['score'] as int;
                              final status = leadData['status'] as String;

                              // On tablets, use selectable items; on phones, navigate
                              if (isTablet) {
                                return SelectableListItem(
                                  isSelected: _selectedLeadId == leadId,
                                  onTap: () {
                                    setState(() => _selectedLeadId = leadId);
                                  },
                                  child: _LeadCardContent(
                                    lead: leadData,
                                    isDark: isDark,
                                  ),
                                ).animate(delay: (200 + index * 50).ms)
                                    .fadeIn()
                                    .slideX(begin: 0.05);
                              }

                              return Semantics(
                                label: '$name, $company, Score $score, $status lead',
                                child: _LeadCard(
                                  lead: leadData,
                                ).animate(delay: (200 + index * 50).ms)
                                    .fadeIn()
                                    .slideX(begin: 0.05),
                              );
                            },
                          ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LeadCard extends StatelessWidget {
  final Map<String, dynamic> lead;

  const _LeadCard({required this.lead});

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Hot':
        return IrisTheme.error;
      case 'Warm':
        return IrisTheme.warning;
      default:
        return IrisTheme.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final score = lead['score'] as int? ?? 50;
    final status = lead['status'] as String? ?? 'New';
    final name = lead['name'] as String? ?? 'Unknown';
    final company = lead['company'] as String? ?? '';
    final email = lead['email'] as String? ?? '';
    final statusColor = _getStatusColor(status);
    final scoreColor = score >= 80
        ? IrisTheme.success
        : (score >= 60 ? IrisTheme.warning : IrisTheme.info);

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        context.push('${AppRoutes.leads}/${lead['id']}');
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Score Circle - larger for better visibility
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: scoreColor.withValues(alpha: 0.12),
                border: Border.all(
                  color: scoreColor.withValues(alpha: 0.3),
                  width: 2,
                ),
              ),
              child: Center(
                child: Text(
                  score.toString(),
                  style: IrisTheme.titleMedium.copyWith(
                    color: scoreColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          status,
                          style: IrisTheme.labelSmall.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    company.isNotEmpty ? company : email,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // Arrow indicator
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Iconsax.arrow_right_3,
                size: 16,
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Lead card content for tablet master-detail view (without GestureDetector wrapper)
class _LeadCardContent extends StatelessWidget {
  final Map<String, dynamic> lead;
  final bool isDark;

  const _LeadCardContent({
    required this.lead,
    required this.isDark,
  });

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Hot':
        return IrisTheme.error;
      case 'Warm':
        return IrisTheme.warning;
      default:
        return IrisTheme.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final score = lead['score'] as int? ?? 50;
    final status = lead['status'] as String? ?? 'New';
    final name = lead['name'] as String? ?? 'Unknown';
    final company = lead['company'] as String? ?? '';
    final email = lead['email'] as String? ?? '';
    final statusColor = _getStatusColor(status);
    final scoreColor = score >= 80
        ? IrisTheme.success
        : (score >= 60 ? IrisTheme.warning : IrisTheme.info);

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Score Circle - larger for better visibility
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: scoreColor.withValues(alpha: 0.12),
              border: Border.all(
                color: scoreColor.withValues(alpha: 0.3),
                width: 2,
              ),
            ),
            child: Center(
              child: Text(
                score.toString(),
                style: IrisTheme.titleMedium.copyWith(
                  color: scoreColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        status,
                        style: IrisTheme.labelSmall.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  company.isNotEmpty ? company : email,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact DataTable view for leads
class _LeadsDataTable extends StatelessWidget {
  final List<Map<String, dynamic>> leads;
  final bool isDark;
  final bool isTablet;
  final Function(String) onLeadTap;

  const _LeadsDataTable({
    required this.leads,
    required this.isDark,
    required this.isTablet,
    required this.onLeadTap,
  });

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Hot':
        return IrisTheme.error;
      case 'Warm':
        return IrisTheme.warning;
      default:
        return IrisTheme.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 12),
        child: LuxuryCard(
          variant: LuxuryCardVariant.standard,
          tier: LuxuryTier.gold,
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              // Table Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark
                      ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                      : LuxuryColors.rolexGreen.withValues(alpha: 0.08),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                ),
                child: Row(
                  children: [
                    // Score column
                    SizedBox(
                      width: 44,
                      child: Text(
                        'Score',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black54,
                          letterSpacing: 0.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Name column
                    Expanded(
                      flex: 3,
                      child: Text(
                        'Name',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black54,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    // Company column (tablet only)
                    if (isTablet)
                      Expanded(
                        flex: 2,
                        child: Text(
                          'Company',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white70 : Colors.black54,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    // Date column
                    SizedBox(
                      width: isTablet ? 70 : 55,
                      child: Text(
                        'Date',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black54,
                          letterSpacing: 0.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 6),
                    // Status column
                    SizedBox(
                      width: 50,
                      child: Text(
                        'Status',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black54,
                          letterSpacing: 0.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 20), // Arrow space
                  ],
                ),
              ),
              // Table Rows
              ...leads.asMap().entries.map((entry) {
                final index = entry.key;
                final lead = entry.value;
                final isLast = index == leads.length - 1;

                return _LeadTableRow(
                  lead: lead,
                  isDark: isDark,
                  isTablet: isTablet,
                  isLast: isLast,
                  statusColor: _getStatusColor(lead['status'] as String),
                  onTap: () => onLeadTap(lead['id'] as String),
                ).animate(delay: Duration(milliseconds: 20 * index)).fadeIn(duration: 150.ms);
              }),
            ],
          ),
        ),
      ),
    );
  }
}

/// Single row in leads data table
class _LeadTableRow extends StatelessWidget {
  final Map<String, dynamic> lead;
  final bool isDark;
  final bool isTablet;
  final bool isLast;
  final Color statusColor;
  final VoidCallback onTap;

  const _LeadTableRow({
    required this.lead,
    required this.isDark,
    required this.isTablet,
    required this.isLast,
    required this.statusColor,
    required this.onTap,
  });

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    final date = DateTime.tryParse(dateStr);
    if (date == null) return '-';
    return DateFormat('MMM d').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final score = lead['score'] as int;
    final name = lead['name'] as String;
    final company = lead['company'] as String;
    final status = lead['status'] as String;
    final createdAt = lead['createdAt'] as String?;
    final scoreColor = score >= 80
        ? IrisTheme.success
        : (score >= 60 ? IrisTheme.warning : IrisTheme.info);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            border: isLast
                ? null
                : Border(
                    bottom: BorderSide(
                      color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05),
                    ),
                  ),
          ),
          child: Row(
            children: [
              // Score badge
              Container(
                width: 44,
                height: 32,
                decoration: BoxDecoration(
                  color: scoreColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: scoreColor.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    score.toString(),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: scoreColor,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Name
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (!isTablet && company.isNotEmpty)
                      Text(
                        company,
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? Colors.white54 : Colors.black45,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              // Company (tablet only)
              if (isTablet)
                Expanded(
                  flex: 2,
                  child: Text(
                    company,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : Colors.black54,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              // Date column
              SizedBox(
                width: isTablet ? 70 : 55,
                child: Text(
                  _formatDate(createdAt),
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? Colors.white54 : Colors.black45,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(width: 6),
              // Status badge
              Container(
                width: 50,
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(width: 4),
              // Arrow
              Icon(
                Iconsax.arrow_right_3,
                size: 14,
                color: isDark ? Colors.white24 : Colors.black26,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Lead detail content for tablet inline view
class LeadDetailContent extends ConsumerWidget {
  final String leadId;

  const LeadDetailContent({super.key, required this.leadId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final leadAsync = ref.watch(leadDetailProvider(leadId));

    return leadAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
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
              onPressed: () => ref.refresh(leadDetailProvider(leadId)),
              child: Text('Retry', style: TextStyle(color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen)),
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

        return _LeadDetailBody(lead: lead, isDark: isDark);
      },
    );
  }
}

/// Lead detail body for tablet inline display
class _LeadDetailBody extends StatelessWidget {
  final Map<String, dynamic> lead;
  final bool isDark;

  const _LeadDetailBody({
    required this.lead,
    required this.isDark,
  });

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

  @override
  Widget build(BuildContext context) {
    final firstName = lead['firstName'] as String? ?? lead['FirstName'] as String? ?? '';
    final lastName = lead['lastName'] as String? ?? lead['LastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final initials = _getInitials(firstName, lastName);
    final company = lead['company'] as String? ?? lead['Company'] as String? ?? '';
    final title = lead['title'] as String? ?? lead['Title'] as String? ?? '';
    final email = lead['email'] as String? ?? lead['Email'] as String? ?? '';
    final phone = lead['phone'] as String? ?? lead['Phone'] as String? ?? '';
    final status = lead['status'] as String? ?? lead['Status'] as String? ?? '';
    final rating = lead['rating'] as String? ?? lead['Rating'] as String? ?? '';

    final jobTitle = title.isNotEmpty
        ? (company.isNotEmpty ? '$title at $company' : title)
        : (company.isNotEmpty ? company : '');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Profile section
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
            ),
            child: Column(
              children: [
                // Status badge
                if (status.isNotEmpty)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getRatingColor(status).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          status,
                          style: IrisTheme.labelSmall.copyWith(
                            color: _getRatingColor(status),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                CircleAvatar(
                  radius: 48,
                  backgroundColor: _getRatingColor(rating).withValues(alpha: 0.2),
                  child: Text(
                    initials,
                    style: IrisTheme.headlineMedium.copyWith(
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
                if (jobTitle.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    jobTitle,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (rating.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getRatingColor(rating).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      '$rating Rating',
                      style: IrisTheme.labelMedium.copyWith(
                        color: _getRatingColor(rating),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Contact info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
            ),
            child: Column(
              children: [
                if (email.isNotEmpty) _InfoTile(icon: Iconsax.sms, label: 'Email', value: email, isDark: isDark),
                if (phone.isNotEmpty) _InfoTile(icon: Iconsax.call, label: 'Phone', value: phone, isDark: isDark),
                if (company.isNotEmpty) _InfoTile(icon: Iconsax.building, label: 'Company', value: company, isDark: isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Simple info tile for lead details
class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(
            icon,
            size: 18,
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                ),
                Text(
                  value,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
