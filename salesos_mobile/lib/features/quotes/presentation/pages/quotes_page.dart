import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/providers/connectivity_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/filter_pill_tabs.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../data/quotes_service.dart';
import '../widgets/quote_form.dart';

/// Quote filter options
enum QuoteFilter {
  all,
  draft,
  pendingApproval,
  approved,
  sent,
  viewed,
  accepted,
  rejected,
  expired,
  cancelled;

  String get label {
    switch (this) {
      case QuoteFilter.all:
        return 'All';
      case QuoteFilter.draft:
        return 'Draft';
      case QuoteFilter.pendingApproval:
        return 'Pending';
      case QuoteFilter.approved:
        return 'Approved';
      case QuoteFilter.sent:
        return 'Sent';
      case QuoteFilter.viewed:
        return 'Viewed';
      case QuoteFilter.accepted:
        return 'Accepted';
      case QuoteFilter.rejected:
        return 'Rejected';
      case QuoteFilter.expired:
        return 'Expired';
      case QuoteFilter.cancelled:
        return 'Cancelled';
    }
  }
}

class QuotesPage extends ConsumerStatefulWidget {
  const QuotesPage({super.key});

  @override
  ConsumerState<QuotesPage> createState() => _QuotesPageState();
}

class _QuotesPageState extends ConsumerState<QuotesPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  QuoteFilter _selectedFilter = QuoteFilter.all;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
    });
  }

  Future<void> _onRefresh() async {
    ref.invalidate(quotesProvider);
  }

  List<QuoteModel> _filterQuotes(List<QuoteModel> quotes) {
    var filtered = quotes;

    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((quote) {
        return quote.quoteNumber.toLowerCase().contains(_searchQuery) ||
            quote.customerName.toLowerCase().contains(_searchQuery) ||
            (quote.customerCompany?.toLowerCase().contains(_searchQuery) ?? false) ||
            (quote.description?.toLowerCase().contains(_searchQuery) ?? false) ||
            (quote.dealName?.toLowerCase().contains(_searchQuery) ?? false);
      }).toList();
    }

    switch (_selectedFilter) {
      case QuoteFilter.all:
        break;
      case QuoteFilter.draft:
        filtered = filtered.where((q) => q.status == QuoteStatus.DRAFT).toList();
        break;
      case QuoteFilter.pendingApproval:
        filtered = filtered.where((q) => q.status == QuoteStatus.PENDING_APPROVAL).toList();
        break;
      case QuoteFilter.approved:
        filtered = filtered.where((q) => q.status == QuoteStatus.APPROVED).toList();
        break;
      case QuoteFilter.sent:
        filtered = filtered.where((q) => q.status == QuoteStatus.SENT).toList();
        break;
      case QuoteFilter.viewed:
        filtered = filtered.where((q) => q.status == QuoteStatus.VIEWED).toList();
        break;
      case QuoteFilter.accepted:
        filtered = filtered.where((q) => q.status == QuoteStatus.ACCEPTED).toList();
        break;
      case QuoteFilter.rejected:
        filtered = filtered.where((q) => q.status == QuoteStatus.REJECTED).toList();
        break;
      case QuoteFilter.expired:
        filtered = filtered.where((q) => q.status == QuoteStatus.EXPIRED || q.isExpired).toList();
        break;
      case QuoteFilter.cancelled:
        filtered = filtered.where((q) => q.status == QuoteStatus.CANCELLED).toList();
        break;
    }

    filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return filtered;
  }

  int _getFilterCount(List<QuoteModel> quotes, QuoteFilter filter) {
    switch (filter) {
      case QuoteFilter.all:
        return quotes.length;
      case QuoteFilter.draft:
        return quotes.where((q) => q.status == QuoteStatus.DRAFT).length;
      case QuoteFilter.pendingApproval:
        return quotes.where((q) => q.status == QuoteStatus.PENDING_APPROVAL).length;
      case QuoteFilter.approved:
        return quotes.where((q) => q.status == QuoteStatus.APPROVED).length;
      case QuoteFilter.sent:
        return quotes.where((q) => q.status == QuoteStatus.SENT).length;
      case QuoteFilter.viewed:
        return quotes.where((q) => q.status == QuoteStatus.VIEWED).length;
      case QuoteFilter.accepted:
        return quotes.where((q) => q.status == QuoteStatus.ACCEPTED).length;
      case QuoteFilter.rejected:
        return quotes.where((q) => q.status == QuoteStatus.REJECTED).length;
      case QuoteFilter.expired:
        return quotes.where((q) => q.status == QuoteStatus.EXPIRED || q.isExpired).length;
      case QuoteFilter.cancelled:
        return quotes.where((q) => q.status == QuoteStatus.CANCELLED).length;
    }
  }

  void _showCreateQuoteSheet() {
    HapticFeedback.lightImpact();
    QuoteForm.show(
      context: context,
      onSuccess: () {
        ref.invalidate(quotesProvider);
      },
    );
  }

  void _onQuoteTap(QuoteModel quote) {
    HapticFeedback.lightImpact();
    context.push('${AppRoutes.quotes}/${quote.id}');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final quotesAsync = ref.watch(quotesProvider);
    final isTablet = Responsive.shouldShowSplitView(context);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: Column(
          children: [
            OfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
                _onRefresh();
              },
            ),

            // Header
            _PageHeader(
              onBack: () => context.pop(),
              onCreateQuote: _showCreateQuoteSheet,
            ),

            // Summary Cards
            quotesAsync.when(
              data: (quotes) => _SummarySection(quotes: quotes),
              loading: () => const SizedBox(height: 90),
              error: (_, _) => const SizedBox(height: 90),
            ),

            const SizedBox(height: 16),

            // Search
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SearchField(
                controller: _searchController,
                hint: 'Search quotes...',
              ),
            ).animate(delay: 100.ms).fadeIn(),

            const SizedBox(height: 12),

            // Filters
            quotesAsync.when(
              data: (quotes) => FilterPillTabs<QuoteFilter>(
                items: QuoteFilter.values.map((filter) {
                  return FilterPillItem<QuoteFilter>(
                    value: filter,
                    label: filter.label,
                    count: _getFilterCount(quotes, filter),
                  );
                }).toList(),
                selectedValue: _selectedFilter,
                onSelected: (filter) {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedFilter = filter);
                },
              ),
              loading: () => const SizedBox(height: 40),
              error: (_, _) => const SizedBox(height: 40),
            ),

            const SizedBox(height: 12),

            // List
            Expanded(
              child: quotesAsync.when(
                data: (quotes) {
                  final filteredQuotes = _filterQuotes(quotes);

                  if (filteredQuotes.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.document_text,
                      title: _searchQuery.isNotEmpty || _selectedFilter != QuoteFilter.all
                          ? 'No quotes found'
                          : 'No quotes yet',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search'
                          : 'Create your first quote',
                      actionLabel: _searchQuery.isEmpty && _selectedFilter == QuoteFilter.all
                          ? 'Create Quote'
                          : null,
                      onAction: _searchQuery.isEmpty && _selectedFilter == QuoteFilter.all
                          ? _showCreateQuoteSheet
                          : null,
                      tier: LuxuryTier.gold,
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: LuxuryColors.champagneGold,
                    backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
                    child: isTablet
                        ? _TabletQuoteGrid(
                            quotes: filteredQuotes,
                            onQuoteTap: _onQuoteTap,
                          )
                        : _PhoneQuoteList(
                            quotes: filteredQuotes,
                            onQuoteTap: _onQuoteTap,
                          ),
                  );
                },
                loading: () => const IrisListShimmer(
                  itemCount: 5,
                  itemHeight: 120,
                  tier: LuxuryTier.gold,
                ),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                      const SizedBox(height: 16),
                      Text('Failed to load quotes', style: TextStyle(
                        fontSize: 16,
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                      )),
                      const SizedBox(height: 16),
                      TextButton.icon(
                        onPressed: _onRefresh,
                        icon: const Icon(Iconsax.refresh),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateQuoteSheet,
        backgroundColor: LuxuryColors.champagneGold,
        foregroundColor: Colors.white,
        icon: const Icon(Iconsax.add),
        label: const Text('New Quote'),
      ),
    );
  }
}

class _PageHeader extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onCreateQuote;

  const _PageHeader({
    required this.onBack,
    required this.onCreateQuote,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              onBack();
            },
            icon: Icon(
              Iconsax.arrow_left,
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Quotes',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _SummarySection extends StatelessWidget {
  final List<QuoteModel> quotes;

  const _SummarySection({required this.quotes});

  String _formatAmount(double amount) {
    if (amount >= 1000000) return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    if (amount >= 1000) return '\$${(amount / 1000).toStringAsFixed(0)}K';
    return '\$${amount.toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final pipeline = quotes
        .where((q) => q.status == QuoteStatus.SENT || q.status == QuoteStatus.DRAFT ||
            q.status == QuoteStatus.PENDING_APPROVAL || q.status == QuoteStatus.APPROVED ||
            q.status == QuoteStatus.VIEWED)
        .fold<double>(0, (sum, q) => sum + q.subtotal);
    final won = quotes
        .where((q) => q.status == QuoteStatus.ACCEPTED)
        .fold<double>(0, (sum, q) => sum + q.subtotal);
    final pending = quotes.where((q) => q.status == QuoteStatus.SENT ||
        q.status == QuoteStatus.PENDING_APPROVAL || q.status == QuoteStatus.VIEWED).length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Row(
        children: [
          Expanded(
            child: _SummaryCard(
              label: 'Pipeline',
              value: _formatAmount(pipeline),
              color: LuxuryColors.champagneGold,
              isDark: isDark,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _SummaryCard(
              label: 'Won',
              value: _formatAmount(won),
              color: LuxuryColors.jadePremium,
              isDark: isDark,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _SummaryCard(
              label: 'Pending',
              value: '$pending',
              color: LuxuryColors.infoCobalt,
              isDark: isDark,
            ),
          ),
        ],
      ),
    ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1);
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _SummaryCard({
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;

  const _SearchField({required this.controller, required this.hint});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TextField(
      controller: controller,
      style: TextStyle(
        fontSize: 15,
        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: LuxuryColors.textMuted),
        prefixIcon: Icon(Iconsax.search_normal, size: 20, color: LuxuryColors.champagneGold),
        filled: true,
        fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: LuxuryColors.champagneGold),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}

class _PhoneQuoteList extends StatelessWidget {
  final List<QuoteModel> quotes;
  final Function(QuoteModel) onQuoteTap;

  const _PhoneQuoteList({required this.quotes, required this.onQuoteTap});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
      itemCount: quotes.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _QuoteCard(
            quote: quotes[index],
            onTap: () => onQuoteTap(quotes[index]),
          ).animate(delay: Duration(milliseconds: 30 * index)).fadeIn().slideX(begin: 0.02),
        );
      },
    );
  }
}

/// Tablet: Proper 2-column grid with natural top-to-bottom, left-to-right flow
class _TabletQuoteGrid extends StatelessWidget {
  final List<QuoteModel> quotes;
  final Function(QuoteModel) onQuoteTap;

  const _TabletQuoteGrid({required this.quotes, required this.onQuoteTap});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
      itemCount: (quotes.length / 2).ceil(),
      itemBuilder: (context, rowIndex) {
        final leftIndex = rowIndex * 2;
        final rightIndex = leftIndex + 1;

        return Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left card
              Expanded(
                child: _QuoteCard(
                  quote: quotes[leftIndex],
                  onTap: () => onQuoteTap(quotes[leftIndex]),
                ).animate(delay: Duration(milliseconds: 30 * leftIndex)).fadeIn(),
              ),
              const SizedBox(width: 14),
              // Right card (or empty space)
              Expanded(
                child: rightIndex < quotes.length
                    ? _QuoteCard(
                        quote: quotes[rightIndex],
                        onTap: () => onQuoteTap(quotes[rightIndex]),
                      ).animate(delay: Duration(milliseconds: 30 * rightIndex)).fadeIn()
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Clean Quote Card - no accent lines, proper contained design
class _QuoteCard extends StatelessWidget {
  final QuoteModel quote;
  final VoidCallback onTap;

  const _QuoteCard({required this.quote, required this.onTap});

  String _formatAmount(double amount) {
    if (amount >= 1000000) return '\$${(amount / 1000000).toStringAsFixed(2)}M';
    if (amount >= 1000) return '\$${(amount / 1000).toStringAsFixed(1)}K';
    return '\$${amount.toStringAsFixed(2)}';
  }

  Color _getStatusColor() {
    switch (quote.status) {
      case QuoteStatus.DRAFT: return LuxuryColors.warmGray;
      case QuoteStatus.PENDING_APPROVAL: return LuxuryColors.warningAmber;
      case QuoteStatus.APPROVED: return LuxuryColors.jadePremium;
      case QuoteStatus.SENT: return LuxuryColors.champagneGold;
      case QuoteStatus.VIEWED: return LuxuryColors.infoCobalt;
      case QuoteStatus.ACCEPTED: return LuxuryColors.jadePremium;
      case QuoteStatus.REJECTED: return LuxuryColors.errorRuby;
      case QuoteStatus.EXPIRED: return LuxuryColors.warningAmber;
      case QuoteStatus.CANCELLED: return LuxuryColors.textMuted;
    }
  }

  IconData _getStatusIcon() {
    switch (quote.status) {
      case QuoteStatus.DRAFT: return Iconsax.document_text;
      case QuoteStatus.PENDING_APPROVAL: return Iconsax.clock;
      case QuoteStatus.APPROVED: return Iconsax.verify;
      case QuoteStatus.SENT: return Iconsax.send_2;
      case QuoteStatus.VIEWED: return Iconsax.eye;
      case QuoteStatus.ACCEPTED: return Iconsax.tick_circle;
      case QuoteStatus.REJECTED: return Iconsax.close_circle;
      case QuoteStatus.EXPIRED: return Iconsax.timer;
      case QuoteStatus.CANCELLED: return Iconsax.close_square;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statusColor = _getStatusColor();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.grey.withValues(alpha: 0.15),
            ),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.3)
                    : Colors.black.withValues(alpha: 0.05),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top row: Quote number + Status
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        quote.quoteNumber,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_getStatusIcon(), size: 12, color: statusColor),
                          const SizedBox(width: 4),
                          Text(
                            quote.status.label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Customer row
                Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: statusColor.withValues(alpha: 0.15),
                      child: Text(
                        quote.customerName.isNotEmpty
                            ? quote.customerName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join()
                            : '?',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            quote.customerName,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (quote.customerCompany != null)
                            Text(
                              quote.customerCompany!,
                              style: TextStyle(fontSize: 12, color: LuxuryColors.textMuted),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Amount row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _formatAmount(quote.subtotal),
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: LuxuryColors.champagneGold,
                      ),
                    ),
                    if (quote.expirationDate != null)
                      _ExpiryBadge(quote: quote),
                  ],
                ),

                // Deal link
                if (quote.dealName != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Iconsax.link, size: 12, color: LuxuryColors.rolexGreen),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          quote.dealName!,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: LuxuryColors.rolexGreen,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ExpiryBadge extends StatelessWidget {
  final QuoteModel quote;

  const _ExpiryBadge({required this.quote});

  @override
  Widget build(BuildContext context) {
    final daysLeft = quote.daysUntilExpiry;
    final isExpired = quote.isExpired;

    Color color;
    String text;

    if (isExpired) {
      color = LuxuryColors.errorRuby;
      text = 'Expired';
    } else if (daysLeft <= 3) {
      color = LuxuryColors.errorRuby;
      text = '${daysLeft}d left';
    } else if (daysLeft <= 7) {
      color = LuxuryColors.warningAmber;
      text = '${daysLeft}d left';
    } else {
      color = LuxuryColors.textMuted;
      text = '${daysLeft}d left';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Iconsax.calendar, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
