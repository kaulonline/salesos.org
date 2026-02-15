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
import 'contact_detail_page.dart';
import '../widgets/contact_form.dart';
import 'package:intl/intl.dart';

class ContactsPage extends ConsumerStatefulWidget {
  const ContactsPage({super.key});

  @override
  ConsumerState<ContactsPage> createState() => _ContactsPageState();
}

class _ContactsPageState extends ConsumerState<ContactsPage> {
  String _searchQuery = '';
  String _selectedFilter = ContactFilterOption.all;
  String? _selectedContactId; // For tablet master-detail view

  String _getContactName(Map<String, dynamic> contact) {
    // Handle both Salesforce format (FirstName/LastName) and local API format (firstName/lastName)
    final firstName = contact['FirstName'] as String? ?? contact['firstName'] as String? ?? '';
    final lastName = contact['LastName'] as String? ?? contact['lastName'] as String? ?? '';
    if (firstName.isNotEmpty || lastName.isNotEmpty) {
      return '$firstName $lastName'.trim();
    }
    return contact['name'] as String? ?? 'Unknown';
  }

  String _getCompanyName(Map<String, dynamic> contact) {
    // Salesforce has nested Account.Name, local might have company
    final account = contact['Account'] as Map<String, dynamic>?;
    if (account != null) {
      return account['Name'] as String? ?? '';
    }
    return contact['company'] as String? ?? contact['accountName'] as String? ?? '';
  }

  List<Map<String, dynamic>> _filterContacts(List<Map<String, dynamic>> contacts) {
    if (_searchQuery.isEmpty) return contacts;
    return contacts.where((contact) {
      final name = _getContactName(contact).toLowerCase();
      final company = _getCompanyName(contact).toLowerCase();
      final email = (contact['Email'] as String? ?? contact['email'] as String? ?? '').toLowerCase();
      return name.contains(_searchQuery.toLowerCase()) ||
             company.contains(_searchQuery.toLowerCase()) ||
             email.contains(_searchQuery.toLowerCase());
    }).toList();
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  void _showExportDialog(BuildContext context, List<Map<String, dynamic>> contacts) {
    if (contacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No contacts to export')),
      );
      return;
    }

    // Apply current filters to export data
    final filteredContacts = _filterContacts(contacts);

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
              title: 'Export Contacts',
              subtitle: '${filteredContacts.length} contacts will be exported',
              dataType: ExportDataType.contacts,
              data: filteredContacts,
              filename: 'iris_contacts_export',
              exportTitle: 'SalesOS CRM - Contacts Export',
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
        selectedItem: _selectedContactId,
        detailBuilder: (contactId) => ContactDetailContent(contactId: contactId),
        detailTitle: 'Contact Details',
        onDetailClosed: () => setState(() => _selectedContactId = null),
      );
    }

    // Phone layout (original)
    return _buildMasterView(context, isDark);
  }

  /// Build the master list view (contacts list)
  Widget _buildMasterView(BuildContext context, bool isDark, {bool isTablet = false}) {
    final contactsAsync = ref.watch(crmContactsProvider);
    final viewPrefs = ref.watch(viewPreferencesProvider);
    final isTableView = viewPrefs.contactsView == ListViewType.table;

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
                          'Contacts',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        contactsAsync.when(
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (error, _) => Text(
                            'Error loading contacts',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                          data: (contacts) => Text(
                            '${_filterContacts(contacts).length} contacts',
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
                          ref.read(viewPreferencesProvider.notifier).toggleView('contacts');
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
                          _showExportDialog(context, ref.read(crmContactsProvider).value ?? []);
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
                          ref.invalidate(crmContactsProvider);
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
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          ContactForm.show(
                            context: context,
                            mode: IrisFormMode.create,
                            onSuccess: () {
                              ref.invalidate(crmContactsProvider);
                            },
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: LuxuryColors.rolexGreen,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Iconsax.add,
                            size: 20,
                            color: Colors.white,
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
                hint: 'Search contacts...',
                onChanged: _onSearch,
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 12),

            // Filter Pills
            FilterPillTabs<String>(
              items: const [
                FilterPillItem(value: ContactFilterOption.all, label: 'All'),
                FilterPillItem(value: ContactFilterOption.recent, label: 'Recent'),
                FilterPillItem(value: ContactFilterOption.favorites, label: 'Favorites'),
                FilterPillItem(value: ContactFilterOption.vip, label: 'VIP'),
              ],
              selectedValue: _selectedFilter,
              onSelected: (value) {
                setState(() => _selectedFilter = value);
              },
              padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 20),
            ),

            const SizedBox(height: 16),

            // Contact List
            Expanded(
              child: contactsAsync.when(
                loading: () => const IrisListShimmer(itemCount: 5, itemHeight: 80),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load contacts',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          error.toString(),
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () => ref.invalidate(crmContactsProvider),
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
                data: (contacts) {
                  final filteredContacts = _filterContacts(contacts);

                  if (filteredContacts.isEmpty) {
                    return _searchQuery.isNotEmpty
                        ? IrisEmptyState.search(query: _searchQuery)
                        : IrisEmptyState.contacts(onAdd: () {
                            HapticFeedback.lightImpact();
                          });
                  }

                  // Prepare contact data for both views
                  final processedContacts = filteredContacts.map((contact) {
                    final name = _getContactName(contact);
                    final company = _getCompanyName(contact);
                    final contactId = contact['Id'] as String? ?? contact['id'] as String? ?? '';
                    final title = contact['Title'] as String? ?? contact['title'] as String? ?? '';
                    final email = contact['Email'] as String? ?? contact['email'] as String? ?? '';
                    final phone = contact['Phone'] as String? ?? contact['phone'] as String? ?? '';
                    final createdAt = contact['CreatedDate'] as String? ??
                                      contact['createdAt'] as String? ??
                                      contact['createdDate'] as String?;

                    return {
                      'id': contactId,
                      'name': name,
                      'company': company,
                      'role': title,
                      'email': email,
                      'phone': phone,
                      'createdAt': createdAt,
                    };
                  }).toList();

                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(crmContactsProvider);
                    },
                    color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                    backgroundColor: isDark
                        ? IrisTheme.darkSurface
                        : IrisTheme.lightSurface,
                    child: isTableView
                        ? _ContactsDataTable(
                            contacts: processedContacts,
                            isDark: isDark,
                            isTablet: isTablet,
                            onContactTap: (contactId) {
                              HapticFeedback.lightImpact();
                              if (isTablet) {
                                setState(() => _selectedContactId = contactId);
                              } else {
                                context.push('${AppRoutes.contacts}/$contactId');
                              }
                            },
                          )
                        : ListView.builder(
                            padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 20),
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: processedContacts.length,
                            itemBuilder: (context, index) {
                              final contactData = processedContacts[index];
                              final contactId = contactData['id'] as String;

                              // On tablets, use selectable items; on phones, navigate
                              if (isTablet) {
                                return SelectableListItem(
                                  isSelected: _selectedContactId == contactId,
                                  onTap: () {
                                    setState(() => _selectedContactId = contactId);
                                  },
                                  child: _ContactCardContent(
                                    contact: contactData,
                                    isDark: isDark,
                                  ),
                                ).animate(delay: (200 + index * 50).ms)
                                    .fadeIn()
                                    .slideX(begin: 0.05);
                              }

                              return _ContactCard(
                                contact: contactData,
                              ).animate(delay: (200 + index * 50).ms)
                                  .fadeIn()
                                  .slideX(begin: 0.05);
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

class _ContactCard extends StatelessWidget {
  final Map<String, dynamic> contact;

  const _ContactCard({required this.contact});

  String _getInitials(String name) {
    final parts = name.split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts.last[0]}'.toUpperCase();
  }

  // Generate a consistent color based on name hash - using brand colors
  Color _getAvatarColor(String name) {
    final hash = name.hashCode;
    final colors = [
      LuxuryColors.rolexGreen,
      LuxuryColors.champagneGoldDark,
      LuxuryColors.champagneGoldLight,
      IrisTheme.irisBrown,
      const Color(0xFF8B4D3B), // Medium brown from brand palette
    ];
    return colors[hash.abs() % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final name = contact['name'] as String? ?? 'Unknown';
    final company = contact['company'] as String? ?? '';
    final role = contact['role'] as String? ?? '';
    final initials = _getInitials(name);
    final avatarColor = _getAvatarColor(name);

    return GestureDetector(
      onTap: () => context.push('${AppRoutes.contacts}/${contact['id']}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
        ),
        child: Row(
          children: [
            // Avatar - larger, more prominent
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: avatarColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: IrisTheme.titleSmall.copyWith(
                    color: avatarColor,
                    fontWeight: FontWeight.w600,
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
                  Text(
                    name,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (company.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      company,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (role.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      role,
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            // Arrow indicator
            Icon(
              Iconsax.arrow_right_3,
              size: 18,
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
          ],
        ),
      ),
    );
  }
}

/// Contact card content for tablet master-detail view (without GestureDetector wrapper)
class _ContactCardContent extends StatelessWidget {
  final Map<String, dynamic> contact;
  final bool isDark;

  const _ContactCardContent({
    required this.contact,
    required this.isDark,
  });

  String _getInitials(String name) {
    final parts = name.split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts.last[0]}'.toUpperCase();
  }

  Color _getAvatarColor(String name) {
    final hash = name.hashCode;
    final colors = [
      LuxuryColors.rolexGreen,
      LuxuryColors.champagneGoldDark,
      LuxuryColors.champagneGoldLight,
      IrisTheme.irisBrown,
      const Color(0xFF8B4D3B),
    ];
    return colors[hash.abs() % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final name = contact['name'] as String? ?? 'Unknown';
    final company = contact['company'] as String? ?? '';
    final role = contact['role'] as String? ?? '';
    final initials = _getInitials(name);
    final avatarColor = _getAvatarColor(name);

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: avatarColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                initials,
                style: IrisTheme.titleSmall.copyWith(
                  color: avatarColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
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
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                if (company.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    company,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (role.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    role,
                    style: IrisTheme.labelSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact DataTable view for contacts
class _ContactsDataTable extends StatelessWidget {
  final List<Map<String, dynamic>> contacts;
  final bool isDark;
  final bool isTablet;
  final Function(String) onContactTap;

  const _ContactsDataTable({
    required this.contacts,
    required this.isDark,
    required this.isTablet,
    required this.onContactTap,
  });

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
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
                    // Avatar column
                    const SizedBox(width: 36),
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
                    // Role column
                    SizedBox(
                      width: isTablet ? 100 : 70,
                      child: Text(
                        'Role',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black54,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 20), // Arrow space
                  ],
                ),
              ),
              // Table Rows
              ...contacts.asMap().entries.map((entry) {
                final index = entry.key;
                final contact = entry.value;
                final isLast = index == contacts.length - 1;

                return _ContactTableRow(
                  contact: contact,
                  isDark: isDark,
                  isTablet: isTablet,
                  isLast: isLast,
                  initials: _getInitials(contact['name'] as String),
                  onTap: () => onContactTap(contact['id'] as String),
                ).animate(delay: Duration(milliseconds: 20 * index)).fadeIn(duration: 150.ms);
              }),
            ],
          ),
        ),
      ),
    );
  }
}

/// Single row in contacts data table
class _ContactTableRow extends StatelessWidget {
  final Map<String, dynamic> contact;
  final bool isDark;
  final bool isTablet;
  final bool isLast;
  final String initials;
  final VoidCallback onTap;

  const _ContactTableRow({
    required this.contact,
    required this.isDark,
    required this.isTablet,
    required this.isLast,
    required this.initials,
    required this.onTap,
  });

  Color _getAvatarColor(String name) {
    final hash = name.hashCode;
    final colors = [
      LuxuryColors.rolexGreen,
      LuxuryColors.champagneGoldDark,
      LuxuryColors.champagneGoldLight,
      IrisTheme.irisBrown,
      const Color(0xFF8B4D3B),
    ];
    return colors[hash.abs() % colors.length];
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    final date = DateTime.tryParse(dateStr);
    if (date == null) return '-';
    return DateFormat('MMM d').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final name = contact['name'] as String;
    final company = contact['company'] as String;
    final role = contact['role'] as String;
    final createdAt = contact['createdAt'] as String?;
    final avatarColor = _getAvatarColor(name);

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
              // Avatar
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: avatarColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: avatarColor,
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
              // Role
              SizedBox(
                width: isTablet ? 100 : 70,
                child: Text(
                  role.isNotEmpty ? role : '-',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : Colors.black45,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
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

/// Contact detail content for tablet inline view
class ContactDetailContent extends ConsumerWidget {
  final String contactId;

  const ContactDetailContent({super.key, required this.contactId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final contactAsync = ref.watch(contactDetailProvider(contactId));
    final opportunitiesAsync = ref.watch(contactOpportunitiesProvider(contactId));

    return contactAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
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
              onPressed: () => ref.refresh(contactDetailProvider(contactId)),
              child: Text('Retry', style: TextStyle(color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen)),
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

        return _ContactDetailBody(
          contact: contact,
          opportunitiesAsync: opportunitiesAsync,
          isDark: isDark,
        );
      },
    );
  }
}

/// Contact detail body for tablet inline display
class _ContactDetailBody extends StatelessWidget {
  final Map<String, dynamic> contact;
  final AsyncValue<List<Map<String, dynamic>>> opportunitiesAsync;
  final bool isDark;

  const _ContactDetailBody({
    required this.contact,
    required this.opportunitiesAsync,
    required this.isDark,
  });

  String _getInitials(String firstName, String lastName) {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    if (first.isEmpty && last.isEmpty) return '?';
    return '$first$last';
  }

  @override
  Widget build(BuildContext context) {
    final firstName = contact['firstName'] as String? ?? contact['FirstName'] as String? ?? '';
    final lastName = contact['lastName'] as String? ?? contact['LastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final initials = _getInitials(firstName, lastName);
    final title = contact['title'] as String? ?? contact['Title'] as String? ?? '';
    final accountName = contact['accountName'] as String? ??
        (contact['account'] as Map?)?['name'] as String? ??
        (contact['Account'] as Map?)?['Name'] as String? ??
        '';
    final email = contact['email'] as String? ?? contact['Email'] as String? ?? '';
    final phone = contact['phone'] as String? ?? contact['Phone'] as String? ?? '';

    final jobTitle = title.isNotEmpty
        ? (accountName.isNotEmpty ? '$title at $accountName' : title)
        : (accountName.isNotEmpty ? accountName : '');

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
                CircleAvatar(
                  radius: 48,
                  backgroundColor: (isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen).withValues(alpha: 0.2),
                  child: Text(
                    initials,
                    style: IrisTheme.headlineMedium.copyWith(
                      color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  fullName.isNotEmpty ? fullName : 'Unknown Contact',
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
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Related deals section
          _buildDealsSection(opportunitiesAsync),
        ],
      ),
    );
  }

  Widget _buildDealsSection(AsyncValue<List<Map<String, dynamic>>> opportunitiesAsync) {
    return opportunitiesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, stack) => const SizedBox.shrink(),
      data: (opportunities) {
        if (opportunities.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Related Deals',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            ...opportunities.map((opp) => _buildDealCard(opp)),
          ],
        );
      },
    );
  }

  Widget _buildDealCard(Map<String, dynamic> opp) {
    final name = opp['name'] as String? ?? opp['Name'] as String? ?? 'Untitled Deal';
    final stage = opp['stage'] as String? ?? opp['StageName'] as String? ?? 'Unknown';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              name,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: (isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              stage,
              style: IrisTheme.labelSmall.copyWith(color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen),
            ),
          ),
        ],
      ),
    );
  }
}

/// Simple info tile for contact details
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
