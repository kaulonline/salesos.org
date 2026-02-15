import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_mode_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';

/// Hierarchy node model
class AccountHierarchyNode {
  final String id;
  final String name;
  final String? type;
  final List<AccountHierarchyNode> children;
  final bool isCurrent;

  const AccountHierarchyNode({
    required this.id,
    required this.name,
    this.type,
    this.children = const [],
    this.isCurrent = false,
  });

  factory AccountHierarchyNode.fromJson(Map<String, dynamic> json) {
    final childrenJson = json['children'] as List? ?? [];
    return AccountHierarchyNode(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown',
      type: json['type'] as String?,
      isCurrent: json['isCurrent'] == true,
      children: childrenJson
          .map((c) => AccountHierarchyNode.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Provider for account hierarchy
final accountHierarchyProvider = FutureProvider.autoDispose
    .family<AccountHierarchyNode?, String>((ref, accountId) async {
  ref.watch(authModeProvider);
  final api = ref.watch(apiClientProvider);

  try {
    final response = await api.get('/accounts/$accountId/hierarchy');
    final data = response.data;
    if (data is Map<String, dynamic>) {
      return AccountHierarchyNode.fromJson(data);
    }
  } catch (_) {
    // API may not be available
  }
  return null;
});

/// Account hierarchy tree widget
class AccountHierarchyTree extends ConsumerWidget {
  final String accountId;

  const AccountHierarchyTree({
    super.key,
    required this.accountId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hierarchyAsync = ref.watch(accountHierarchyProvider(accountId));

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                Iconsax.hierarchy_3,
                size: 20,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 10),
              Text(
                'Account Hierarchy',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ).animate().fadeIn(duration: 300.ms),
          const SizedBox(height: 16),

          // Tree content
          hierarchyAsync.when(
            data: (node) {
              if (node == null) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      'No hierarchy data available',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ),
                );
              }
              return _HierarchyNodeWidget(
                node: node,
                depth: 0,
                isDark: isDark,
              );
            },
            loading: () => Column(
              children: List.generate(
                3,
                (i) => Padding(
                  padding: EdgeInsets.only(left: i * 24.0, bottom: 12),
                  child: const IrisShimmer(width: double.infinity, height: 44),
                ),
              ),
            ),
            error: (_, _) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'Unable to load hierarchy',
                  style: IrisTheme.bodySmall.copyWith(
                    color: IrisTheme.error,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HierarchyNodeWidget extends StatelessWidget {
  final AccountHierarchyNode node;
  final int depth;
  final bool isDark;

  const _HierarchyNodeWidget({
    required this.node,
    required this.depth,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // This node
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            context.push('/accounts/${node.id}');
          },
          child: Container(
            margin: EdgeInsets.only(left: depth * 24.0, bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: node.isCurrent
                  ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                  : (isDark
                      ? IrisTheme.darkSurfaceElevated
                      : IrisTheme.lightSurfaceElevated),
              borderRadius: BorderRadius.circular(12),
              border: node.isCurrent
                  ? Border.all(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    )
                  : null,
            ),
            child: Row(
              children: [
                // Connector line indicator
                if (depth > 0) ...[
                  Container(
                    width: 12,
                    height: 2,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.15)
                        : Colors.black.withValues(alpha: 0.1),
                  ),
                  const SizedBox(width: 8),
                ],
                Icon(
                  node.children.isEmpty ? Iconsax.building : Iconsax.building_4,
                  size: 18,
                  color: node.isCurrent
                      ? LuxuryColors.rolexGreen
                      : LuxuryColors.champagneGold,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        node.name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          fontWeight: node.isCurrent
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (node.type != null)
                        Text(
                          node.type!,
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                          ),
                        ),
                    ],
                  ),
                ),
                if (node.isCurrent)
                  LuxuryBadge(
                    text: 'Current',
                    color: LuxuryColors.rolexGreen,
                  ),
                Icon(
                  Icons.chevron_right,
                  size: 18,
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
              ],
            ),
          ),
        ).animate(delay: (depth * 100).ms).fadeIn().slideX(begin: 0.05),

        // Children
        ...node.children.map((child) => _HierarchyNodeWidget(
              node: child,
              depth: depth + 1,
              isDark: isDark,
            )),
      ],
    );
  }
}
