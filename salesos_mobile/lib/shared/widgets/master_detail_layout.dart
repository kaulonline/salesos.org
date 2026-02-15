import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../core/utils/responsive.dart';

/// A callback for when an item is selected in the master list
typedef OnItemSelected<T> = void Function(T item);

/// Master-Detail layout that adapts between phone and tablet
/// - Phone: Shows master OR detail (full screen navigation)
/// - Tablet Portrait: Full master, detail slides in from right
/// - Tablet Landscape: 35/65 split with persistent detail pane
class MasterDetailLayout<T> extends StatefulWidget {
  /// The master list view (left pane on tablets)
  final Widget masterView;

  /// Builder for the detail view based on selected item
  final Widget Function(T item)? detailBuilder;

  /// Currently selected item (null shows empty state)
  final T? selectedItem;

  /// Callback when selection changes
  final OnItemSelected<T>? onItemSelected;

  /// Callback when detail panel is closed
  final VoidCallback? onDetailClosed;

  /// Empty state widget when no item is selected
  final Widget? emptyDetailState;

  /// Title for the detail panel (shown on tablets)
  final String? detailTitle;

  /// Whether to show a close button on the detail panel
  final bool showDetailClose;

  const MasterDetailLayout({
    super.key,
    required this.masterView,
    this.detailBuilder,
    this.selectedItem,
    this.onItemSelected,
    this.onDetailClosed,
    this.emptyDetailState,
    this.detailTitle,
    this.showDetailClose = true,
  });

  @override
  State<MasterDetailLayout<T>> createState() => _MasterDetailLayoutState<T>();
}

class _MasterDetailLayoutState<T> extends State<MasterDetailLayout<T>>
    with SingleTickerProviderStateMixin {
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 250),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(1.0, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));
  }

  @override
  void didUpdateWidget(covariant MasterDetailLayout<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Animate detail panel in/out when selection changes
    if (widget.selectedItem != null && oldWidget.selectedItem == null) {
      _slideController.forward();
    } else if (widget.selectedItem == null && oldWidget.selectedItem != null) {
      _slideController.reverse();
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    super.dispose();
  }

  void _closeDetail() {
    HapticFeedback.lightImpact();
    widget.onDetailClosed?.call();
  }

  @override
  Widget build(BuildContext context) {
    final showSplitView = Responsive.shouldShowSplitView(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (showSplitView) {
      return _buildSplitLayout(context, isDark);
    } else {
      return _buildStackLayout(context, isDark);
    }
  }

  /// Split layout for tablets (side-by-side master and detail)
  Widget _buildSplitLayout(BuildContext context, bool isDark) {
    final (masterFlex, detailFlex) = Responsive.getMasterDetailRatio(context);

    return Row(
      children: [
        // Master pane (list)
        Expanded(
          flex: masterFlex,
          child: Container(
            decoration: BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  width: 1,
                ),
              ),
            ),
            child: widget.masterView,
          ),
        ),
        // Detail pane
        Expanded(
          flex: detailFlex,
          child: _buildDetailPane(context, isDark),
        ),
      ],
    );
  }

  /// Stack layout for phones (master with sliding detail)
  Widget _buildStackLayout(BuildContext context, bool isDark) {
    return Stack(
      children: [
        // Master view (always visible)
        widget.masterView,
        // Sliding detail panel
        if (widget.selectedItem != null)
          SlideTransition(
            position: _slideAnimation,
            child: Container(
              color: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
              child: _buildDetailPane(context, isDark, showAppBar: true),
            ),
          ),
      ],
    );
  }

  /// Build the detail pane content
  Widget _buildDetailPane(BuildContext context, bool isDark, {bool showAppBar = false}) {
    if (widget.selectedItem == null) {
      return widget.emptyDetailState ?? _DefaultEmptyState(isDark: isDark);
    }

    final detailContent = widget.detailBuilder?.call(widget.selectedItem as T);

    if (showAppBar) {
      // Phone layout: include app bar for navigation
      return Scaffold(
        backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightSurface,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new,
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
            onPressed: _closeDetail,
          ),
          title: widget.detailTitle != null
              ? Text(
                  widget.detailTitle!,
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                )
              : null,
          elevation: 0,
        ),
        body: detailContent ?? const SizedBox.shrink(),
      );
    }

    // Tablet layout: detail without app bar (or with minimal header)
    return Column(
      children: [
        // Optional header with close button
        if (widget.showDetailClose || widget.detailTitle != null)
          _DetailHeader(
            title: widget.detailTitle,
            isDark: isDark,
            onClose: widget.showDetailClose ? _closeDetail : null,
          ),
        // Detail content
        Expanded(
          child: detailContent ?? const SizedBox.shrink(),
        ),
      ],
    );
  }
}

/// Detail panel header for tablet layout
class _DetailHeader extends StatelessWidget {
  final String? title;
  final bool isDark;
  final VoidCallback? onClose;

  const _DetailHeader({
    this.title,
    required this.isDark,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        border: Border(
          bottom: BorderSide(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          if (title != null)
            Expanded(
              child: Text(
                title!,
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ),
          if (onClose != null)
            IconButton(
              icon: Icon(
                Icons.close,
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
              onPressed: onClose,
              tooltip: 'Close detail',
            ),
        ],
      ),
    );
  }
}

/// Default empty state when no item is selected
class _DefaultEmptyState extends StatelessWidget {
  final bool isDark;

  const _DefaultEmptyState({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: isDark
                  ? IrisTheme.darkSurfaceElevated
                  : IrisTheme.lightSurfaceElevated,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              Iconsax.document_text,
              size: 36,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Select an item to view details',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Choose from the list on the left',
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Selectable list item wrapper that highlights when selected
class SelectableListItem extends StatefulWidget {
  final Widget child;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback? onDoubleTap;

  const SelectableListItem({
    super.key,
    required this.child,
    required this.isSelected,
    required this.onTap,
    this.onDoubleTap,
  });

  @override
  State<SelectableListItem> createState() => _SelectableListItemState();
}

class _SelectableListItemState extends State<SelectableListItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          widget.onTap();
        },
        onDoubleTap: widget.onDoubleTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: widget.isSelected
                ? LuxuryColors.rolexGreen.withValues(alpha: 0.12)
                : (_isHovered
                    ? (isDark
                        ? Colors.white.withValues(alpha: 0.03)
                        : Colors.black.withValues(alpha: 0.02))
                    : Colors.transparent),
            border: widget.isSelected
                ? Border(
                    left: BorderSide(
                      color: LuxuryColors.rolexGreen,
                      width: 3,
                    ),
                  )
                : null,
          ),
          child: widget.child,
        ),
      ),
    );
  }
}
