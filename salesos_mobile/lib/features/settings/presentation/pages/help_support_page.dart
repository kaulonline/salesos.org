import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';

/// FAQ item model
class FAQItem {
  final String id;
  final String question;
  final String answer;
  final String category;
  final List<String> tags;

  const FAQItem({
    required this.id,
    required this.question,
    required this.answer,
    required this.category,
    this.tags = const [],
  });
}

/// FAQ categories
enum FAQCategory {
  gettingStarted('Getting Started', Iconsax.play_circle),
  account('Account & Profile', Iconsax.user),
  crm('CRM & Data', Iconsax.document_text),
  ai('AI Features', Iconsax.cpu),
  billing('Billing & Subscription', Iconsax.card),
  security('Security & Privacy', Iconsax.shield_tick),
  troubleshooting('Troubleshooting', Iconsax.setting_2);

  const FAQCategory(this.displayName, this.icon);
  final String displayName;
  final IconData icon;
}

/// Help & Support content service
class HelpSupportService {
  /// Get all FAQ items
  Future<List<FAQItem>> getFAQs() async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 500));

    return const [
      // Getting Started
      FAQItem(
        id: 'gs-1',
        question: 'How do I get started with SalesOS?',
        answer:
            'Welcome to SalesOS! Start by completing your profile setup, then explore the dashboard to see your pipeline overview. You can use the AI chat feature at any time to ask questions or get help with tasks. Try saying "Show me my top deals" or "What meetings do I have today?".',
        category: 'Getting Started',
        tags: ['onboarding', 'setup', 'new user'],
      ),
      FAQItem(
        id: 'gs-2',
        question: 'How do I import my existing contacts?',
        answer:
            'You can import contacts in several ways:\n\n1. Connect your Salesforce account in Settings > CRM Connection\n2. Use the AI chat: "Import contacts from CSV"\n3. Manually add contacts from the Contacts page\n\nSalesOS will automatically detect duplicates and help you merge them.',
        category: 'Getting Started',
        tags: ['import', 'contacts', 'data migration'],
      ),
      FAQItem(
        id: 'gs-3',
        question: 'What is the AI assistant and how do I use it?',
        answer:
            'SalesOS AI is your personal sales assistant powered by advanced AI. You can access it by tapping the chat icon in the bottom navigation. Ask it anything like:\n\n- "Create a follow-up task for tomorrow"\n- "Summarize my pipeline this quarter"\n- "Draft an email to John about the proposal"\n\nThe AI learns from your interactions to provide better assistance over time.',
        category: 'Getting Started',
        tags: ['ai', 'assistant', 'chat', 'help'],
      ),

      // Account & Profile
      FAQItem(
        id: 'acc-1',
        question: 'How do I update my profile information?',
        answer:
            'To update your profile:\n\n1. Go to Settings (gear icon)\n2. Tap on your profile at the top\n3. Edit your name, photo, or contact information\n4. Tap Save to confirm changes\n\nYour profile picture will sync across all your connected services.',
        category: 'Account & Profile',
        tags: ['profile', 'settings', 'edit'],
      ),
      FAQItem(
        id: 'acc-2',
        question: 'How do I change my password?',
        answer:
            'For security, password changes are done through email:\n\n1. Go to Settings > Security\n2. Tap "Change Password"\n3. Enter your current password\n4. Enter and confirm your new password\n5. Tap Update\n\nYou will receive a confirmation email once changed.',
        category: 'Account & Profile',
        tags: ['password', 'security', 'credentials'],
      ),
      FAQItem(
        id: 'acc-3',
        question: 'How do I enable biometric login?',
        answer:
            'To enable Face ID or Touch ID:\n\n1. Go to Settings\n2. Find the biometric option in Preferences\n3. Toggle it on\n4. Enter your password to verify\n5. Authenticate with your biometric\n\nOnce enabled, you can use biometrics to quickly log in.',
        category: 'Account & Profile',
        tags: ['biometric', 'face id', 'touch id', 'security'],
      ),

      // CRM & Data
      FAQItem(
        id: 'crm-1',
        question: 'How do I connect to Salesforce?',
        answer:
            'To connect your Salesforce account:\n\n1. Go to Settings > CRM Connection\n2. Select "Salesforce" as your CRM\n3. Tap "Connect"\n4. Log in with your Salesforce credentials\n5. Authorize SalesOS access\n\nOnce connected, your data will sync automatically. You can choose to work in Salesforce mode or local mode.',
        category: 'CRM & Data',
        tags: ['salesforce', 'integration', 'sync', 'crm'],
      ),
      FAQItem(
        id: 'crm-2',
        question: 'How often does data sync with Salesforce?',
        answer:
            'Data syncs in real-time when you make changes in SalesOS. Additionally:\n\n- Full sync occurs every 15 minutes\n- Manual sync available via pull-to-refresh\n- Background sync when app is open\n\nYou can check the last sync time in Settings > CRM Connection.',
        category: 'CRM & Data',
        tags: ['sync', 'salesforce', 'data', 'refresh'],
      ),
      FAQItem(
        id: 'crm-3',
        question: 'Can I use SalesOS without Salesforce?',
        answer:
            'Yes! SalesOS works as a standalone CRM without Salesforce. In local mode, all your data is stored securely in our cloud and synced across your devices. You can switch between local and Salesforce mode at any time in Settings.',
        category: 'CRM & Data',
        tags: ['local', 'standalone', 'offline'],
      ),

      // AI Features
      FAQItem(
        id: 'ai-1',
        question: 'What can the AI assistant do?',
        answer:
            'SalesOS AI can help you with:\n\n- Creating and managing tasks, meetings, and reminders\n- Drafting emails and messages\n- Analyzing your pipeline and providing insights\n- Finding contacts, deals, and leads\n- Generating reports and summaries\n- Answering questions about your data\n- Providing sales coaching and suggestions',
        category: 'AI Features',
        tags: ['ai', 'features', 'capabilities'],
      ),
      FAQItem(
        id: 'ai-2',
        question: 'How do I customize the AI behavior?',
        answer:
            'You can customize AI settings in Settings > AI Settings:\n\n- Choose your preferred AI model\n- Adjust the response style (creative vs precise)\n- Set custom system instructions\n- Configure max response length\n\nThe AI adapts to your preferences over time.',
        category: 'AI Features',
        tags: ['ai', 'settings', 'customization'],
      ),
      FAQItem(
        id: 'ai-3',
        question: 'Is my data used to train the AI?',
        answer:
            'No. Your data is never used to train AI models. All conversations are processed securely and are not retained for training purposes. Your privacy is our priority. See our Privacy Policy for more details.',
        category: 'AI Features',
        tags: ['privacy', 'data', 'training', 'security'],
      ),

      // Billing & Subscription (Enterprise)
      FAQItem(
        id: 'bill-1',
        question: 'How does enterprise licensing work?',
        answer:
            'SalesOS is licensed to organizations, not individuals. Your company administrator manages licenses and user access through the admin portal. Contact your IT department or administrator for license inquiries.',
        category: 'Billing & Subscription',
        tags: ['billing', 'enterprise', 'license', 'organization'],
      ),
      FAQItem(
        id: 'bill-2',
        question: 'How do I get access to SalesOS?',
        answer:
            'Access to SalesOS is provisioned by your organization:\n\n1. Contact your IT administrator or manager\n2. Request access to SalesOS\n3. You will receive an organization code and invitation\n4. Use the organization code during registration\n\nFor sales inquiries, contact sales@salesos.org.',
        category: 'Billing & Subscription',
        tags: ['access', 'organization', 'enterprise', 'onboarding'],
      ),
      FAQItem(
        id: 'bill-3',
        question: 'Who manages billing for my organization?',
        answer:
            'All billing is handled at the organization level:\n\n- Your company\'s procurement or IT department manages the subscription\n- Invoices are sent to your organization\'s billing contact\n- Enterprise accounts support purchase orders and net terms\n\nIndividual users do not need to manage payments.',
        category: 'Billing & Subscription',
        tags: ['billing', 'enterprise', 'organization', 'procurement'],
      ),

      // Security & Privacy
      FAQItem(
        id: 'sec-1',
        question: 'How is my data protected?',
        answer:
            'Your data is protected with:\n\n- End-to-end encryption for all data\n- SOC 2 Type II certified infrastructure\n- Regular security audits\n- Secure data centers\n- Two-factor authentication support\n\nWe never share your data with third parties.',
        category: 'Security & Privacy',
        tags: ['security', 'encryption', 'privacy'],
      ),
      FAQItem(
        id: 'sec-2',
        question: 'Can I export my data?',
        answer:
            'Yes! You can export all your data at any time:\n\n1. Go to Settings > Data & Privacy\n2. Tap "Export My Data"\n3. Choose format (CSV or JSON)\n4. Receive download link via email\n\nExports are processed within 24 hours.',
        category: 'Security & Privacy',
        tags: ['export', 'data', 'backup', 'privacy'],
      ),
      FAQItem(
        id: 'sec-3',
        question: 'How do I delete my account?',
        answer:
            'To delete your account:\n\n1. Go to Settings > Data & Privacy\n2. Tap "Delete Account"\n3. Enter your password to confirm\n4. Confirm deletion\n\nThis action is permanent. All your data will be deleted within 30 days per our retention policy.',
        category: 'Security & Privacy',
        tags: ['delete', 'account', 'privacy'],
      ),

      // Troubleshooting
      FAQItem(
        id: 'tr-1',
        question: 'The app is running slowly. What can I do?',
        answer:
            'Try these steps:\n\n1. Close and reopen the app\n2. Check your internet connection\n3. Clear app cache in Settings > Data & Privacy\n4. Ensure you have the latest app version\n5. Restart your device\n\nIf issues persist, contact support.',
        category: 'Troubleshooting',
        tags: ['slow', 'performance', 'issues'],
      ),
      FAQItem(
        id: 'tr-2',
        question: 'I am not receiving notifications. How do I fix this?',
        answer:
            'To fix notification issues:\n\n1. Check app notification settings on your device\n2. Ensure notifications are enabled in Settings > General\n3. Check if Do Not Disturb is enabled\n4. Try logging out and back in\n\nSome devices have battery optimization that affects notifications.',
        category: 'Troubleshooting',
        tags: ['notifications', 'alerts', 'issues'],
      ),
      FAQItem(
        id: 'tr-3',
        question: 'Data is not syncing. What should I do?',
        answer:
            'If data is not syncing:\n\n1. Check your internet connection\n2. Pull down to force refresh\n3. Check Salesforce connection status in Settings\n4. Log out and log back in\n5. Reinstall the app if issues persist\n\nContact support if the problem continues.',
        category: 'Troubleshooting',
        tags: ['sync', 'data', 'salesforce', 'issues'],
      ),
    ];
  }

  /// Get support contact options
  List<SupportOption> getSupportOptions() {
    return const [
      SupportOption(
        id: 'email',
        title: 'Email Support',
        subtitle: 'Get help via email within 24 hours',
        icon: Iconsax.sms,
        action: SupportAction.email,
        value: 'support@salesos.org',
      ),
      SupportOption(
        id: 'chat',
        title: 'Live Chat',
        subtitle: 'Chat with our support team',
        icon: Iconsax.message,
        action: SupportAction.chat,
        value: '',
      ),
      SupportOption(
        id: 'docs',
        title: 'Documentation',
        subtitle: 'Browse guides and tutorials',
        icon: Iconsax.book_1,
        action: SupportAction.url,
        value: 'https://salesos.org/docs',
      ),
      SupportOption(
        id: 'community',
        title: 'Community Forum',
        subtitle: 'Connect with other users',
        icon: Iconsax.people,
        action: SupportAction.url,
        value: 'https://salesos.org/community',
      ),
    ];
  }
}

/// Support option model
class SupportOption {
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final SupportAction action;
  final String value;

  const SupportOption({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.action,
    required this.value,
  });
}

enum SupportAction { email, chat, url, phone }

/// Provider for help support service
final helpSupportServiceProvider = Provider<HelpSupportService>((ref) {
  return HelpSupportService();
});

/// Provider for FAQs with loading state
final faqsProvider = FutureProvider<List<FAQItem>>((ref) async {
  final service = ref.read(helpSupportServiceProvider);
  return service.getFAQs();
});

class HelpSupportPage extends ConsumerStatefulWidget {
  const HelpSupportPage({super.key});

  @override
  ConsumerState<HelpSupportPage> createState() => _HelpSupportPageState();
}

class _HelpSupportPageState extends ConsumerState<HelpSupportPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedCategory;
  final Set<String> _expandedFAQs = {};

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<FAQItem> _filterFAQs(List<FAQItem> faqs) {
    var filtered = faqs;

    // Filter by category
    if (_selectedCategory != null) {
      filtered = filtered
          .where((faq) => faq.category == _selectedCategory)
          .toList();
    }

    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((faq) {
        return faq.question.toLowerCase().contains(query) ||
            faq.answer.toLowerCase().contains(query) ||
            faq.tags.any((tag) => tag.toLowerCase().contains(query));
      }).toList();
    }

    return filtered;
  }

  Future<void> _handleSupportAction(SupportOption option) async {
    HapticFeedback.lightImpact();

    switch (option.action) {
      case SupportAction.email:
        final uri = Uri.parse('mailto:${option.value}?subject=SalesOS Support Request');
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri);
        }
        break;
      case SupportAction.chat:
        // Navigate to AI chat with support context
        context.push(AppRoutes.aiChat);
        break;
      case SupportAction.url:
        final uri = Uri.parse(option.value);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
        break;
      case SupportAction.phone:
        final uri = Uri.parse('tel:${option.value}');
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri);
        }
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final faqsAsync = ref.watch(faqsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final supportService = ref.read(helpSupportServiceProvider);
    final supportOptions = supportService.getSupportOptions();

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Help & Support',
          style: IrisTheme.titleLarge.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Bar
              _buildSearchBar(isDark),
              const SizedBox(height: 20),

              // Contact Support Section
              Text(
                'Contact Support',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              _buildSupportOptions(supportOptions, isDark),

              const SizedBox(height: 24),

              // Category Filter
              Text(
                'Browse by Category',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              _buildCategoryChips(isDark),

              const SizedBox(height: 24),

              // FAQs Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Frequently Asked Questions',
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  if (_selectedCategory != null || _searchQuery.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        setState(() {
                          _selectedCategory = null;
                          _searchQuery = '';
                          _searchController.clear();
                        });
                      },
                      child: Text(
                        'Clear Filters',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.jadePremium,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              faqsAsync.when(
                data: (faqs) {
                  final filteredFAQs = _filterFAQs(faqs);
                  if (filteredFAQs.isEmpty) {
                    return _buildEmptyState(isDark);
                  }
                  return _buildFAQList(filteredFAQs, isDark);
                },
                loading: () => _buildLoadingState(),
                error: (error, stack) => _buildErrorState(isDark, error.toString()),
              ),

              const SizedBox(height: 24),

              // Still need help?
              _buildNeedMoreHelp(isDark),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar(bool isDark) {
    return IrisCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: TextField(
        controller: _searchController,
        onChanged: (value) {
          setState(() => _searchQuery = value);
        },
        style: IrisTheme.bodyMedium.copyWith(
          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
        ),
        decoration: InputDecoration(
          hintText: 'Search for help...',
          hintStyle: IrisTheme.bodyMedium.copyWith(
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          ),
          prefixIcon: Icon(
            Iconsax.search_normal,
            size: 20,
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: Icon(
                    Iconsax.close_circle,
                    size: 18,
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildSupportOptions(List<SupportOption> options, bool isDark) {
    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: options.asMap().entries.map((entry) {
          final index = entry.key;
          final option = entry.value;
          final isLast = index == options.length - 1;

          return Column(
            children: [
              InkWell(
                onTap: () => _handleSupportAction(option),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          option.icon,
                          size: 22,
                          color: LuxuryColors.jadePremium,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              option.title,
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              option.subtitle,
                              style: IrisTheme.bodySmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Iconsax.arrow_right_3,
                        size: 16,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ],
                  ),
                ),
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 74,
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                ),
            ],
          );
        }).toList(),
      ),
    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildCategoryChips(bool isDark) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: FAQCategory.values.map((category) {
          final isSelected = _selectedCategory == category.displayName;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() {
                  if (isSelected) {
                    _selectedCategory = null;
                  } else {
                    _selectedCategory = category.displayName;
                  }
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                      : (isDark ? LuxuryColors.obsidian : Colors.white),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? LuxuryColors.rolexGreen
                        : (isDark
                            ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                            : LuxuryColors.rolexGreen.withValues(alpha: 0.15)),
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      category.icon,
                      size: 16,
                      color: isSelected
                          ? LuxuryColors.jadePremium
                          : (isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      category.displayName,
                      style: IrisTheme.labelMedium.copyWith(
                        color: isSelected
                            ? LuxuryColors.jadePremium
                            : (isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary),
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildFAQList(List<FAQItem> faqs, bool isDark) {
    return Column(
      children: faqs.asMap().entries.map((entry) {
        final index = entry.key;
        final faq = entry.value;
        final isExpanded = _expandedFAQs.contains(faq.id);

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: IrisCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                InkWell(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() {
                      if (isExpanded) {
                        _expandedFAQs.remove(faq.id);
                      } else {
                        _expandedFAQs.add(faq.id);
                      }
                    });
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Icon(
                              Iconsax.message_question,
                              size: 16,
                              color: LuxuryColors.jadePremium,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                faq.question,
                                style: IrisTheme.bodyMedium.copyWith(
                                  color: isDark
                                      ? IrisTheme.darkTextPrimary
                                      : IrisTheme.lightTextPrimary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                faq.category,
                                style: IrisTheme.labelSmall.copyWith(
                                  color: LuxuryColors.jadePremium,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        AnimatedRotation(
                          turns: isExpanded ? 0.5 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: Icon(
                            Iconsax.arrow_down_1,
                            size: 18,
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                AnimatedCrossFade(
                  firstChild: const SizedBox.shrink(),
                  secondChild: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(60, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Divider(
                          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          faq.answer,
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                            height: 1.6,
                          ),
                        ),
                        if (faq.tags.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: faq.tags.map((tag) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? IrisTheme.darkSurface
                                      : IrisTheme.lightSurface,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  tag,
                                  style: IrisTheme.caption.copyWith(
                                    color: isDark
                                        ? IrisTheme.darkTextTertiary
                                        : IrisTheme.lightTextTertiary,
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                  crossFadeState: isExpanded
                      ? CrossFadeState.showSecond
                      : CrossFadeState.showFirst,
                  duration: const Duration(milliseconds: 200),
                ),
              ],
            ),
          ).animate(delay: Duration(milliseconds: 200 + (index * 50))).fadeIn().slideY(begin: 0.1),
        );
      }).toList(),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
            ),
            const SizedBox(height: 16),
            Text(
              'Loading FAQs...',
              style: IrisTheme.bodySmall.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(bool isDark, String error) {
    return IrisCard(
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: IrisTheme.error.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Iconsax.warning_2,
              size: 30,
              color: IrisTheme.error,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to Load FAQs',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Please check your connection and try again.',
            textAlign: TextAlign.center,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: () {
              HapticFeedback.lightImpact();
              ref.invalidate(faqsProvider);
            },
            icon: const Icon(Iconsax.refresh, size: 18),
            label: const Text('Retry'),
            style: TextButton.styleFrom(
              foregroundColor: LuxuryColors.jadePremium,
            ),
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildEmptyState(bool isDark) {
    return IrisCard(
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Iconsax.search_status,
              size: 30,
              color: LuxuryColors.jadePremium,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'No Results Found',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your search or browse all categories.',
            textAlign: TextAlign.center,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              setState(() {
                _selectedCategory = null;
                _searchQuery = '';
                _searchController.clear();
              });
            },
            child: Text(
              'Clear Filters',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.jadePremium,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildNeedMoreHelp(bool isDark) {
    // Build "Need More Help" card with IRIS AI link
    final Widget card = LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.accent,
      onTap: () {
        HapticFeedback.lightImpact();
        context.push(AppRoutes.aiChat);
      },
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              gradient: LuxuryColors.emeraldGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.auto_awesome,
              color: Colors.white,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Still Need Help?',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                Text(
                  'Ask SalesOS AI for personalized assistance',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Iconsax.arrow_right_3,
            size: 18,
            color: LuxuryColors.jadePremium,
          ),
        ],
      ),
    );
    return card.animate(delay: 300.ms).fadeIn().slideY(begin: 0.1);
  }
}
