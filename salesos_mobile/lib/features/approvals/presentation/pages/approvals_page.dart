import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/approvals_service.dart';
import '../widgets/approval_card.dart';

class ApprovalsPage extends ConsumerStatefulWidget {
  const ApprovalsPage({super.key});

  @override
  ConsumerState<ApprovalsPage> createState() => _ApprovalsPageState();
}

class _ApprovalsPageState extends ConsumerState<ApprovalsPage> {
  ApprovalType? _typeFilter;
  final Set<String> _processingIds = {};

  Future<void> _onRefresh() async {
    ref.invalidate(pendingApprovalsProvider);
  }

  List<ApprovalModel> _filterApprovals(List<ApprovalModel> approvals) {
    if (_typeFilter == null) return approvals;
    return approvals.where((a) => a.type == _typeFilter).toList();
  }

  Future<void> _onApprove(ApprovalModel approval) async {
    setState(() => _processingIds.add(approval.id));
    final service = ref.read(approvalsServiceProvider);
    final success = await service.approve(approval.id);
    setState(() => _processingIds.remove(approval.id));

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Approved successfully' : 'Failed to approve',
          ),
        ),
      );
      if (success) {
        ref.invalidate(pendingApprovalsProvider);
      }
    }
  }

  Future<void> _onReject(ApprovalModel approval) async {
    setState(() => _processingIds.add(approval.id));
    final service = ref.read(approvalsServiceProvider);
    final success = await service.reject(approval.id);
    setState(() => _processingIds.remove(approval.id));

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Rejected successfully' : 'Failed to reject',
          ),
        ),
      );
      if (success) {
        ref.invalidate(pendingApprovalsProvider);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final approvalsAsync = ref.watch(pendingApprovalsProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Approvals',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        approvalsAsync.when(
                          data: (approvals) => Text(
                            '${approvals.length} pending approvals',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (_, _) => Text(
                            'Error loading approvals',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Refresh button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      _onRefresh();
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? IrisTheme.darkSurfaceHigh
                            : IrisTheme.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.refresh,
                        size: 20,
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Type filter chips
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _FilterChip(
                    label: 'All',
                    isActive: _typeFilter == null,
                    onTap: () {
                      HapticFeedback.lightImpact();
                      setState(() => _typeFilter = null);
                    },
                  ),
                  ...ApprovalType.values.map((type) {
                    return _FilterChip(
                      label: type.label,
                      isActive: _typeFilter == type,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        setState(() =>
                            _typeFilter = _typeFilter == type ? null : type);
                      },
                    );
                  }),
                ],
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 12),

            // Approvals list
            Expanded(
              child: approvalsAsync.when(
                data: (approvals) {
                  final filtered = _filterApprovals(approvals);
                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.task_square,
                      title: 'No pending approvals',
                      subtitle: _typeFilter != null
                          ? 'No ${_typeFilter!.label.toLowerCase()} approvals pending'
                          : 'All caught up! No approvals waiting for you',
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    backgroundColor:
                        isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final approval = filtered[index];
                        return ApprovalCard(
                          approval: approval,
                          isProcessing:
                              _processingIds.contains(approval.id),
                          onApprove: () => _onApprove(approval),
                          onReject: () => _onReject(approval),
                        ).animate(delay: (index * 50).ms).fadeIn().slideX(
                              begin: 0.05,
                            );
                      },
                    ),
                  );
                },
                loading: () => const IrisListShimmer(
                  itemCount: 4,
                  itemHeight: 140,
                ),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.warning_2,
                          size: 48, color: IrisTheme.error),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load approvals',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _onRefresh,
                        child: Text(
                          'Retry',
                          style: TextStyle(
                            color: isDark
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.rolexGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Type filter chip
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isActive
                ? LuxuryColors.rolexGreen
                : (isDark
                    ? IrisTheme.darkSurfaceElevated
                    : IrisTheme.lightSurfaceElevated),
            borderRadius: BorderRadius.circular(20),
            border: isActive
                ? null
                : Border.all(
                    color: isDark
                        ? IrisTheme.darkBorder
                        : IrisTheme.lightBorder,
                  ),
          ),
          child: Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: isActive
                  ? Colors.white
                  : (isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
