import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/messages_service.dart';
import '../widgets/message_bubble.dart';

class MessageThreadPage extends ConsumerStatefulWidget {
  final String conversationId;

  const MessageThreadPage({super.key, required this.conversationId});

  @override
  ConsumerState<MessageThreadPage> createState() => _MessageThreadPageState();
}

class _MessageThreadPageState extends ConsumerState<MessageThreadPage> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  Future<void> _onSend() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    setState(() => _isSending = true);
    _messageController.clear();

    final service = ref.read(messagesServiceProvider);
    final result =
        await service.sendMessage(widget.conversationId, content);

    setState(() => _isSending = false);

    if (result != null) {
      ref.invalidate(messagesProvider(widget.conversationId));
      ref.invalidate(conversationsProvider);
      _scrollToBottom();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to send message')),
      );
    }
  }

  Future<void> _onRefresh() async {
    ref.invalidate(messagesProvider(widget.conversationId));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final messagesAsync =
        ref.watch(messagesProvider(widget.conversationId));

    // Auto-scroll when messages load
    messagesAsync.whenData((_) {
      _scrollToBottom();
    });

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(context, isDark),

            // Messages list
            Expanded(
              child: messagesAsync.when(
                data: (messages) {
                  if (messages.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.message,
                      title: 'No messages yet',
                      subtitle: 'Send the first message to start the conversation',
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    backgroundColor: isDark
                        ? IrisTheme.darkSurface
                        : IrisTheme.lightSurface,
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final message = messages[index];
                        // Determine if sent by current user
                        // In a real app, compare with current user ID
                        final isSent = message.senderId == 'current_user';
                        final showSenderName = !isSent &&
                            (index == 0 ||
                                messages[index - 1].senderId !=
                                    message.senderId);

                        return MessageBubble(
                          message: message,
                          isSent: isSent,
                          showSenderName: showSenderName,
                        ).animate(delay: (index * 30).ms).fadeIn();
                      },
                    ),
                  );
                },
                loading: () => const Center(
                  child: IrisShimmer(
                    width: double.infinity,
                    height: 300,
                  ),
                ),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.warning_2,
                          size: 48, color: IrisTheme.error),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load messages',
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

            // Message composer
            _buildComposer(context, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        border: Border(
          bottom: BorderSide(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              context.pop();
            },
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDark
                    ? IrisTheme.darkSurfaceElevated
                    : IrisTheme.lightSurfaceElevated,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Iconsax.arrow_left,
                size: 20,
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Conversation',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
          GestureDetector(
            onTap: _onRefresh,
            child: Icon(
              Iconsax.refresh,
              size: 20,
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildComposer(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        border: Border(
          top: BorderSide(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isDark
                    ? IrisTheme.darkSurfaceElevated
                    : IrisTheme.lightSurfaceElevated,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: isDark
                      ? LuxuryColors.champagneGold.withValues(alpha: 0.1)
                      : LuxuryColors.champagneGold.withValues(alpha: 0.08),
                  width: 1,
                ),
              ),
              child: TextField(
                controller: _messageController,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _onSend(),
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                  border: InputBorder.none,
                  contentPadding:
                      const EdgeInsets.symmetric(vertical: 12),
                ),
                maxLines: 4,
                minLines: 1,
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _isSending ? null : _onSend,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen,
                borderRadius: BorderRadius.circular(22),
              ),
              child: _isSending
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(
                      Iconsax.send_1,
                      size: 20,
                      color: Colors.white,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
