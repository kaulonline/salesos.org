import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/orders_service.dart';
import 'order_card.dart';

/// Visual order pipeline stepper showing:
/// Draft -> Pending -> Confirmed -> Processing -> Shipped -> Delivered
/// Current step highlighted with accent color, past steps show check marks,
/// future steps shown as inactive.
class OrderStatusTracker extends StatelessWidget {
  final OrderStatus currentStatus;

  const OrderStatusTracker({
    super.key,
    required this.currentStatus,
  });

  /// The ordered pipeline stages for the tracker
  static const List<OrderStatus> _pipelineStages = [
    OrderStatus.DRAFT,
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];

  int get _currentStepIndex {
    if (currentStatus == OrderStatus.CANCELLED || currentStatus == OrderStatus.RETURNED) return -1;
    if (currentStatus == OrderStatus.COMPLETED) return _pipelineStages.length;
    final idx = _pipelineStages.indexOf(currentStatus);
    return idx >= 0 ? idx : 0;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isCancelled = currentStatus == OrderStatus.CANCELLED || currentStatus == OrderStatus.RETURNED;
    final isCompleted = currentStatus == OrderStatus.COMPLETED;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 16),
            child: Text(
              'ORDER STATUS',
              style: IrisTheme.overline.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 2,
              ),
            ),
          ),

          // Cancelled state
          if (isCancelled) ...[
            _CancelledBanner(isDark: isDark),
          ] else ...[
            // Stepper
            LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minWidth: constraints.maxWidth),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(_pipelineStages.length, (index) {
                        final stage = _pipelineStages[index];
                        final isPast = (index < _currentStepIndex || isCompleted) && !isCancelled;
                        final isCurrent = index == _currentStepIndex && !isCompleted && !isCancelled;
                        final isFuture = (index > _currentStepIndex && !isCompleted) || isCancelled;

                        return Expanded(
                          child: Row(
                            children: [
                              // Step circle and label
                              _StepItem(
                                stage: stage,
                                isPast: isPast,
                                isCurrent: isCurrent,
                                isFuture: isFuture,
                                isDark: isDark,
                              ),
                              // Connector line (except for last item)
                              if (index < _pipelineStages.length - 1)
                                Expanded(
                                  child: Container(
                                    height: 2,
                                    margin: const EdgeInsets.only(bottom: 18),
                                    decoration: BoxDecoration(
                                      color: isPast
                                          ? LuxuryColors.rolexGreen
                                          : (isCurrent
                                              ? LuxuryColors.rolexGreen.withValues(alpha: 0.4)
                                              : (isDark
                                                  ? IrisTheme.darkBorder
                                                  : IrisTheme.lightBorder)),
                                      borderRadius: BorderRadius.circular(1),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        );
                      }),
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }
}

class _StepItem extends StatelessWidget {
  final OrderStatus stage;
  final bool isPast;
  final bool isCurrent;
  final bool isFuture;
  final bool isDark;

  const _StepItem({
    required this.stage,
    required this.isPast,
    required this.isCurrent,
    required this.isFuture,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Circle
        Container(
          width: isCurrent ? 32 : 26,
          height: isCurrent ? 32 : 26,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isPast
                ? LuxuryColors.rolexGreen
                : (isCurrent
                    ? LuxuryColors.rolexGreen
                    : (isDark
                        ? IrisTheme.darkSurfaceElevated
                        : IrisTheme.lightSurfaceElevated)),
            border: Border.all(
              color: isPast || isCurrent
                  ? LuxuryColors.rolexGreen
                  : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
              width: isCurrent ? 2.5 : 1.5,
            ),
            boxShadow: isCurrent
                ? [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: isPast
                ? const Icon(
                    Icons.check,
                    size: 14,
                    color: Colors.white,
                  )
                : isCurrent
                    ? Icon(
                        stage.icon,
                        size: 14,
                        color: Colors.white,
                      )
                    : Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                      ),
          ),
        ),
        const SizedBox(height: 6),
        // Label
        Text(
          stage.label,
          style: IrisTheme.caption.copyWith(
            color: isCurrent
                ? LuxuryColors.rolexGreen
                : (isPast
                    ? (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary)
                    : (isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary)),
            fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
            fontSize: 10,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _CancelledBanner extends StatelessWidget {
  final bool isDark;

  const _CancelledBanner({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: LuxuryColors.errorRuby.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Iconsax.close_circle,
              size: 20,
              color: LuxuryColors.errorRuby,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Order Cancelled',
                  style: IrisTheme.titleSmall.copyWith(
                    color: LuxuryColors.errorRuby,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'This order has been cancelled and cannot be processed.',
                  style: IrisTheme.bodySmall.copyWith(
                    color: LuxuryColors.textMuted,
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

/// Compact horizontal stepper for use inside cards or list items
class CompactOrderStatusTracker extends StatelessWidget {
  final OrderStatus currentStatus;

  const CompactOrderStatusTracker({
    super.key,
    required this.currentStatus,
  });

  static const List<OrderStatus> _stages = [
    OrderStatus.DRAFT,
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];

  int get _currentIndex {
    if (currentStatus == OrderStatus.CANCELLED || currentStatus == OrderStatus.RETURNED) return -1;
    if (currentStatus == OrderStatus.COMPLETED) return _stages.length;
    return _stages.indexOf(currentStatus);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isCancelled = currentStatus == OrderStatus.CANCELLED || currentStatus == OrderStatus.RETURNED;

    if (isCancelled) {
      return Container(
        height: 4,
        decoration: BoxDecoration(
          color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(2),
        ),
      );
    }

    return Row(
      children: List.generate(_stages.length, (index) {
        final isPast = index < _currentIndex || currentStatus == OrderStatus.COMPLETED;
        final isCurrent = index == _currentIndex;

        return Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(right: index < _stages.length - 1 ? 2 : 0),
            decoration: BoxDecoration(
              color: isPast || isCurrent
                  ? LuxuryColors.rolexGreen
                  : (isDark
                      ? IrisTheme.darkBorder
                      : IrisTheme.lightBorder),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }
}
