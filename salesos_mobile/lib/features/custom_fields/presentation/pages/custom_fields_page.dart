import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../data/custom_fields_service.dart';

class CustomFieldsPage extends ConsumerStatefulWidget {
  const CustomFieldsPage({super.key});

  @override
  ConsumerState<CustomFieldsPage> createState() => _CustomFieldsPageState();
}

class _CustomFieldsPageState extends ConsumerState<CustomFieldsPage> {
  static const _entityTypes = ['Lead', 'Contact', 'Deal', 'Account'];

  static const _fieldTypes = [
    'TEXT',
    'NUMBER',
    'DATE',
    'BOOLEAN',
    'SELECT',
    'MULTI_SELECT',
    'EMAIL',
    'PHONE',
    'URL',
  ];

  IconData _fieldTypeIcon(String type) {
    switch (type.toUpperCase()) {
      case 'TEXT':
        return Iconsax.text;
      case 'NUMBER':
        return Iconsax.hashtag;
      case 'DATE':
        return Iconsax.calendar;
      case 'BOOLEAN':
        return Iconsax.toggle_on_circle;
      case 'SELECT':
      case 'MULTI_SELECT':
        return Iconsax.menu;
      case 'EMAIL':
        return Iconsax.sms;
      case 'PHONE':
        return Iconsax.call;
      case 'URL':
        return Iconsax.link;
      default:
        return Iconsax.document;
    }
  }

  Color _entityColor(String entity) {
    switch (entity.toLowerCase()) {
      case 'lead':
        return LuxuryColors.champagneGold;
      case 'contact':
        return LuxuryColors.infoCobalt;
      case 'deal':
        return LuxuryColors.rolexGreen;
      case 'account':
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.textMuted;
    }
  }

  Map<String, List<CustomFieldModel>> _groupByEntity(
      List<CustomFieldModel> fields) {
    final grouped = <String, List<CustomFieldModel>>{};
    for (final entity in _entityTypes) {
      grouped[entity] =
          fields.where((f) => f.entityType.toLowerCase() == entity.toLowerCase()).toList();
    }
    return grouped;
  }

  void _showAddEditDialog({CustomFieldModel? field}) {
    final nameController = TextEditingController(text: field?.name ?? '');
    final defaultController =
        TextEditingController(text: field?.defaultValue ?? '');
    String selectedType = field?.fieldType ?? 'TEXT';
    String selectedEntity = field?.entityType ?? 'Lead';
    bool isRequired = field?.isRequired ?? false;

    IrisFormDialog.show(
      context: context,
      title: field != null ? 'Edit Field' : 'Add Custom Field',
      mode: field != null ? IrisFormMode.edit : IrisFormMode.create,
      onSave: () async {
        final service = ref.read(customFieldsServiceProvider);
        final data = {
          'name': nameController.text.trim(),
          'fieldType': selectedType,
          'entityType': selectedEntity,
          'isRequired': isRequired,
          'defaultValue': defaultController.text.trim().isNotEmpty
              ? defaultController.text.trim()
              : null,
        };

        final result = field != null
            ? await service.update(field.id, data)
            : await service.create(data);

        if (result != null) {
          ref.invalidate(customFieldsProvider);
          if (mounted) Navigator.of(context).pop();
        }
      },
      canDelete: field != null,
      onDelete: field != null
          ? () async {
              final service = ref.read(customFieldsServiceProvider);
              final success = await service.delete(field.id);
              if (success) {
                ref.invalidate(customFieldsProvider);
                if (mounted) Navigator.of(context).pop();
              }
            }
          : null,
      child: StatefulBuilder(
        builder: (context, setDialogState) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              IrisTextField(
                label: 'Field Name',
                controller: nameController,
                hint: 'e.g. Custom Source',
                prefixIcon: Iconsax.text,
                tier: LuxuryTier.gold,
              ),
              const SizedBox(height: 16),
              LuxuryDropdown<String>(
                label: 'Field Type',
                value: selectedType,
                tier: LuxuryTier.gold,
                items: _fieldTypes.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Row(
                      children: [
                        Icon(_fieldTypeIcon(type), size: 16,
                            color: LuxuryColors.champagneGold),
                        const SizedBox(width: 8),
                        Text(type),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setDialogState(() => selectedType = value);
                  }
                },
              ),
              const SizedBox(height: 16),
              LuxuryDropdown<String>(
                label: 'Entity Type',
                value: selectedEntity,
                tier: LuxuryTier.gold,
                items: _entityTypes.map((entity) {
                  return DropdownMenuItem(
                    value: entity,
                    child: Text(entity),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setDialogState(() => selectedEntity = value);
                  }
                },
              ),
              const SizedBox(height: 16),
              IrisTextField(
                label: 'Default Value',
                controller: defaultController,
                hint: 'Optional default value',
                prefixIcon: Iconsax.edit,
                tier: LuxuryTier.gold,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'REQUIRED',
                    style: IrisTheme.labelSmall.copyWith(
                      color: LuxuryColors.textMuted,
                      letterSpacing: 1.2,
                    ),
                  ),
                  Switch.adaptive(
                    value: isRequired,
                    activeThumbColor: LuxuryColors.champagneGold,
                    onChanged: (value) {
                      setDialogState(() => isRequired = value);
                    },
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _confirmDelete(CustomFieldModel field) async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Custom Field',
      message:
          'Are you sure you want to delete "${field.name}"? This cannot be undone.',
    );

    if (confirmed) {
      final service = ref.read(customFieldsServiceProvider);
      final success = await service.delete(field.id);
      if (success) {
        ref.invalidate(customFieldsProvider);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fieldsAsync = ref.watch(customFieldsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Custom Fields',
        showBackButton: true,
        tier: LuxuryTier.gold,
        actions: [
          IrisAppBarAction(
            icon: Iconsax.add,
            tooltip: 'Add Field',
            onPressed: () => _showAddEditDialog(),
          ),
        ],
      ),
      body: fieldsAsync.when(
        loading: () => const IrisListShimmer(),
        error: (err, _) => IrisEmptyState.error(
          message: 'Failed to load custom fields',
          onRetry: () => ref.invalidate(customFieldsProvider),
        ),
        data: (fields) {
          if (fields.isEmpty) {
            return IrisEmptyState(
              icon: Iconsax.element_3,
              title: 'No custom fields',
              subtitle: 'Add custom fields to extend your CRM data model.',
              actionLabel: 'Add Field',
              onAction: () => _showAddEditDialog(),
            );
          }

          final grouped = _groupByEntity(fields);

          return RefreshIndicator(
            color: LuxuryColors.champagneGold,
            onRefresh: () async => ref.invalidate(customFieldsProvider),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final entity in _entityTypes)
                    if (grouped[entity]!.isNotEmpty) ...[
                      LuxurySectionHeader(
                        title: entity,
                        subtitle: '${grouped[entity]!.length} fields',
                        tier: LuxuryTier.gold,
                      ),
                      const SizedBox(height: 12),
                      ...grouped[entity]!.asMap().entries.map((entry) {
                        final field = entry.value;
                        final entityColor = _entityColor(entity);

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: LuxuryCard(
                            tier: LuxuryTier.gold,
                            padding: const EdgeInsets.all(14),
                            onTap: () => _showAddEditDialog(field: field),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: entityColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    _fieldTypeIcon(field.fieldType),
                                    size: 18,
                                    color: entityColor,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              field.name,
                                              style: IrisTheme.bodyMedium
                                                  .copyWith(
                                                color: isDark
                                                    ? LuxuryColors.textOnDark
                                                    : LuxuryColors.textOnLight,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ),
                                          if (field.isRequired)
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: LuxuryColors.errorRuby
                                                    .withValues(alpha: 0.12),
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                'Required',
                                                style: IrisTheme.labelSmall
                                                    .copyWith(
                                                  color:
                                                      LuxuryColors.errorRuby,
                                                  fontSize: 9,
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      LuxuryBadge(
                                        text: field.fieldType,
                                        color: entityColor,
                                        tier: LuxuryTier.gold,
                                      ),
                                    ],
                                  ),
                                ),
                                LuxuryIconButton(
                                  icon: Iconsax.trash,
                                  size: 32,
                                  tier: LuxuryTier.gold,
                                  onTap: () => _confirmDelete(field),
                                ),
                              ],
                            ),
                          ).animate().fadeIn(
                                delay: Duration(
                                    milliseconds: 30 * entry.key),
                              ),
                        );
                      }),
                      const SizedBox(height: 20),
                    ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
