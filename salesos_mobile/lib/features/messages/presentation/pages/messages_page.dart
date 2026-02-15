import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/messages_service.dart';

class MessagesPage extends ConsumerStatefulWidget {
  const MessagesPage({super.key});

  @override
  ConsumerState<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends ConsumerState<MessagesPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

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
    ref.invalidate(conversationsProvider);
  }

  List<ConversationModel> _filterConversations(
      List<ConversationModel> conversations) {
    if (_searchQuery.isEmpty) return conversations;
    return conversations.where((c) {
      return c.displayName.toLowerCase().contains(_searchQuery) ||
          (c.lastMessage?.toLowerCase().contains(_searchQuery) ?? false);
    }).toList();
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inMinutes < 1) return 'now';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays == 0) return DateFormat('HH:mm').format(dt);
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return DateFormat('E').format(dt);
    return DateFormat('MMM d').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final conversationsAsync = ref.watch(conversationsProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          HapticFeedback.mediumImpact();
          // TODO: Navigate to new conversation flow
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('New conversation coming soon')),
          );
        },
        backgroundColor: LuxuryColors.rolexGreen,
        child: const Icon(Iconsax.message_add_1, color: Colors.white),
      ),
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
                          'Messages',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        conversationsAsync.when(
                          data: (conversations) {
                            final totalUnread = conversations.fold<int>(
                                0, (sum, c) => sum + c.unreadCount);
                            return Text(
                              totalUnread > 0
                                  ? '$totalUnread unread messages'
                                  : '${conversations.length} conversations',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            );
                          },
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (_, _) => Text(
                            'Error loading messages',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: IrisSearchField(
                controller: _searchController,
                hint: 'Search conversations...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Conversations list
            Expanded(
              child: conversationsAsync.when(
                data: (conversations) {
                  final filtered = _filterConversations(conversations);
                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.message,
                      title: 'No conversations',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'No conversations match your search'
                          : 'Start a new conversation using the button below',
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
                        final conversation = filtered[index];
                        return _ConversationItem(
                          conversation: conversation,
                          formattedTime: _formatTime(conversation.updatedAt),
                          onTap: () => context
                              .push('/messages/${conversation.id}'),
                        ).animate(delay: (index * 50).ms).fadeIn().slideX(
                              begin: 0.05,
                            );
                      },
                    ),
                  );
                },
                loading: () => const IrisListShimmer(
                  itemCount: 6,
                  itemHeight: 76,
                ),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.warning_2,
                          size: 48, color: IrisTheme.error),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load conversations',
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

/// Conversation list item
class _ConversationItem extends StatelessWidget {
  final ConversationModel conversation;
  final String formattedTime;
  final VoidCallback? onTap;

  const _ConversationItem({
    required this.conversation,
    required this.formattedTime,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasUnread = conversation.unreadCount > 0;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        children: [
          // Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                conversation.displayName.isNotEmpty
                    ? conversation.displayName[0].toUpperCase()
                    : '?',
                style: IrisTheme.titleMedium.copyWith(
                  color: LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        conversation.displayName,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          fontWeight:
                              hasUnread ? FontWeight.w600 : FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      formattedTime,
                      style: IrisTheme.caption.copyWith(
                        color: hasUnread
                            ? LuxuryColors.rolexGreen
                            : (isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary),
                        fontWeight:
                            hasUnread ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        conversation.lastMessage ?? 'No messages yet',
                        style: IrisTheme.bodySmall.copyWith(
                          color: hasUnread
                              ? (isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary)
                              : (isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary),
                          fontWeight:
                              hasUnread ? FontWeight.w500 : FontWeight.w400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (hasUnread) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${conversation.unreadCount}',
                          style: IrisTheme.caption.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
