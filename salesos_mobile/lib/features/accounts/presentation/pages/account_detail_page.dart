import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/entity_notes_section.dart';
import '../widgets/account_form.dart';
import '../widgets/account_health_card.dart';
import '../widgets/account_hierarchy_tree.dart';
import '../widgets/account_revenue_chart.dart';

/// Provider for a single account - autoDispose ensures fresh data
final accountDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>?, String>((ref, accountId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getAccountById(accountId);
});

/// Provider for account's related opportunities - autoDispose ensures fresh data
final accountOpportunitiesProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, accountId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getAccountOpportunities(accountId);
});

/// Provider for account's related contacts - autoDispose ensures fresh data
final accountContactsProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, accountId) async {
  final crmService = ref.watch(crmDataServiceProvider);
  return crmService.getAccountContacts(accountId);
});

class AccountDetailPage extends ConsumerStatefulWidget {
  final String accountId;

  const AccountDetailPage({super.key, required this.accountId});

  @override
  ConsumerState<AccountDetailPage> createState() => _AccountDetailPageState();
}

class _AccountDetailPageState extends ConsumerState<AccountDetailPage> {
  Future<void> _onRefresh() async {
    ref.invalidate(accountDetailProvider(widget.accountId));
    ref.invalidate(accountOpportunitiesProvider(widget.accountId));
    ref.invalidate(accountContactsProvider(widget.accountId));
  }

  void _handleEdit(Map<String, dynamic> account) {
    AccountForm.show(
      context: context,
      initialData: account,
      mode: IrisFormMode.edit,
      onSuccess: () {
        ref.invalidate(accountDetailProvider(widget.accountId));
      },
    );
  }

  Future<void> _handleDelete() async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Account',
      message: 'Are you sure you want to delete this account? This action cannot be undone.',
    );
    if (confirmed == true) {
      try {
        final crmService = ref.read(crmDataServiceProvider);
        await crmService.deleteAccount(widget.accountId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Account deleted successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete account: $e'),
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
    final accountAsync = ref.watch(accountDetailProvider(widget.accountId));
    final opportunitiesAsync = ref.watch(accountOpportunitiesProvider(widget.accountId));
    final contactsAsync = ref.watch(accountContactsProvider(widget.accountId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Account',
        showBackButton: true,
        actions: [
          accountAsync.maybeWhen(
            data: (account) => account != null
                ? Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          Iconsax.edit,
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        onPressed: () => _handleEdit(account),
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
      body: accountAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text(
                'Failed to load account',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(accountDetailProvider(widget.accountId)),
                child: Text('Retry', style: TextStyle(color: LuxuryColors.jadePremium)),
              ),
            ],
          ),
        ),
        data: (account) {
          if (account == null) {
            return Center(
              child: Text(
                'Account not found',
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
            child: _buildAccountContent(context, account, opportunitiesAsync, contactsAsync, isDark),
          );
        },
      ),
    );
  }

  Widget _buildAccountContent(
    BuildContext context,
    Map<String, dynamic> account,
    AsyncValue<List<Map<String, dynamic>>> opportunitiesAsync,
    AsyncValue<List<Map<String, dynamic>>> contactsAsync,
    bool isDark,
  ) {
    // Parse account data - support both local and Salesforce field names
    final name = account['Name'] as String? ?? account['name'] as String? ?? 'Unknown Account';
    final industry = account['Industry'] as String? ?? account['industry'] as String? ?? '';
    final type = account['Type'] as String? ?? account['type'] as String? ?? '';
    final phone = account['Phone'] as String? ?? account['phone'] as String? ?? '';
    final fax = account['Fax'] as String? ?? account['fax'] as String? ?? '';
    final website = account['Website'] as String? ?? account['website'] as String? ?? '';
    final description = account['Description'] as String? ?? account['description'] as String? ?? '';

    // Billing Address
    final billingStreet = account['BillingStreet'] as String? ?? account['billingStreet'] as String? ?? '';
    final billingCity = account['BillingCity'] as String? ?? account['billingCity'] as String? ?? '';
    final billingState = account['BillingState'] as String? ?? account['billingState'] as String? ?? '';
    final billingPostalCode = account['BillingPostalCode'] as String? ?? account['billingPostalCode'] as String? ?? '';
    final billingCountry = account['BillingCountry'] as String? ?? account['billingCountry'] as String? ?? '';

    // Financial
    final annualRevenue = account['AnnualRevenue'] as num? ?? account['annualRevenue'] as num?;
    final numberOfEmployees = account['NumberOfEmployees'] as num? ?? account['numberOfEmployees'] as num?;

    final initials = _getInitials(name);
    final billingAddress = [billingStreet, billingCity, billingState, billingPostalCode, billingCountry]
        .where((s) => s.isNotEmpty)
        .join(', ');

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
                  name,
                  style: IrisTheme.titleLarge.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (industry.isNotEmpty || type.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    [industry, type].where((s) => s.isNotEmpty).join(' • '),
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 20),
                // Action Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (phone.isNotEmpty)
                      _ActionButton(
                        icon: Iconsax.call,
                        label: 'Call',
                        onTap: () => _launchPhone(phone),
                      ),
                    if (website.isNotEmpty) ...[
                      const SizedBox(width: 16),
                      _ActionButton(
                        icon: Iconsax.global,
                        label: 'Website',
                        onTap: () => _launchUrl(website),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Details Card
          IrisCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Details',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                if (phone.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.call,
                    label: 'Phone',
                    value: phone,
                    onTap: () => _launchPhone(phone),
                  ),
                if (fax.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.printer,
                    label: 'Fax',
                    value: fax,
                  ),
                if (website.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.global,
                    label: 'Website',
                    value: website,
                    onTap: () => _launchUrl(website),
                  ),
                if (billingAddress.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.location,
                    label: 'Address',
                    value: billingAddress,
                  ),
                if (annualRevenue != null)
                  _DetailRow(
                    icon: Iconsax.dollar_circle,
                    label: 'Annual Revenue',
                    value: _formatCurrency(annualRevenue.toDouble()),
                  ),
                if (numberOfEmployees != null)
                  _DetailRow(
                    icon: Iconsax.people,
                    label: 'Employees',
                    value: numberOfEmployees.toString(),
                  ),
              ],
            ),
          ),

          if (description.isNotEmpty) ...[
            const SizedBox(height: 16),
            IrisCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Description',
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),

          // Account Health
          AccountHealthCard(accountId: widget.accountId),

          const SizedBox(height: 16),

          // Account Hierarchy
          AccountHierarchyTree(accountId: widget.accountId),

          const SizedBox(height: 16),

          // Revenue Chart
          _buildRevenueSection(context, account, isDark),

          const SizedBox(height: 16),

          // Contacts Section
          _buildContactsSection(context, contactsAsync, isDark),

          const SizedBox(height: 16),

          // Opportunities Section
          _buildOpportunitiesSection(context, opportunitiesAsync, isDark),

          const SizedBox(height: 16),

          // Notes Section
          EntityNotesSection(
            entityId: account['id'] as String? ?? account['Id'] as String? ?? widget.accountId,
            entityType: 'account',
            entityName: name,
            isSalesforceId: ((account['Id'] as String?)?.length == 15 || (account['Id'] as String?)?.length == 18),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildContactsSection(
    BuildContext context,
    AsyncValue<List<Map<String, dynamic>>> contactsAsync,
    bool isDark,
  ) {
    return IrisCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Contacts',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              Icon(
                Iconsax.people,
                size: 18,
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
            ],
          ),
          const SizedBox(height: 12),
          contactsAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            error: (error, _) => Text(
              'Failed to load contacts',
              style: IrisTheme.bodySmall.copyWith(color: IrisTheme.error),
            ),
            data: (contacts) {
              if (contacts.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'No contacts found',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                  ),
                );
              }
              return Column(
                children: contacts.take(5).map((contact) {
                  final firstName = contact['FirstName'] as String? ?? contact['firstName'] as String? ?? '';
                  final lastName = contact['LastName'] as String? ?? contact['lastName'] as String? ?? '';
                  final fullName = '$firstName $lastName'.trim();
                  final title = contact['Title'] as String? ?? contact['title'] as String? ?? '';
                  final email = contact['Email'] as String? ?? contact['email'] as String? ?? '';
                  final contactId = contact['Id'] as String? ?? contact['id'] as String? ?? '';

                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      radius: 18,
                      backgroundColor: IrisTheme.info.withValues(alpha: 0.15),
                      child: Text(
                        _getInitials(fullName),
                        style: IrisTheme.labelSmall.copyWith(
                          color: IrisTheme.info,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    title: Text(
                      fullName.isNotEmpty ? fullName : 'Unknown Contact',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    subtitle: Text(
                      title.isNotEmpty ? title : email,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    trailing: Icon(
                      Iconsax.arrow_right_3,
                      size: 16,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    onTap: contactId.isNotEmpty ? () => context.push('${AppRoutes.contacts}/$contactId') : null,
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildOpportunitiesSection(
    BuildContext context,
    AsyncValue<List<Map<String, dynamic>>> opportunitiesAsync,
    bool isDark,
  ) {
    return IrisCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Opportunities',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              Icon(
                Iconsax.chart_2,
                size: 18,
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
            ],
          ),
          const SizedBox(height: 12),
          opportunitiesAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            error: (error, _) => Text(
              'Failed to load opportunities',
              style: IrisTheme.bodySmall.copyWith(color: IrisTheme.error),
            ),
            data: (opportunities) {
              if (opportunities.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'No opportunities found',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                  ),
                );
              }
              return Column(
                children: opportunities.take(5).map((opp) {
                  final oppName = opp['Name'] as String? ?? opp['name'] as String? ?? 'Unnamed';
                  final amount = opp['Amount'] as num? ?? opp['amount'] as num? ?? 0;
                  final stage = opp['StageName'] as String? ?? opp['stageName'] as String? ?? '';
                  final isWon = opp['IsWon'] == true;
                  final isClosed = opp['IsClosed'] == true;
                  final oppId = opp['Id'] as String? ?? opp['id'] as String? ?? '';

                  Color stageColor = IrisTheme.info;
                  if (isWon) {
                    stageColor = IrisTheme.success;
                  } else if (isClosed) {
                    stageColor = IrisTheme.error;
                  } else if (stage.toLowerCase().contains('negotiation')) {
                    stageColor = IrisTheme.warning;
                  }

                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: stageColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        isWon ? Iconsax.medal_star : Iconsax.dollar_circle,
                        size: 18,
                        color: stageColor,
                      ),
                    ),
                    title: Text(
                      oppName,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      '${_formatCurrency(amount.toDouble())} • $stage',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    trailing: Icon(
                      Iconsax.arrow_right_3,
                      size: 16,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    onTap: oppId.isNotEmpty ? () => context.push('${AppRoutes.deals}/$oppId') : null,
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueSection(BuildContext context, Map<String, dynamic> account, bool isDark) {
    // Build revenue data from account's financial info
    final annualRevenue = (account['AnnualRevenue'] as num?)?.toDouble() ??
        (account['annualRevenue'] as num?)?.toDouble() ?? 0;
    if (annualRevenue <= 0) return const SizedBox.shrink();

    // Create a simple revenue data map for the chart
    final revenueData = <String, double>{
      'Q1': annualRevenue * 0.22,
      'Q2': annualRevenue * 0.25,
      'Q3': annualRevenue * 0.28,
      'Q4': annualRevenue * 0.25,
    };

    return IrisCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Revenue Breakdown',
            style: IrisTheme.titleSmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: AccountRevenueChart(revenueData: revenueData),
          ),
        ],
      ),
    );
  }

  String _getInitials(String name) {
    final words = name.split(' ').where((w) => w.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words[0][0].toUpperCase();
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }

  Future<void> _launchPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _launchUrl(String url) async {
    String urlString = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlString = 'https://$url';
    }
    final uri = Uri.parse(urlString);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Column(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: LuxuryColors.jadePremium, size: 22),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.jadePremium,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: onTap != null ? () {
          HapticFeedback.lightImpact();
          onTap!();
        } : null,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              size: 18,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
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
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      decoration: onTap != null ? TextDecoration.underline : null,
                    ),
                  ),
                ],
              ),
            ),
            if (onTap != null)
              Icon(
                Iconsax.arrow_right_3,
                size: 16,
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
          ],
        ),
      ),
    );
  }
}
