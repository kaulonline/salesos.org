import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../data/contracts_service.dart';
import '../widgets/contract_card.dart';
import '../widgets/contract_form.dart';

/// Factory function to create LuxuryCard - workaround for analyzer issue
Widget _createLuxuryCard({
  required Widget child,
  LuxuryTier tier = LuxuryTier.gold,
  LuxuryCardVariant variant = LuxuryCardVariant.standard,
  EdgeInsetsGeometry padding = const EdgeInsets.all(16),
  VoidCallback? onTap,
}) {
  return LuxuryCard(
    tier: tier,
    variant: variant,
    padding: padding,
    onTap: onTap,
    child: child,
  );
}

/// Contract detail page with all contract information and lifecycle actions
class ContractDetailPage extends ConsumerStatefulWidget {
  final String contractId;

  const ContractDetailPage({super.key, required this.contractId});

  @override
  ConsumerState<ContractDetailPage> createState() => _ContractDetailPageState();
}

class _ContractDetailPageState extends ConsumerState<ContractDetailPage> {
  bool _isProcessing = false;

  Future<void> _onRefresh() async {
    ref.invalidate(contractDetailProvider(widget.contractId));
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

  void _handleEdit(ContractModel contract) {
    ContractForm.show(
      context: context,
      initialData: _contractToMap(contract),
      mode: IrisFormMode.edit,
      onSuccess: () {
        _onRefresh();
      },
    );
  }

  Future<void> _handleDelete() async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Contract',
      message: 'Are you sure you want to delete this contract? This action cannot be undone.',
    );
    if (confirmed == true) {
      setState(() => _isProcessing = true);
      try {
        // In a real implementation, call the delete API
        // await contractsService.deleteContract(widget.contractId);
        if (mounted) {
          _showSnackBar('Contract deleted successfully');
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          _showSnackBar('Failed to delete contract: $e', isError: true);
        }
      } finally {
        if (mounted) setState(() => _isProcessing = false);
      }
    }
  }

  /// Handle lifecycle action with confirmation
  Future<void> _handleLifecycleAction({
    required String actionName,
    required String confirmTitle,
    required String confirmMessage,
    required Future<void> Function() action,
  }) async {
    final confirmed = await _showConfirmationDialog(
      title: confirmTitle,
      message: confirmMessage,
      actionLabel: actionName,
    );

    if (confirmed != true) return;

    setState(() => _isProcessing = true);
    try {
      await action();
      if (mounted) {
        _showSnackBar('$actionName successful');
        _onRefresh();
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Failed to $actionName: $e', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<bool?> _showConfirmationDialog({
    required String title,
    required String message,
    required String actionLabel,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
          ),
        ),
        title: Text(
          title,
          style: IrisTheme.titleLarge.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
        ),
        content: Text(
          message,
          style: IrisTheme.bodyMedium.copyWith(
            color: LuxuryColors.textMuted,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: LuxuryColors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              actionLabel,
              style: TextStyle(color: LuxuryColors.rolexGreen),
            ),
          ),
        ],
      ),
    );
  }

  Future<String?> _showTerminationReasonDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reasonController = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: LuxuryColors.errorRuby.withValues(alpha: 0.2),
          ),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Iconsax.warning_2,
                color: LuxuryColors.errorRuby,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Terminate Contract',
              style: IrisTheme.titleLarge.copyWith(
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Please provide a reason for termination:',
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Enter termination reason...',
                hintStyle: TextStyle(color: LuxuryColors.textMuted),
                filled: true,
                fillColor: isDark ? LuxuryColors.obsidian : LuxuryColors.cream,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: LuxuryColors.errorRuby.withValues(alpha: 0.2),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: LuxuryColors.errorRuby.withValues(alpha: 0.2),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: LuxuryColors.errorRuby),
                ),
              ),
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: TextStyle(color: LuxuryColors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () {
              if (reasonController.text.trim().isNotEmpty) {
                Navigator.pop(context, reasonController.text.trim());
              } else {
                Navigator.pop(context, 'No reason provided');
              }
            },
            child: Text(
              'Terminate',
              style: TextStyle(color: LuxuryColors.errorRuby),
            ),
          ),
        ],
      ),
    );
  }

  Map<String, dynamic> _contractToMap(ContractModel contract) {
    return {
      'id': contract.id,
      'contractNumber': contract.contractNumber,
      'name': contract.name,
      'accountId': contract.accountId,
      'accountName': contract.accountName,
      'status': contract.status.label,
      'startDate': contract.startDate?.toIso8601String(),
      'endDate': contract.endDate?.toIso8601String(),
      'renewalDate': contract.renewalDate?.toIso8601String(),
      'value': contract.value,
      'paymentTerms': contract.paymentTerms,
      'terms': contract.terms,
      'description': contract.description,
      'opportunityId': contract.opportunityId,
      'opportunityName': contract.opportunityName,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final contractAsync = ref.watch(contractDetailProvider(widget.contractId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Contract Details',
        showBackButton: true,
        actions: [
          contractAsync.maybeWhen(
            data: (contract) => contract != null
                ? Row(
                    children: [
                      if (contract.status == ContractStatus.DRAFT)
                        IconButton(
                          icon: Icon(
                            Iconsax.edit,
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          ),
                          onPressed: () => _handleEdit(contract),
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
      body: contractAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(isDark, error),
        data: (contract) {
          if (contract == null) {
            return Center(
              child: Text(
                'Contract not found',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _onRefresh,
            color: LuxuryColors.rolexGreen,
            backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
            child: Stack(
              children: [
                _buildContractContent(context, contract, isDark),
                if (_isProcessing)
                  Container(
                    color: Colors.black.withValues(alpha: 0.3),
                    child: const Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildErrorState(bool isDark, Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
          const SizedBox(height: 16),
          Text(
            'Failed to load contract',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => ref.refresh(contractDetailProvider(widget.contractId)),
            child: Text('Retry', style: TextStyle(color: LuxuryColors.jadePremium)),
          ),
        ],
      ),
    );
  }

  Widget _buildContractContent(BuildContext context, ContractModel contract, bool isDark) {
    final dateFormat = DateFormat('MMM d, yyyy');
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          _buildHeaderCard(contract, isDark, dateFormat, currencyFormat),

          const SizedBox(height: 16),

          // Lifecycle Actions
          _buildLifecycleActions(contract, isDark),

          const SizedBox(height: 24),

          // Account/Contact Info Section
          _buildAccountSection(contract, isDark),

          const SizedBox(height: 24),

          // Contract Terms Section
          _buildTermsSection(contract, isDark, dateFormat, currencyFormat),

          const SizedBox(height: 24),

          // Documents Section
          _buildDocumentsSection(isDark),

          const SizedBox(height: 24),

          // Description Section
          if (contract.description != null && contract.description!.isNotEmpty)
            _buildDescriptionSection(contract, isDark),

          const SizedBox(height: 100), // Bottom padding for FAB
        ],
      ),
    );
  }

  Widget _buildHeaderCard(
    ContractModel contract,
    bool isDark,
    DateFormat dateFormat,
    NumberFormat currencyFormat,
  ) {
    return _createLuxuryCard(
      variant: LuxuryCardVariant.elevated,
      tier: contract.status == ContractStatus.ACTIVE ? LuxuryTier.gold : LuxuryTier.gold,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: contract.status == ContractStatus.ACTIVE
                      ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                      : LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Iconsax.document_text,
                  size: 28,
                  color: contract.status == ContractStatus.ACTIVE
                      ? LuxuryColors.rolexGreen
                      : LuxuryColors.champagneGold,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      contract.contractNumber,
                      style: IrisTheme.labelMedium.copyWith(
                        color: contract.status == ContractStatus.ACTIVE
                            ? LuxuryColors.rolexGreen
                            : LuxuryColors.champagneGold,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      contract.name ?? 'Contract',
                      style: IrisTheme.titleLarge.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              ContractStatusBadge(status: contract.status),
              const Spacer(),
              if (contract.value != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Contract Value',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      currencyFormat.format(contract.value),
                      style: IrisTheme.headlineSmall.copyWith(
                        color: LuxuryColors.jadePremium,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          // Expiring soon warning
          if (contract.isExpiringSoon && contract.daysUntilExpiry != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: IrisTheme.irisGoldDark.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: IrisTheme.irisGoldDark.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Iconsax.timer_1,
                    size: 18,
                    color: IrisTheme.irisGoldDark,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Expires in ${contract.daysUntilExpiry} days',
                    style: IrisTheme.labelMedium.copyWith(
                      color: IrisTheme.irisGoldDark,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildLifecycleActions(ContractModel contract, bool isDark) {
    final List<Widget> actions = [];

    switch (contract.status) {
      case ContractStatus.DRAFT:
        actions.addAll([
          _buildActionButton(
            label: 'Submit for Approval',
            icon: Iconsax.send_1,
            color: LuxuryColors.rolexGreen,
            onTap: () => _handleLifecycleAction(
              actionName: 'Submit',
              confirmTitle: 'Submit Contract',
              confirmMessage: 'Submit this contract for approval?',
              action: () async {
                // Simulate API call
                await Future.delayed(const Duration(seconds: 1));
              },
            ),
          ),
        ]);
        break;
      case ContractStatus.PENDING:
        actions.addAll([
          _buildActionButton(
            label: 'Approve',
            icon: Iconsax.tick_circle,
            color: LuxuryColors.rolexGreen,
            onTap: () => _handleLifecycleAction(
              actionName: 'Approve',
              confirmTitle: 'Approve Contract',
              confirmMessage: 'Approve this contract?',
              action: () async {
                await Future.delayed(const Duration(seconds: 1));
              },
            ),
          ),
          _buildActionButton(
            label: 'Reject',
            icon: Iconsax.close_circle,
            color: LuxuryColors.errorRuby,
            isOutlined: true,
            onTap: () => _handleLifecycleAction(
              actionName: 'Reject',
              confirmTitle: 'Reject Contract',
              confirmMessage: 'Reject this contract?',
              action: () async {
                await Future.delayed(const Duration(seconds: 1));
              },
            ),
          ),
        ]);
        break;
      case ContractStatus.ACTIVE:
        actions.addAll([
          _buildActionButton(
            label: 'Renew',
            icon: Iconsax.refresh,
            color: LuxuryColors.rolexGreen,
            onTap: () => _handleLifecycleAction(
              actionName: 'Renew',
              confirmTitle: 'Renew Contract',
              confirmMessage: 'Create a renewal for this contract?',
              action: () async {
                await Future.delayed(const Duration(seconds: 1));
              },
            ),
          ),
          _buildActionButton(
            label: 'Terminate',
            icon: Iconsax.close_square,
            color: LuxuryColors.errorRuby,
            isOutlined: true,
            onTap: () async {
              final reason = await _showTerminationReasonDialog();
              if (reason != null) {
                await _handleLifecycleAction(
                  actionName: 'Terminate',
                  confirmTitle: 'Confirm Termination',
                  confirmMessage: 'Are you sure you want to terminate this contract?\n\nReason: $reason',
                  action: () async {
                    await Future.delayed(const Duration(seconds: 1));
                  },
                );
              }
            },
          ),
        ]);
        break;
      case ContractStatus.EXPIRED:
        actions.add(
          _buildActionButton(
            label: 'Renew',
            icon: Iconsax.refresh,
            color: LuxuryColors.rolexGreen,
            onTap: () => _handleLifecycleAction(
              actionName: 'Renew',
              confirmTitle: 'Renew Contract',
              confirmMessage: 'Create a renewal for this expired contract?',
              action: () async {
                await Future.delayed(const Duration(seconds: 1));
              },
            ),
          ),
        );
        break;
      case ContractStatus.TERMINATED:
        // No actions for terminated contracts
        break;
    }

    if (actions.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Actions',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: actions,
        ),
      ],
    ).animate().fadeIn(delay: 100.ms);
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    bool isOutlined = false,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isOutlined ? Colors.transparent : color,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color, width: 1.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isOutlined ? color : Colors.white,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: IrisTheme.labelMedium.copyWith(
                color: isOutlined ? color : Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountSection(ContractModel contract, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Account Information',
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
            mainAxisSize: MainAxisSize.min,
            children: [
              _DetailRow(
                icon: Iconsax.building,
                label: 'Account',
                value: contract.accountName ?? 'Not specified',
              ),
              if (contract.opportunityName != null)
                _DetailRow(
                  icon: Iconsax.chart_2,
                  label: 'Opportunity',
                  value: contract.opportunityName!,
                  showDivider: false,
                ),
            ],
          ),
        ),
      ],
    ).animate().fadeIn(delay: 150.ms);
  }

  Widget _buildTermsSection(
    ContractModel contract,
    bool isDark,
    DateFormat dateFormat,
    NumberFormat currencyFormat,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Contract Terms',
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
            mainAxisSize: MainAxisSize.min,
            children: [
              if (contract.startDate != null)
                _DetailRow(
                  icon: Iconsax.calendar_tick,
                  label: 'Start Date',
                  value: dateFormat.format(contract.startDate!),
                ),
              if (contract.endDate != null)
                _DetailRow(
                  icon: Iconsax.calendar_remove,
                  label: 'End Date',
                  value: dateFormat.format(contract.endDate!),
                ),
              if (contract.renewalDate != null)
                _DetailRow(
                  icon: Iconsax.refresh_circle,
                  label: 'Renewal Date',
                  value: dateFormat.format(contract.renewalDate!),
                ),
              if (contract.value != null)
                _DetailRow(
                  icon: Iconsax.dollar_circle,
                  label: 'Contract Value',
                  value: currencyFormat.format(contract.value),
                ),
              if (contract.paymentTerms != null)
                _DetailRow(
                  icon: Iconsax.receipt_2,
                  label: 'Payment Terms',
                  value: contract.paymentTerms!,
                ),
              if (contract.terms != null && contract.terms!.isNotEmpty)
                _DetailRow(
                  icon: Iconsax.document_1,
                  label: 'Special Terms',
                  value: contract.terms!.length > 100
                      ? '${contract.terms!.substring(0, 100)}...'
                      : contract.terms!,
                  showDivider: false,
                ),
            ],
          ),
        ),
      ],
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildDocumentsSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Documents',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                _showSnackBar('Document upload coming soon');
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.document_upload,
                      size: 16,
                      color: LuxuryColors.rolexGreen,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Upload',
                      style: IrisTheme.labelMedium.copyWith(
                        color: LuxuryColors.rolexGreen,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        IrisCard(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Iconsax.document_text,
                    size: 40,
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'No documents attached',
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Upload contracts, amendments, or related files',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    ).animate().fadeIn(delay: 250.ms);
  }

  Widget _buildDescriptionSection(ContractModel contract, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Description',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
        const SizedBox(height: 12),
        IrisCard(
          child: Text(
            contract.description!,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              height: 1.5,
            ),
          ),
        ),
      ],
    ).animate().fadeIn(delay: 300.ms);
  }
}

/// Detail row widget for displaying label-value pairs
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
