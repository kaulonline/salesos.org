import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/chat_service.dart';

/// Premium conversation sidebar widget with luxury dark theme
class ConversationSidebar extends ConsumerStatefulWidget {
  final String? selectedConversationId;
  final ValueChanged<String> onConversationSelected;
  final VoidCallback onNewConversation;
  final ValueChanged<String>? onConversationDeleted;

  const ConversationSidebar({
    super.key,
    this.selectedConversationId,
    required this.onConversationSelected,
    required this.onNewConversation,
    this.onConversationDeleted,
  });

  @override
  ConsumerState<ConversationSidebar> createState() => _ConversationSidebarState();
}

class _ConversationSidebarState extends ConsumerState<ConversationSidebar> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  List<ConversationModel> _conversations = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    setState(() => _isLoading = true);
    try {
      final chatService = ref.read(chatServiceProvider);
      final conversations = await chatService.getConversations();
      if (mounted) {
        setState(() {
          _conversations = conversations;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteConversation(ConversationModel conversation) async {
    final confirmed = await _showDeleteConfirmation(conversation);
    if (!confirmed) return;

    try {
      final chatService = ref.read(chatServiceProvider);
      await chatService.deleteConversation(conversation.id);

      if (mounted) {
        HapticFeedback.mediumImpact();
        setState(() {
          _conversations.removeWhere((c) => c.id == conversation.id);
        });
        widget.onConversationDeleted?.call(conversation.id);
      }
    } catch (e) {
      // Handle error silently - error already reported by service
    }
  }

  Future<bool> _showDeleteConfirmation(ConversationModel conversation) async {
    return await showDialog<bool>(
      context: context,
      useRootNavigator: false, // Use local navigator to avoid conflicts with go_router
      builder: (dialogContext) => AlertDialog(
        backgroundColor: LuxuryColors.obsidian,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Delete Conversation?',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.95),
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          'This will permanently delete "${conversation.title ?? 'this conversation'}" and all its messages.',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(
              'Cancel',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(
              backgroundColor: LuxuryColors.errorRuby.withValues(alpha: 0.2),
            ),
            child: Text(
              'Delete',
              style: TextStyle(color: LuxuryColors.errorRuby, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    ) ?? false;
  }

  Future<void> _deleteConversationWithoutConfirmation(ConversationModel conversation) async {
    try {
      final chatService = ref.read(chatServiceProvider);
      await chatService.deleteConversation(conversation.id);
      if (mounted) {
        HapticFeedback.mediumImpact();
        widget.onConversationDeleted?.call(conversation.id);
      }
    } catch (e) {
      // Error already reported by service, reload conversations to sync state
      if (mounted) _loadConversations();
    }
  }

  List<ConversationModel> get _filteredConversations {
    if (_searchQuery.isEmpty) return _conversations;
    final query = _searchQuery.toLowerCase();
    return _conversations.where((conv) {
      final title = (conv.title ?? '').toLowerCase();
      final hasMatchingMessage = conv.messages.any(
        (msg) => msg.content.toLowerCase().contains(query),
      );
      return title.contains(query) || hasMatchingMessage;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    // Floating sidebar with premium curved border
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Container(
        decoration: BoxDecoration(
          color: LuxuryColors.sidebarDark,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: LuxuryColors.sidebarDarkHover,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 0,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Column(
            children: [
              // Header
              _PremiumSidebarHeader(
                onNewConversation: widget.onNewConversation,
              ),

              // Search field
              _PremiumSearchField(
                controller: _searchController,
                onChanged: (value) => setState(() => _searchQuery = value),
              ),

              // Conversation list
              Expanded(
                child: _isLoading
                    ? Center(
                        child: CircularProgressIndicator(
                          color: LuxuryColors.champagneGold,
                          strokeWidth: 2,
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadConversations,
                        color: LuxuryColors.jadePremium,
                        backgroundColor: LuxuryColors.sidebarDark,
                        child: _filteredConversations.isEmpty
                            ? _PremiumEmptyState(hasSearch: _searchQuery.isNotEmpty)
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                itemCount: _filteredConversations.length,
                                separatorBuilder: (context, index) => Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 20),
                                  child: Divider(
                                    color: LuxuryColors.sidebarDarkActive,
                                    height: 1,
                                    thickness: 0.5,
                                  ),
                                ),
                                itemBuilder: (context, index) {
                                  final conv = _filteredConversations[index];
                                  return Dismissible(
                                    key: Key(conv.id),
                                    direction: DismissDirection.endToStart,
                                    background: Container(
                                      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: LuxuryColors.errorRuby.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      alignment: Alignment.centerRight,
                                      padding: const EdgeInsets.only(right: 20),
                                      child: const Icon(Iconsax.trash, color: Colors.white, size: 22),
                                    ),
                                    confirmDismiss: (direction) async {
                                      return await _showDeleteConfirmation(conv);
                                    },
                                    onDismissed: (direction) {
                                      setState(() {
                                        _conversations.removeWhere((c) => c.id == conv.id);
                                      });
                                      _deleteConversationWithoutConfirmation(conv);
                                    },
                                    child: _PremiumConversationCard(
                                      conversation: conv,
                                      isSelected: conv.id == widget.selectedConversationId,
                                      onTap: () {
                                        HapticFeedback.selectionClick();
                                        widget.onConversationSelected(conv.id);
                                      },
                                      onDelete: () => _deleteConversation(conv),
                                    ).animate().fadeIn(duration: 300.ms, delay: Duration(milliseconds: index * 50)),
                                  );
                                },
                              ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Premium sidebar header
class _PremiumSidebarHeader extends StatelessWidget {
  final VoidCallback onNewConversation;

  const _PremiumSidebarHeader({required this.onNewConversation});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: LuxuryColors.sidebarDarkActive,
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Iconsax.message_text_15, color: Colors.black, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Conversations',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.95),
                fontSize: 18,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ),
          GestureDetector(
            onTap: () {
              HapticFeedback.mediumImpact();
              onNewConversation();
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Iconsax.add, color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2, end: 0);
  }
}

/// Premium search field
class _PremiumSearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _PremiumSearchField({
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Container(
        decoration: BoxDecoration(
          color: LuxuryColors.sidebarDarkBorder,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: LuxuryColors.sidebarDarkActive,
            width: 0.5,
          ),
        ),
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.9),
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: 'Search conversations...',
            hintStyle: TextStyle(
              color: Colors.white.withValues(alpha: 0.4),
              fontSize: 14,
            ),
            prefixIcon: Icon(
              Iconsax.search_normal,
              color: Colors.white.withValues(alpha: 0.4),
              size: 18,
            ),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            isDense: true,
          ),
        ),
      ),
    );
  }
}

/// Premium conversation card
class _PremiumConversationCard extends StatefulWidget {
  final ConversationModel conversation;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback? onDelete;

  const _PremiumConversationCard({
    required this.conversation,
    required this.isSelected,
    required this.onTap,
    this.onDelete,
  });

  @override
  State<_PremiumConversationCard> createState() => _PremiumConversationCardState();
}

class _PremiumConversationCardState extends State<_PremiumConversationCard> {
  bool _isHovered = false;

  String get _preview {
    if (widget.conversation.messages.isEmpty) {
      return 'No messages yet';
    }
    final lastMessage = widget.conversation.messages.last;
    final content = lastMessage.content;
    if (content.length > 50) {
      return '${content.substring(0, 50)}...';
    }
    return content;
  }

  String get _timestamp {
    return timeago.format(widget.conversation.updatedAt, locale: 'en_short');
  }

  void _showContextMenu(BuildContext context, Offset position) {
    final RenderBox overlay = Overlay.of(context).context.findRenderObject() as RenderBox;

    showMenu<String>(
      context: context,
      useRootNavigator: false, // Use local navigator to avoid conflicts with go_router
      position: RelativeRect.fromRect(
        Rect.fromLTWH(position.dx, position.dy, 0, 0),
        Offset.zero & overlay.size,
      ),
      color: LuxuryColors.obsidian,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      items: [
        PopupMenuItem<String>(
          value: 'delete',
          child: Row(
            children: [
              Icon(Iconsax.trash, size: 16, color: LuxuryColors.errorRuby),
              const SizedBox(width: 12),
              Text(
                'Delete',
                style: TextStyle(
                  color: LuxuryColors.errorRuby,
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    ).then((value) {
      if (value == 'delete') widget.onDelete?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        onLongPressStart: (details) {
          HapticFeedback.mediumImpact();
          _showContextMenu(context, details.globalPosition);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: widget.isSelected
                ? LuxuryColors.sidebarDarkBorder
                : (_isHovered
                    ? LuxuryColors.sidebarSubtleHover
                    : Colors.transparent),
            borderRadius: BorderRadius.circular(16),
            border: widget.isSelected
                ? Border.all(color: LuxuryColors.rolexGreen.withValues(alpha: 0.4), width: 1)
                : Border.all(color: Colors.transparent),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title row
              Row(
                children: [
                  // Icon
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: widget.isSelected
                          ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                          : Colors.white.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Iconsax.message,
                      size: 14,
                      color: widget.isSelected
                          ? LuxuryColors.jadePremium
                          : Colors.white.withValues(alpha: 0.5),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.conversation.title ?? 'New Conversation',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.95),
                        fontSize: 14,
                        fontWeight: widget.isSelected ? FontWeight.w600 : FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    _timestamp,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.4),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // Preview
              Text(
                _preview,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5),
                  fontSize: 12,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 10),

              // Metadata
              Row(
                children: [
                  _MetadataPill(
                    icon: Iconsax.message,
                    label: '${widget.conversation.messages.length}',
                  ),
                  const SizedBox(width: 8),
                  _MetadataPill(
                    icon: Iconsax.cpu,
                    label: 'SalesOS AI',
                    isHighlighted: true,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Small metadata pill
class _MetadataPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isHighlighted;

  const _MetadataPill({
    required this.icon,
    required this.label,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isHighlighted
            ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
            : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isHighlighted
              ? LuxuryColors.champagneGold.withValues(alpha: 0.3)
              : Colors.white.withValues(alpha: 0.05),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 10,
            color: isHighlighted
                ? LuxuryColors.champagneGold
                : Colors.white.withValues(alpha: 0.5),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: isHighlighted
                  ? LuxuryColors.champagneGold
                  : Colors.white.withValues(alpha: 0.5),
              fontSize: 10,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// Premium empty state
class _PremiumEmptyState extends StatelessWidget {
  final bool hasSearch;

  const _PremiumEmptyState({required this.hasSearch});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.08),
                ),
              ),
              child: Icon(
                hasSearch ? Iconsax.search_status : Iconsax.message_question,
                size: 28,
                color: Colors.white.withValues(alpha: 0.4),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              hasSearch ? 'No matches found' : 'No conversations yet',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              hasSearch
                  ? 'Try a different search term'
                  : 'Start a new conversation with SalesOS',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.4),
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
