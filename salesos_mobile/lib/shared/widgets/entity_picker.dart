import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/config/theme.dart';
import '../../core/services/crm_data_service.dart';
import '../../core/providers/auth_mode_provider.dart';
import 'luxury_card.dart';

/// Entity type for the picker
enum EntityType { lead, account, contact, opportunity }

/// A selected entity from the picker
class SelectedEntity {
  final String id;
  final String name;
  final EntityType type;
  final bool isSalesforceId;
  final String? subtitle; // Company, stage, etc.

  SelectedEntity({
    required this.id,
    required this.name,
    required this.type,
    this.isSalesforceId = false,
    this.subtitle,
  });

  /// Get the correct ID field name for API calls
  String get localIdField {
    switch (type) {
      case EntityType.lead:
        return 'leadId';
      case EntityType.account:
        return 'accountId';
      case EntityType.contact:
        return 'contactId';
      case EntityType.opportunity:
        return 'opportunityId';
    }
  }

  /// Get the Salesforce ID field name for API calls
  String get sfIdField {
    switch (type) {
      case EntityType.lead:
        return 'sfLeadId';
      case EntityType.account:
        return 'sfAccountId';
      case EntityType.contact:
        return 'sfContactId';
      case EntityType.opportunity:
        return 'sfOpportunityId';
    }
  }

  /// Get the appropriate ID field based on whether this is a Salesforce entity
  String get idField => isSalesforceId ? sfIdField : localIdField;
}

/// Entity picker widget for selecting CRM entities
class EntityPicker extends ConsumerStatefulWidget {
  final Function(SelectedEntity entity) onEntitySelected;
  final SelectedEntity? initialEntity;
  final Set<EntityType> allowedTypes;
  final String? title;
  final bool showCurrentSelection;

  const EntityPicker({
    super.key,
    required this.onEntitySelected,
    this.initialEntity,
    this.allowedTypes = const {
      EntityType.lead,
      EntityType.account,
      EntityType.contact,
      EntityType.opportunity,
    },
    this.title,
    this.showCurrentSelection = true,
  });

  @override
  ConsumerState<EntityPicker> createState() => _EntityPickerState();
}

class _EntityPickerState extends ConsumerState<EntityPicker> {
  final TextEditingController _searchController = TextEditingController();
  EntityType _selectedType = EntityType.lead;
  List<Map<String, dynamic>> _searchResults = [];
  bool _isLoading = false;
  String _lastQuery = '';

  @override
  void initState() {
    super.initState();
    if (widget.allowedTypes.isNotEmpty && !widget.allowedTypes.contains(_selectedType)) {
      _selectedType = widget.allowedTypes.first;
    }
    // Load initial data
    _search('');
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (_isLoading) return;
    _lastQuery = query;

    setState(() => _isLoading = true);

    try {
      final crmService = ref.read(crmDataServiceProvider);
      List<Map<String, dynamic>> results = [];

      // Use CRM data service to fetch data - it handles Salesforce/Local routing
      switch (_selectedType) {
        case EntityType.lead:
          results = await crmService.getLeads(limit: 20);
          break;
        case EntityType.account:
          results = await crmService.getAccounts(limit: 20);
          break;
        case EntityType.contact:
          results = await crmService.getContacts(limit: 20);
          break;
        case EntityType.opportunity:
          results = await crmService.getOpportunities(limit: 20);
          break;
      }

      // Filter by search query if provided
      if (query.isNotEmpty) {
        final queryLower = query.toLowerCase();
        results = results.where((item) {
          final name = _getEntityName(item).toLowerCase();
          final subtitle = _getEntitySubtitle(item, _selectedType)?.toLowerCase() ?? '';
          return name.contains(queryLower) || subtitle.contains(queryLower);
        }).toList();
      }

      if (mounted && _lastQuery == query) {
        setState(() {
          _searchResults = results;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _searchResults = [];
          _isLoading = false;
        });
      }
    }
  }

  IconData _getIconForType(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return Iconsax.profile_2user;
      case EntityType.account:
        return Iconsax.building;
      case EntityType.contact:
        return Iconsax.user;
      case EntityType.opportunity:
        return Iconsax.money_4;
    }
  }

  Color _getColorForType(EntityType type, bool isDark) {
    switch (type) {
      case EntityType.lead:
        return LuxuryColors.rolexGreen;
      case EntityType.account:
        return LuxuryColors.champagneGold;
      case EntityType.contact:
        return Colors.blue;
      case EntityType.opportunity:
        return Colors.purple;
    }
  }

  String _getLabelForType(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return 'Leads';
      case EntityType.account:
        return 'Accounts';
      case EntityType.contact:
        return 'Contacts';
      case EntityType.opportunity:
        return 'Opportunities';
    }
  }

  String _getEntityName(Map<String, dynamic> item) {
    // Try different name formats
    if (item.containsKey('firstName') || item.containsKey('lastName')) {
      final first = item['firstName'] ?? '';
      final last = item['lastName'] ?? '';
      return '$first $last'.trim();
    }
    return item['name'] ?? item['Name'] ?? 'Unknown';
  }

  String? _getEntitySubtitle(Map<String, dynamic> item, EntityType type) {
    switch (type) {
      case EntityType.lead:
        return item['company'] ?? item['Company'];
      case EntityType.account:
        return item['industry'] ?? item['type'];
      case EntityType.contact:
        final account = item['account'];
        if (account is Map) {
          return account['name'] ?? account['Name'];
        }
        return item['email'];
      case EntityType.opportunity:
        return item['stage'] ?? item['StageName'];
    }
  }

  String _getEntityId(Map<String, dynamic> item) {
    // Prefer Salesforce ID if in Salesforce mode, otherwise use local ID
    return item['Id'] ?? item['id'] ?? '';
  }

  bool _isSalesforceEntity(Map<String, dynamic> item) {
    // Check auth mode first - if not in Salesforce mode, it's never a Salesforce entity
    final authMode = ref.read(authModeProvider);
    if (authMode != AuthMode.salesforce) {
      return false;
    }

    // In Salesforce mode, check if ID looks like a Salesforce ID (15 or 18 chars)
    final id = _getEntityId(item);
    return id.length == 15 || id.length == 18;
  }

  void _selectEntity(Map<String, dynamic> item) {
    HapticFeedback.lightImpact();

    final entity = SelectedEntity(
      id: _getEntityId(item),
      name: _getEntityName(item),
      type: _selectedType,
      isSalesforceId: _isSalesforceEntity(item),
      subtitle: _getEntitySubtitle(item, _selectedType),
    );

    widget.onEntitySelected(entity);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authMode = ref.watch(authModeProvider);
    final isSalesforceMode = authMode == AuthMode.salesforce;

    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.richBlack : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.title ?? 'Link to Record',
                    style: IrisTheme.headlineSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                // Data source badge - always show to make it clear where data comes from
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isSalesforceMode
                        ? Colors.blue.withValues(alpha: 0.1)
                        : LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isSalesforceMode ? Iconsax.cloud : Iconsax.data,
                        size: 14,
                        color: isSalesforceMode ? Colors.blue : LuxuryColors.rolexGreen,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isSalesforceMode ? 'Salesforce' : 'SalesOS Local',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isSalesforceMode ? Colors.blue : LuxuryColors.rolexGreen,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Entity type tabs
          if (widget.allowedTypes.length > 1)
            Container(
              height: 44,
              margin: const EdgeInsets.symmetric(horizontal: 20),
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: widget.allowedTypes.map((type) {
                  final isSelected = _selectedType == type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        setState(() => _selectedType = type);
                        _search(_searchController.text);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? _getColorForType(type, isDark)
                              : (isDark
                                  ? LuxuryColors.obsidian
                                  : LuxuryColors.platinum.withValues(alpha: 0.3)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _getIconForType(type),
                              size: 16,
                              color: isSelected
                                  ? Colors.white
                                  : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _getLabelForType(type),
                              style: IrisTheme.labelMedium.copyWith(
                                color: isSelected
                                    ? Colors.white
                                    : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

          const SizedBox(height: 16),

          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchController,
              onChanged: (value) => _search(value),
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Search ${_getLabelForType(_selectedType).toLowerCase()}...',
                hintStyle: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
                prefixIcon: Icon(
                  Iconsax.search_normal,
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  size: 20,
                ),
                filled: true,
                fillColor: isDark ? LuxuryColors.obsidian : LuxuryColors.platinum.withValues(alpha: 0.3),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Results list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _searchResults.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Iconsax.document_text,
                              size: 48,
                              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No ${_getLabelForType(_selectedType).toLowerCase()} found',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: _searchResults.length,
                        itemBuilder: (context, index) {
                          final item = _searchResults[index];
                          final name = _getEntityName(item);
                          final subtitle = _getEntitySubtitle(item, _selectedType);

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: LuxuryCard(
                              variant: LuxuryCardVariant.standard,
                              onTap: () => _selectEntity(item),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: _getColorForType(_selectedType, isDark).withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Center(
                                        child: Icon(
                                          _getIconForType(_selectedType),
                                          color: _getColorForType(_selectedType, isDark),
                                          size: 22,
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
                                            style: IrisTheme.bodyMedium.copyWith(
                                              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          if (subtitle != null) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              subtitle,
                                              style: IrisTheme.labelSmall.copyWith(
                                                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Iconsax.arrow_right_3,
                                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                                      size: 18,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

/// Show the entity picker as a bottom sheet
Future<SelectedEntity?> showEntityPicker(
  BuildContext context, {
  SelectedEntity? initialEntity,
  Set<EntityType>? allowedTypes,
  String? title,
}) async {
  SelectedEntity? result;

  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => EntityPicker(
      initialEntity: initialEntity,
      allowedTypes: allowedTypes ?? {EntityType.lead, EntityType.account, EntityType.contact, EntityType.opportunity},
      title: title,
      onEntitySelected: (entity) {
        result = entity;
      },
    ),
  );

  return result;
}
