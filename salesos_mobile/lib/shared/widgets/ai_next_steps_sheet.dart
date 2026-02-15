import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import '../../core/config/routes.dart';
import '../../core/network/api_client.dart';
import '../../core/services/iris_rank_service.dart';
import 'luxury_card.dart';

/// Model for AI-generated next step
class NextStep {
  final String priority;
  final String action;
  final String reasoning;
  final String timing;

  NextStep({
    required this.priority,
    required this.action,
    required this.reasoning,
    required this.timing,
  });

  factory NextStep.fromJson(Map<String, dynamic> json) {
    return NextStep(
      priority: json['priority'] as String? ?? 'medium',
      action: json['action'] as String? ?? '',
      reasoning: json['reasoning'] as String? ?? '',
      timing: json['timing'] as String? ?? '',
    );
  }
}

/// Response model for next steps API
class NextStepsResponse {
  final bool success;
  final String entityId;
  final String entityName;
  final String entityType;
  final List<NextStep> nextSteps;
  final String summary;

  NextStepsResponse({
    required this.success,
    required this.entityId,
    required this.entityName,
    required this.entityType,
    required this.nextSteps,
    required this.summary,
  });

  factory NextStepsResponse.fromJson(Map<String, dynamic> json) {
    return NextStepsResponse(
      success: json['success'] as bool? ?? false,
      entityId: json['entityId'] as String? ?? '',
      entityName: json['entityName'] as String? ?? '',
      entityType: json['entityType'] as String? ?? '',
      nextSteps: (json['nextSteps'] as List<dynamic>?)
              ?.map((e) => NextStep.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      summary: json['summary'] as String? ?? '',
    );
  }
}

/// Provider for fetching AI next steps
final nextStepsProvider = FutureProvider.family<NextStepsResponse?, IRISRankResult>((ref, entity) async {
  final api = ref.watch(apiClientProvider);

  try {
    final response = await api.post(
      '/iris-rank/next-steps',
      data: {
        'entity': {
          'id': entity.id,
          'type': entity.type,
          'name': entity.name,
          'properties': entity.properties,
        },
      },
    );

    if (response.statusCode == 200 && response.data != null) {
      return NextStepsResponse.fromJson(response.data as Map<String, dynamic>);
    }
    return null;
  } catch (e) {
    return null;
  }
});

/// Centered dialog to display AI-generated next steps for an entity
class AiNextStepsSheet extends ConsumerWidget {
  final IRISRankResult entity;

  const AiNextStepsSheet({
    super.key,
    required this.entity,
  });

  /// Show the centered dialog
  static Future<void> show(BuildContext context, IRISRankResult entity) {
    HapticFeedback.mediumImpact();
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: AiNextStepsSheet(entity: entity),
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
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nextStepsAsync = ref.watch(nextStepsProvider(entity));
    final screenSize = MediaQuery.of(context).size;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: 500,
          maxHeight: screenSize.height * 0.85 - bottomInset,
        ),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
            BoxShadow(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.08),
              blurRadius: 40,
              spreadRadius: -10,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 16, 16),
                child: _buildHeader(context, isDark),
              ),
              // Divider
              Container(
                height: 1,
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      LuxuryColors.champagneGold.withValues(alpha: 0.3),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              // Content
              Flexible(
                child: nextStepsAsync.when(
                  loading: () => _buildLoadingState(isDark),
                  error: (e, _) => _buildErrorState(isDark, e.toString()),
                  data: (response) {
                    if (response == null) {
                      return _buildErrorState(isDark, 'Failed to generate next steps');
                    }
                    return _buildContent(context, response, isDark);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 200.ms).scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1, 1),
          duration: 200.ms,
          curve: Curves.easeOut,
        );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Row(
      children: [
        // Entity avatar
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: LuxuryColors.emeraldGradient,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: Text(
              entity.initials,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        // Entity info
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                entity.name,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      entity.type,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: LuxuryColors.rolexGreen,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Iconsax.cpu,
                    size: 14,
                    color: LuxuryColors.champagneGold,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'AI Insights',
                    style: TextStyle(
                      fontSize: 12,
                      color: LuxuryColors.champagneGold,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Close button
        IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: Icon(
            Iconsax.close_circle,
            color: isDark ? LuxuryColors.textMuted : Colors.grey[400],
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              gradient: LuxuryColors.emeraldGradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
            ),
          ).animate(onPlay: (c) => c.repeat())
              .shimmer(duration: 1500.ms, color: Colors.white.withValues(alpha: 0.3)),
          const SizedBox(height: 20),
          Text(
            'Analyzing ${entity.name}...',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Generating personalized next steps',
            style: TextStyle(
              fontSize: 14,
              color: LuxuryColors.textMuted,
            ),
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildErrorState(bool isDark, String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Iconsax.warning_2,
              size: 48,
              color: IrisTheme.warning,
            ),
            const SizedBox(height: 16),
            Text(
              'Unable to generate insights',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: TextStyle(
                fontSize: 14,
                color: LuxuryColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    NextStepsResponse response,
    bool isDark,
  ) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        // Summary card
        if (response.summary.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  LuxuryColors.deepEmerald.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Iconsax.lamp_charge,
                  color: LuxuryColors.rolexGreen,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    response.summary,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1),

        const SizedBox(height: 20),

        // Section header
        Row(
          children: [
            Icon(
              Iconsax.task_square,
              color: LuxuryColors.champagneGold,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              'Recommended Actions',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Next steps list
        ...response.nextSteps.asMap().entries.map((entry) {
          final index = entry.key;
          final step = entry.value;
          return _NextStepCard(
            step: step,
            index: index,
            isDark: isDark,
          ).animate(delay: (150 + index * 100).ms).fadeIn().slideX(begin: 0.05);
        }),

        const SizedBox(height: 16),

        // Action buttons
        Row(
          children: [
            Expanded(
              child: _ActionButton(
                icon: Iconsax.eye,
                label: 'View Details',
                color: LuxuryColors.rolexGreen,
                isDark: isDark,
                onTap: () {
                  Navigator.of(context).pop();
                  _navigateToEntity(context);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ActionButton(
                icon: Iconsax.message,
                label: 'Ask SalesOS',
                color: LuxuryColors.champagneGold,
                isDark: isDark,
                onTap: () {
                  Navigator.of(context).pop();
                  context.push(AppRoutes.aiChat);
                },
              ),
            ),
          ],
        ).animate(delay: 400.ms).fadeIn(),

        const SizedBox(height: 32),
      ],
    );
  }

  void _navigateToEntity(BuildContext context) {
    final route = _getRouteForEntityType();
    if (route != null && entity.id.isNotEmpty) {
      context.push('$route/${entity.id}');
    }
  }

  String? _getRouteForEntityType() {
    switch (entity.type.toLowerCase()) {
      case 'lead':
        return AppRoutes.leads;
      case 'contact':
        return AppRoutes.contacts;
      case 'account':
        return AppRoutes.accounts;
      case 'opportunity':
        return AppRoutes.deals;
      default:
        return null;
    }
  }
}

/// Individual next step card
class _NextStepCard extends StatelessWidget {
  final NextStep step;
  final int index;
  final bool isDark;

  const _NextStepCard({
    required this.step,
    required this.index,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final priorityColor = _getPriorityColor();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              // Step number
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: priorityColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: priorityColor,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Action text
              Expanded(
                child: Text(
                  step.action,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  ),
                ),
              ),
              // Priority badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: priorityColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  step.priority.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                    color: priorityColor,
                  ),
                ),
              ),
            ],
          ),

          // Reasoning
          if (step.reasoning.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              step.reasoning,
              style: TextStyle(
                fontSize: 13,
                color: LuxuryColors.textMuted,
                height: 1.4,
              ),
            ),
          ],

          // Timing
          if (step.timing.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  Iconsax.clock,
                  size: 14,
                  color: LuxuryColors.champagneGold,
                ),
                const SizedBox(width: 6),
                Text(
                  step.timing,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Color _getPriorityColor() {
    switch (step.priority.toLowerCase()) {
      case 'high':
        return IrisTheme.error;
      case 'medium':
        return LuxuryColors.champagneGold;
      case 'low':
        return IrisTheme.success;
      default:
        return LuxuryColors.textMuted;
    }
  }
}

/// Action button at the bottom of the sheet
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
