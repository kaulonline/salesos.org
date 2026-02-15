import 'dart:async';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/providers/auth_mode_provider.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../core/services/voice_input_service.dart';
import '../../../../core/services/voice_output_service.dart';
import '../../../../features/auth/presentation/bloc/auth_provider.dart';
import '../../data/chat_service.dart';
import '../widgets/conversation_sidebar.dart';
import 'realtime_voice_page.dart';

/// Chat message for UI
class ChatMessage {
  final String id;
  final String content;
  final bool isUser;
  final DateTime timestamp;
  final bool isLoading;
  final bool isError;

  ChatMessage({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
    this.isLoading = false,
    this.isError = false,
  });

  ChatMessage copyWith({
    String? id,
    String? content,
    bool? isUser,
    DateTime? timestamp,
    bool? isLoading,
    bool? isError,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      content: content ?? this.content,
      isUser: isUser ?? this.isUser,
      timestamp: timestamp ?? this.timestamp,
      isLoading: isLoading ?? this.isLoading,
      isError: isError ?? this.isError,
    );
  }
}

/// AI Chat Provider
final chatMessagesProvider =
    NotifierProvider<ChatMessagesNotifier, List<ChatMessage>>(
      ChatMessagesNotifier.new,
    );

class ChatMessagesNotifier extends Notifier<List<ChatMessage>> {
  @override
  List<ChatMessage> build() => [];

  void addMessage(ChatMessage message) {
    state = [...state, message];
  }

  void updateMessage(String id, ChatMessage updatedMessage) {
    state = state.map((m) => m.id == id ? updatedMessage : m).toList();
  }

  void removeMessage(String id) {
    state = state.where((m) => m.id != id).toList();
  }

  void clear() {
    state = [];
  }
}

/// Premium AI Chat Page with luxury design
class AiChatPage extends ConsumerStatefulWidget {
  final String? initialContext; // Context type (e.g., 'deal_blockers')
  final String? dealId; // Deal ID for context-aware prompts

  const AiChatPage({
    super.key,
    this.initialContext,
    this.dealId,
  });

  @override
  ConsumerState<AiChatPage> createState() => _AiChatPageState();
}

class _AiChatPageState extends ConsumerState<AiChatPage>
    with WidgetsBindingObserver, TickerProviderStateMixin {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  bool _isKeyboardVisible = false;
  bool _isSending = false;
  String? _conversationId;

  // Animation controllers
  late AnimationController _backgroundController;

  // Voice input state
  VoiceInputState _voiceState = VoiceInputState.idle;
  String _partialVoiceText = '';
  StreamSubscription<VoiceInputState>? _voiceStateSubscription;
  StreamSubscription<VoiceInputResult>? _voiceResultSubscription;
  StreamSubscription<String>? _voiceErrorSubscription;

  // Voice output (TTS) state
  bool _autoSpeakEnabled = false;
  // ignore: unused_field
  VoiceOutputState _ttsState = VoiceOutputState.idle;
  StreamSubscription<VoiceOutputState>? _ttsStateSubscription;
  VoiceOutputService? _voiceOutputService;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _focusNode.addListener(_onFocusChange);

    // Background animation
    _backgroundController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 30),
    )..repeat();

    _initializeConversation().then((_) {
      // Handle initial context after conversation is ready
      _handleInitialContext();
    });
    _initializeVoiceInput();
    _initializeVoiceOutput();
  }

  void _handleInitialContext() {
    if (widget.initialContext == null || !mounted) return;

    String? initialMessage;
    switch (widget.initialContext) {
      case 'deal_blockers':
        if (widget.dealId != null) {
          initialMessage = 'Analyze the deal blockers for deal ${widget.dealId}. What obstacles are preventing this deal from progressing, and what actions should I take to address them?';
        } else {
          initialMessage = 'Help me identify and address deal blockers in my pipeline.';
        }
        break;
      default:
        // Unknown context, do nothing
        break;
    }

    if (initialMessage != null) {
      // Pre-fill the message and send automatically after a short delay
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          _messageController.text = initialMessage!;
          _sendMessage();
        }
      });
    }
  }

  Future<void> _initializeVoiceOutput() async {
    final ttsService = ref.read(voiceOutputServiceProvider);
    _voiceOutputService = ttsService;
    _ttsStateSubscription = ttsService.stateStream.listen((state) {
      if (mounted) setState(() => _ttsState = state);
    });
    await ttsService.initialize();
  }

  Future<void> _speakResponse(String text) async {
    if (!_autoSpeakEnabled) return;
    final ttsService = ref.read(voiceOutputServiceProvider);
    final cleanText = _stripMarkdown(text);
    if (cleanText.isNotEmpty) await ttsService.speak(cleanText);
  }

  String _stripMarkdown(String text) {
    return text
        .replaceAll(RegExp(r'```[\s\S]*?```'), '')
        .replaceAll(RegExp(r'`[^`]+`'), '')
        .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '')
        .replaceAll(RegExp(r'\*\*([^*]+)\*\*'), r'\1')
        .replaceAll(RegExp(r'\*([^*]+)\*'), r'\1')
        .replaceAll(RegExp(r'__([^_]+)__'), r'\1')
        .replaceAll(RegExp(r'_([^_]+)_'), r'\1')
        .replaceAll(RegExp(r'\[([^\]]+)\]\([^)]+\)'), r'\1')
        .replaceAll(RegExp(r'^[\s]*[-*+]\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*\d+\.\s+', multiLine: true), '')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }

  void _toggleAutoSpeak() {
    HapticFeedback.lightImpact();
    setState(() => _autoSpeakEnabled = !_autoSpeakEnabled);
    if (!_autoSpeakEnabled) ref.read(voiceOutputServiceProvider).stop();
  }

  Future<void> _initializeVoiceInput() async {
    final voiceService = ref.read(voiceInputServiceProvider);
    _voiceStateSubscription = voiceService.stateStream.listen((state) {
      if (mounted) setState(() => _voiceState = state);
    });
    _voiceResultSubscription = voiceService.resultStream.listen((result) {
      if (mounted) {
        setState(() => _partialVoiceText = result.text);
        if (result.isFinal && result.text.isNotEmpty) {
          _messageController.text = result.text;
          _messageController.selection = TextSelection.fromPosition(
            TextPosition(offset: result.text.length),
          );
          setState(() => _partialVoiceText = '');
        }
      }
    });
    _voiceErrorSubscription = voiceService.errorStream.listen((error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Voice error: $error'),
            backgroundColor: LuxuryColors.errorRuby,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    });
    await voiceService.initialize();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _backgroundController.dispose();
    _voiceStateSubscription?.cancel();
    _voiceResultSubscription?.cancel();
    _voiceErrorSubscription?.cancel();
    _ttsStateSubscription?.cancel();
    _voiceOutputService?.stop();
    super.dispose();
  }

  Future<void> _initializeConversation({bool forceNew = false}) async {
    final chatService = ref.read(chatServiceProvider);
    if (!forceNew) {
      try {
        final conversations = await chatService.getConversations();
        if (conversations.isNotEmpty && mounted) {
          final mostRecent = conversations.first;
          setState(() => _conversationId = mostRecent.id);
          _loadConversationMessages(mostRecent);
          return;
        }
      } catch (e) {
        // Silently ignore
      }
    }
    final conversation = await chatService.createConversation();
    if (mounted) {
      setState(() => _conversationId = conversation.id);
    }
  }

  void _loadConversationMessages(ConversationModel conversation) {
    final notifier = ref.read(chatMessagesProvider.notifier);
    notifier.clear();
    for (final msg in conversation.messages) {
      notifier.addMessage(
        ChatMessage(
          id: msg.id,
          content: msg.content,
          isUser: msg.isUser,
          timestamp: msg.createdAt,
        ),
      );
    }
    Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
  }

  Future<void> _loadConversation(String conversationId) async {
    final chatService = ref.read(chatServiceProvider);
    final conversation = await chatService.getConversation(conversationId);
    if (mounted) {
      setState(() => _conversationId = conversation.id);
      _loadConversationMessages(conversation);
    }
  }

  @override
  void didChangeMetrics() {
    super.didChangeMetrics();
    final bottomInset = WidgetsBinding.instance.platformDispatcher.views.first.viewInsets.bottom;
    final newKeyboardVisible = bottomInset > 100;
    if (newKeyboardVisible != _isKeyboardVisible) {
      setState(() => _isKeyboardVisible = newKeyboardVisible);
      if (newKeyboardVisible) _scrollToBottom();
    }
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus) {
      Future.delayed(const Duration(milliseconds: 300), _scrollToBottom);
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    HapticFeedback.lightImpact();

    final userMessageId = DateTime.now().millisecondsSinceEpoch.toString();
    ref.read(chatMessagesProvider.notifier).addMessage(
      ChatMessage(
        id: userMessageId,
        content: text,
        isUser: true,
        timestamp: DateTime.now(),
      ),
    );

    _messageController.clear();
    _focusNode.requestFocus();
    Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);

    final loadingId = 'loading_${DateTime.now().millisecondsSinceEpoch}';
    ref.read(chatMessagesProvider.notifier).addMessage(
      ChatMessage(
        id: loadingId,
        content: '',
        isUser: false,
        timestamp: DateTime.now(),
        isLoading: true,
      ),
    );

    setState(() => _isSending = true);

    try {
      if (_conversationId == null) await _initializeConversation();
      if (_conversationId == null) throw Exception('Failed to create conversation');

      final authMode = ref.read(authModeProvider);
      final crmMode = authMode == AuthMode.salesforce ? 'salesforce' : 'local';
      final chatService = ref.read(chatServiceProvider);
      final response = await chatService.sendMessage(
        conversationId: _conversationId!,
        message: text,
        mode: crmMode,
      );

      if (response != null) {
        ref.read(chatMessagesProvider.notifier).updateMessage(
          loadingId,
          ChatMessage(
            id: loadingId,
            content: response.content,
            isUser: false,
            timestamp: DateTime.now(),
          ),
        );
        _speakResponse(response.content);
      } else {
        ref.read(chatMessagesProvider.notifier).updateMessage(
          loadingId,
          ChatMessage(
            id: loadingId,
            content: 'Sorry, I couldn\'t process your request. Please try again.',
            isUser: false,
            timestamp: DateTime.now(),
            isError: true,
          ),
        );
      }
    } catch (e) {
      ref.read(chatMessagesProvider.notifier).updateMessage(
        loadingId,
        ChatMessage(
          id: loadingId,
          content: 'An error occurred. Please check your connection and try again.',
          isUser: false,
          timestamp: DateTime.now(),
          isError: true,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
      Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
    }
  }

  Future<void> _toggleVoiceInput() async {
    final voiceService = ref.read(voiceInputServiceProvider);
    if (_voiceState == VoiceInputState.listening) {
      await voiceService.stopListening();
    } else {
      final success = await voiceService.startListening();
      if (!success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Voice input is not available'),
            backgroundColor: LuxuryColors.champagneGold,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  String _getGreetingName() {
    final user = ref.watch(currentUserProvider);
    if (user == null) return 'there';
    final fullName = user.fullName;
    return fullName.split(' ').first;
  }

  /// Show chat history in a bottom sheet (for phone layout)
  void _showChatHistorySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, _) => Container(
          decoration: BoxDecoration(
            color: LuxuryColors.obsidian,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border.all(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
              width: 1,
            ),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Row(
                  children: [
                    Icon(
                      Iconsax.message_text_1,
                      color: LuxuryColors.champagneGold,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Chat History',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Icon(
                        Icons.close,
                        color: Colors.white.withValues(alpha: 0.7),
                        size: 24,
                      ),
                    ),
                  ],
                ),
              ),
              Divider(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
                height: 1,
              ),
              // Conversation list
              Expanded(
                child: ConversationSidebar(
                  selectedConversationId: _conversationId,
                  onConversationSelected: (conversationId) {
                    Navigator.pop(context);
                    _loadConversation(conversationId);
                  },
                  onNewConversation: () {
                    Navigator.pop(context);
                    ref.read(chatMessagesProvider.notifier).clear();
                    _initializeConversation(forceNew: true);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(chatMessagesProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final showSidebar = Responsive.shouldShowSplitView(context);

    if (showSidebar) {
      return _buildTabletLayout(context, messages, isDark);
    }
    return _buildPhoneLayout(context, messages, isDark);
  }

  Widget _buildTabletLayout(BuildContext context, List<ChatMessage> messages, bool isDark) {
    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      body: Stack(
        children: [
          // Animated background
          _buildAnimatedBackground(),

          Row(
            children: [
              // Conversation sidebar
              SizedBox(
                width: MediaQuery.sizeOf(context).width * 0.28,
                child: SafeArea(
                  right: false, // Chat area handles right safe area
                  child: ConversationSidebar(
                    selectedConversationId: _conversationId,
                    onConversationSelected: (id) => _loadConversation(id),
                    onNewConversation: () {
                      ref.read(chatMessagesProvider.notifier).clear();
                      _initializeConversation(forceNew: true);
                    },
                    onConversationDeleted: (deletedId) {
                      // If the deleted conversation is the current one, start a new conversation
                      if (deletedId == _conversationId) {
                        ref.read(chatMessagesProvider.notifier).clear();
                        _initializeConversation(forceNew: true);
                      }
                    },
                  ),
                ),
              ),

              // Chat area
              Expanded(
                child: SafeArea(
                  left: false, // Sidebar handles left safe area
                  child: Column(
                    children: [
                      _buildPremiumHeader(isDark, isTablet: true),
                      Expanded(
                        child: messages.isEmpty
                            ? _PremiumEmptyState(
                                name: _getGreetingName(),
                                onSuggestionTap: (text) {
                                  _messageController.text = text;
                                  _sendMessage();
                                },
                              )
                            : _buildMessageList(messages, isDark, maxWidthFactor: 0.7),
                      ),
                      _buildPremiumInputArea(isDark, isTablet: true),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneLayout(BuildContext context, List<ChatMessage> messages, bool isDark) {
    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      body: Stack(
        children: [
          _buildAnimatedBackground(),
          SafeArea(
            child: Column(
              children: [
                _buildPremiumHeader(isDark, isTablet: false),
                Expanded(
                  child: messages.isEmpty
                      ? _PremiumEmptyState(
                          name: _getGreetingName(),
                          onSuggestionTap: (text) {
                            _messageController.text = text;
                            _sendMessage();
                          },
                        )
                      : _buildMessageList(messages, isDark),
                ),
                _buildPremiumInputArea(isDark, isTablet: false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedBackground() {
    return AnimatedBuilder(
      animation: _backgroundController,
      builder: (context, child) {
        final value = _backgroundController.value;
        return Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(
                math.sin(value * math.pi * 2) * 0.3,
                math.cos(value * math.pi * 2) * 0.3 - 0.5,
              ),
              radius: 1.5,
              colors: [
                LuxuryColors.rolexGreen.withValues(alpha: 0.08),
                LuxuryColors.obsidian,
                LuxuryColors.richBlack,
              ],
              stops: const [0.0, 0.4, 1.0],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPremiumHeader(bool isDark, {required bool isTablet}) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isTablet ? 20 : 16,
        vertical: isTablet ? 20 : 12, // Match sidebar header padding (20px) on tablet
      ),
      decoration: BoxDecoration(
        color: Colors.transparent,
        border: Border(
          bottom: BorderSide(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          // Close/back button
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
              child: Icon(
                Icons.close,
                color: Colors.white.withValues(alpha: 0.7),
                size: 20,
              ),
            ),
          ),

          const SizedBox(width: 16),

          // IRIS branding
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [LuxuryColors.rolexGreen, LuxuryColors.jadePremium],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                  blurRadius: 12,
                  spreadRadius: 0,
                ),
              ],
            ),
            child: const Icon(Icons.auto_awesome, size: 18, color: Colors.white),
          ),

          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SalesOS AI',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.95),
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1,
                  ),
                ),
                Consumer(
                  builder: (context, ref, _) {
                    final authMode = ref.watch(authModeProvider);
                    final isSalesforce = authMode == AuthMode.salesforce;
                    return Text(
                      isSalesforce ? 'Salesforce Connected' : 'Local CRM Mode',
                      style: TextStyle(
                        color: isSalesforce
                            ? LuxuryColors.jadePremium
                            : LuxuryColors.champagneGold,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          // Live voice button
          _PremiumLiveButton(onTap: () => RealtimeVoicePage.show(context)),

          const SizedBox(width: 8),

          // TTS toggle
          GestureDetector(
            onTap: _toggleAutoSpeak,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _autoSpeakEnabled
                    ? LuxuryColors.jadePremium.withValues(alpha: 0.2)
                    : Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _autoSpeakEnabled
                      ? LuxuryColors.jadePremium.withValues(alpha: 0.5)
                      : Colors.white.withValues(alpha: 0.1),
                ),
              ),
              child: Icon(
                _autoSpeakEnabled ? Iconsax.volume_high5 : Iconsax.volume_slash,
                color: _autoSpeakEnabled
                    ? LuxuryColors.jadePremium
                    : Colors.white.withValues(alpha: 0.5),
                size: 18,
              ),
            ),
          ),

          const SizedBox(width: 8),
          // Chat history - always visible for easy access
          GestureDetector(
            onTap: () => _showChatHistorySheet(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Icon(
                Iconsax.message_text,
                color: Colors.white.withValues(alpha: 0.7),
                size: 18,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // New conversation
          GestureDetector(
            onTap: () {
              ref.read(chatMessagesProvider.notifier).clear();
              _initializeConversation(forceNew: true);
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Icon(
                Iconsax.add,
                color: Colors.white.withValues(alpha: 0.7),
                size: 20,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2, end: 0);
  }

  Widget _buildMessageList(List<ChatMessage> messages, bool isDark, {double maxWidthFactor = 0.85}) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(20),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        return _PremiumChatBubble(
          message: message,
          maxWidthFactor: maxWidthFactor,
        ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.05, end: 0);
      },
    );
  }

  Widget _buildPremiumInputArea(bool isDark, {required bool isTablet}) {
    final isListening = _voiceState == VoiceInputState.listening;
    final horizontalPadding = isTablet ? 24.0 : 16.0;

    return Container(
      padding: EdgeInsets.fromLTRB(
        horizontalPadding,
        16,
        horizontalPadding,
        MediaQuery.of(context).padding.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Voice input indicator
          if (isListening || _partialVoiceText.isNotEmpty)
            _PremiumVoiceIndicator(
              isListening: isListening,
              partialText: _partialVoiceText,
            ),

          // Main input row
          ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(28),
                  // No border - clean look for both dark and light themes
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // Voice button
                    GestureDetector(
                      onTap: _toggleVoiceInput,
                      child: Container(
                        width: 44,
                        height: 44,
                        margin: const EdgeInsets.only(left: 6, bottom: 6, top: 6),
                        decoration: BoxDecoration(
                          color: isListening
                              ? LuxuryColors.jadePremium.withValues(alpha: 0.2)
                              : Colors.white.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: isListening
                            ? _PulsingMicIcon()
                            : Icon(
                                Iconsax.microphone_2,
                                color: Colors.white.withValues(alpha: 0.6),
                                size: 20,
                              ),
                      ),
                    ),

                    // Text input
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        focusNode: _focusNode,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 16,
                        ),
                        decoration: InputDecoration(
                          hintText: isListening ? 'Listening...' : 'Ask SalesOS anything...',
                          hintStyle: TextStyle(
                            color: isListening
                                ? LuxuryColors.jadePremium.withValues(alpha: 0.7)
                                : Colors.white.withValues(alpha: 0.4),
                            fontSize: 16,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 14,
                          ),
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                        minLines: 1,
                        maxLines: 4,
                        enabled: !_isSending && !isListening,
                      ),
                    ),

                    // Send button
                    GestureDetector(
                      onTap: _isSending || isListening ? null : _sendMessage,
                      child: Container(
                        width: 44,
                        height: 44,
                        margin: const EdgeInsets.only(right: 6, bottom: 6, top: 6),
                        decoration: BoxDecoration(
                          gradient: (_isSending || isListening)
                              ? null
                              : LinearGradient(
                                  colors: [
                                    LuxuryColors.rolexGreen,
                                    LuxuryColors.deepEmerald,
                                  ],
                                ),
                          color: (_isSending || isListening)
                              ? Colors.white.withValues(alpha: 0.1)
                              : null,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: (_isSending || isListening)
                              ? null
                              : [
                                  BoxShadow(
                                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                                    blurRadius: 12,
                                    spreadRadius: 0,
                                  ),
                                ],
                        ),
                        child: Center(
                          child: _isSending
                              ? SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white.withValues(alpha: 0.7),
                                    ),
                                  ),
                                )
                              : Icon(
                                  Iconsax.send_15,
                                  color: isListening
                                      ? Colors.white.withValues(alpha: 0.3)
                                      : Colors.white,
                                  size: 20,
                                ),
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
    ).animate().fadeIn(duration: 500.ms, delay: 200.ms).slideY(begin: 0.2, end: 0);
  }
}

/// Premium empty state with greeting and suggestions
class _PremiumEmptyState extends StatelessWidget {
  final String name;
  final Function(String) onSuggestionTap;

  const _PremiumEmptyState({
    required this.name,
    required this.onSuggestionTap,
  });

  @override
  Widget build(BuildContext context) {
    final suggestions = [
      ('Show my top leads', Iconsax.people),
      ('Pipeline summary', Iconsax.chart_2),
      ("Today's tasks", Iconsax.task_square),
      ('Create a new lead', Iconsax.add_circle),
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        children: [
          const SizedBox(height: 40),

          // Animated orb
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              gradient: RadialGradient(
                colors: [
                  LuxuryColors.rolexGreen.withValues(alpha: 0.8),
                  LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                  LuxuryColors.deepEmerald.withValues(alpha: 0.2),
                  Colors.transparent,
                ],
                stops: const [0.0, 0.4, 0.7, 1.0],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [LuxuryColors.rolexGreen, LuxuryColors.jadePremium],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scale(begin: const Offset(1, 1), end: const Offset(1.05, 1.05), duration: 2000.ms),

          const SizedBox(height: 32),

          // Greeting
          Text(
            'Hello $name',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.95),
              fontSize: 28,
              fontWeight: FontWeight.w300,
              letterSpacing: -0.5,
            ),
          ).animate().fadeIn(duration: 600.ms, delay: 200.ms),

          const SizedBox(height: 8),

          Text(
            'How can I help you today?',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.5),
              fontSize: 16,
            ),
          ).animate().fadeIn(duration: 600.ms, delay: 400.ms),

          const SizedBox(height: 48),

          // Suggestions
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            children: suggestions.asMap().entries.map((entry) {
              final index = entry.key;
              final suggestion = entry.value;
              return GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  onSuggestionTap(suggestion.$1);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        suggestion.$2,
                        color: LuxuryColors.champagneGold,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        suggestion.$1,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(duration: 400.ms, delay: Duration(milliseconds: 500 + index * 100));
            }).toList(),
          ),
        ],
      ),
    );
  }
}

/// Premium chat bubble with luxury styling
class _PremiumChatBubble extends StatelessWidget {
  final ChatMessage message;
  final double maxWidthFactor;

  const _PremiumChatBubble({
    required this.message,
    this.maxWidthFactor = 0.85,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isLoading) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
              ),
            ),
            child: _PremiumTypingIndicator(),
          ),
        ),
      );
    }

    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Align(
        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * maxWidthFactor,
          ),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: isUser
                ? LinearGradient(
                    colors: [
                      LuxuryColors.rolexGreen,
                      LuxuryColors.deepEmerald,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: isUser
                ? null
                : (message.isError
                    ? LuxuryColors.errorRuby.withValues(alpha: 0.1)
                    : Colors.white.withValues(alpha: 0.06)),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(20),
              topRight: const Radius.circular(20),
              bottomLeft: Radius.circular(isUser ? 20 : 6),
              bottomRight: Radius.circular(isUser ? 6 : 20),
            ),
            border: isUser
                ? null
                : Border.all(
                    color: message.isError
                        ? LuxuryColors.errorRuby.withValues(alpha: 0.3)
                        : LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  ),
            boxShadow: isUser
                ? [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: isUser
              ? Text(
                  message.content,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    height: 1.5,
                  ),
                )
              : _PremiumMarkdownBody(
                  content: message.content,
                  isError: message.isError,
                ),
        ),
      ),
    );
  }
}

/// Premium markdown renderer
class _PremiumMarkdownBody extends StatelessWidget {
  final String content;
  final bool isError;

  const _PremiumMarkdownBody({
    required this.content,
    this.isError = false,
  });

  @override
  Widget build(BuildContext context) {
    final textColor = isError
        ? LuxuryColors.errorRuby
        : Colors.white.withValues(alpha: 0.9);

    final styleSheet = MarkdownStyleSheet(
      p: TextStyle(color: textColor, fontSize: 15, height: 1.6),
      h1: TextStyle(color: textColor, fontSize: 22, fontWeight: FontWeight.w600),
      h2: TextStyle(color: textColor, fontSize: 20, fontWeight: FontWeight.w600),
      h3: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.w600),
      h4: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w600),
      h5: TextStyle(color: textColor, fontSize: 15, fontWeight: FontWeight.w600),
      h6: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w600),
      strong: TextStyle(fontWeight: FontWeight.w700, color: textColor),
      em: TextStyle(fontStyle: FontStyle.italic, color: textColor),
      code: TextStyle(
        fontFamily: 'monospace',
        fontSize: 13,
        color: LuxuryColors.jadePremium,
        backgroundColor: Colors.white.withValues(alpha: 0.08),
      ),
      codeblockDecoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      blockquoteDecoration: BoxDecoration(
        border: Border(left: BorderSide(color: LuxuryColors.champagneGold, width: 3)),
      ),
      blockquotePadding: const EdgeInsets.only(left: 12),
      listBullet: TextStyle(color: textColor),
      listIndent: 16,
      horizontalRuleDecoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
      ),
      a: TextStyle(
        color: LuxuryColors.jadePremium,
        decoration: TextDecoration.underline,
      ),
      tableHead: TextStyle(fontWeight: FontWeight.w600, color: textColor, fontSize: 12),
      tableBody: TextStyle(color: textColor, fontSize: 12),
      tableBorder: TableBorder.all(color: Colors.white.withValues(alpha: 0.15)),
      tableCellsPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      tableColumnWidth: const FlexColumnWidth(),
    );

    // Use LayoutBuilder to get container constraints and handle overflow
    return LayoutBuilder(
      builder: (context, constraints) {
        // Wrap in SingleChildScrollView for horizontal scroll when content overflows
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const ClampingScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minWidth: constraints.maxWidth,
              maxWidth: constraints.maxWidth * 2, // Allow tables to be wider but not infinite
            ),
            child: MarkdownBody(
              data: content,
              styleSheet: styleSheet,
              selectable: true,
              shrinkWrap: true,
              softLineBreak: true,
              fitContent: true,
            ),
          ),
        );
      },
    );
  }
}

/// Premium typing indicator
class _PremiumTypingIndicator extends StatefulWidget {
  @override
  State<_PremiumTypingIndicator> createState() => _PremiumTypingIndicatorState();
}

class _PremiumTypingIndicatorState extends State<_PremiumTypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final delay = index * 0.2;
            final value = ((_controller.value + delay) % 1.0);
            final scale = 0.8 + 0.4 * math.sin(value * math.pi);

            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 3),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        LuxuryColors.champagneGold,
                        LuxuryColors.warmGold,
                      ],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                        blurRadius: 8,
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

/// Premium voice input indicator
class _PremiumVoiceIndicator extends StatelessWidget {
  final bool isListening;
  final String partialText;

  const _PremiumVoiceIndicator({
    required this.isListening,
    required this.partialText,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          if (isListening) _SoundWaveIndicator() else Icon(Iconsax.microphone_2, size: 20, color: LuxuryColors.jadePremium),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isListening && partialText.isEmpty)
                  Text(
                    'Listening...',
                    style: TextStyle(
                      color: LuxuryColors.jadePremium,
                      fontStyle: FontStyle.italic,
                      fontSize: 14,
                    ),
                  )
                else if (partialText.isNotEmpty)
                  Text(
                    partialText,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 14,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                if (isListening)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Tap mic to stop',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 12,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideY(begin: 0.1);
  }
}

/// Sound wave indicator for listening
class _SoundWaveIndicator extends StatefulWidget {
  @override
  State<_SoundWaveIndicator> createState() => _SoundWaveIndicatorState();
}

class _SoundWaveIndicatorState extends State<_SoundWaveIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(4, (index) {
            final phase = (index * 0.25 + _controller.value) % 1.0;
            final height = 8 + (12 * (0.5 + 0.5 * math.sin(phase * math.pi * 2).abs()));
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 1.5),
              width: 3,
              height: height,
              decoration: BoxDecoration(
                color: LuxuryColors.jadePremium,
                borderRadius: BorderRadius.circular(2),
              ),
            );
          }),
        );
      },
    );
  }
}

/// Pulsing microphone icon
class _PulsingMicIcon extends StatefulWidget {
  @override
  State<_PulsingMicIcon> createState() => _PulsingMicIconState();
}

class _PulsingMicIconState extends State<_PulsingMicIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final scale = 1.0 + (_controller.value * 0.15);
        return Transform.scale(
          scale: scale,
          child: Icon(
            Iconsax.microphone_25,
            color: LuxuryColors.jadePremium,
            size: 20,
          ),
        );
      },
    );
  }
}

/// Premium live voice button
class _PremiumLiveButton extends StatelessWidget {
  final VoidCallback onTap;

  const _PremiumLiveButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              LuxuryColors.champagneGold.withValues(alpha: 0.2),
              LuxuryColors.warmGold.withValues(alpha: 0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Iconsax.voice_square,
              color: LuxuryColors.champagneGold,
              size: 16,
            ),
            const SizedBox(width: 6),
            Text(
              'Live',
              style: TextStyle(
                color: LuxuryColors.champagneGold,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    )
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .shimmer(duration: 2500.ms, color: LuxuryColors.warmGold.withValues(alpha: 0.3));
  }
}
