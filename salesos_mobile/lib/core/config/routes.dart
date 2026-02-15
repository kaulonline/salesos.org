import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'theme.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/auth/presentation/pages/reset_password_page.dart';
import '../../features/auth/presentation/pages/auth_mode_page.dart';
import '../../features/auth/presentation/pages/salesforce_login_page.dart';
import '../../features/auth/presentation/bloc/auth_provider.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/deals/presentation/pages/deals_page.dart';
import '../../features/deals/presentation/pages/deal_detail_page.dart';
import '../../features/contacts/presentation/pages/contacts_page.dart';
import '../../features/contacts/presentation/pages/contact_detail_page.dart';
import '../../features/leads/presentation/pages/leads_page.dart';
import '../../features/leads/presentation/pages/lead_detail_page.dart';
import '../../features/ai_chat/presentation/pages/ai_chat_page.dart';
import '../../features/ai_chat/presentation/pages/call_history_page.dart';
import '../../features/ai_chat/presentation/pages/realtime_voice_page.dart';
import '../../features/tasks/presentation/pages/tasks_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../features/settings/presentation/pages/profile_settings_page.dart';
import '../../features/settings/presentation/pages/general_settings_page.dart';
import '../../features/settings/presentation/pages/license_settings_page.dart';
import '../../features/settings/presentation/pages/data_settings_page.dart';
import '../../features/settings/presentation/pages/ai_settings_page.dart';
import '../../features/settings/presentation/pages/about_iris_page.dart';
import '../../features/settings/presentation/pages/help_support_page.dart';
import '../../features/settings/presentation/pages/terms_of_service_page.dart';
import '../../features/settings/presentation/pages/privacy_security_page.dart';
import '../../features/settings/presentation/pages/data_processing_agreement_page.dart';
import '../../features/settings/presentation/pages/dashboard_settings_page.dart';
import '../../features/settings/presentation/pages/dashboard_widget_order_page.dart';
import '../../features/settings/presentation/pages/notification_preferences_page.dart';
import '../../features/settings/presentation/pages/privacy_preferences_page.dart';
import '../../features/settings/presentation/pages/oss_licenses_page.dart';
import '../../features/calendar/presentation/pages/calendar_page.dart';
import '../../features/reports/presentation/pages/reports_page.dart';
import '../../features/activity/presentation/pages/activity_page.dart';
import '../../features/activity/presentation/pages/activity_new_page.dart';
import '../../features/insights/presentation/pages/iris_insights_page.dart';
import '../../features/search/presentation/pages/search_page.dart';
import '../../features/accounts/presentation/pages/accounts_page.dart';
import '../../features/accounts/presentation/pages/account_detail_page.dart';
import '../../features/agents/presentation/pages/agents_hub_page.dart';
import '../../features/agents/presentation/pages/agent_detail_page.dart';
import '../../features/agents/presentation/pages/agent_builder_page.dart';
import '../../features/smart_capture/presentation/pages/smart_notes_page.dart';
import '../../features/smart_capture/presentation/pages/canvas_notepad_page.dart';
import '../../features/quotes/presentation/pages/quotes_page.dart';
import '../../features/quotes/presentation/pages/quote_detail_page.dart';
import '../../features/notifications/presentation/pages/notification_center_page.dart';
import '../../features/campaigns/presentation/pages/campaigns_page.dart';
import '../../features/campaigns/presentation/pages/campaign_detail_page.dart';
import '../../features/contracts/presentation/pages/contracts_page.dart';
import '../../features/contracts/presentation/pages/contract_detail_page.dart';
// Phase 1: Orders, Products, Playbooks
import '../../features/orders/presentation/pages/orders_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';
import '../../features/products/presentation/pages/products_page.dart';
import '../../features/products/presentation/pages/product_detail_page.dart';
import '../../features/playbooks/presentation/pages/playbooks_page.dart';
import '../../features/playbooks/presentation/pages/playbook_detail_page.dart';
// Phase 2: Meetings, Messages, Email, Approvals
import '../../features/meetings/presentation/pages/meetings_page.dart';
import '../../features/meetings/presentation/pages/meeting_detail_page.dart';
import '../../features/messages/presentation/pages/messages_page.dart';
import '../../features/messages/presentation/pages/message_thread_page.dart';
import '../../features/email/presentation/pages/email_templates_page.dart';
import '../../features/email/presentation/pages/email_compose_page.dart';
import '../../features/approvals/presentation/pages/approvals_page.dart';
// Phase 3: Forecast, Competitors, Win/Loss, Coaching
import '../../features/forecast/presentation/pages/forecast_page.dart';
import '../../features/competitors/presentation/pages/competitors_page.dart';
import '../../features/competitors/presentation/pages/competitor_detail_page.dart';
import '../../features/analytics/presentation/pages/win_loss_page.dart';
import '../../features/coaching/presentation/pages/coaching_hub_page.dart';
import '../../features/coaching/presentation/pages/coaching_session_page.dart';
// Phase 4: Admin, Territories, Automations, Documents, Duplicates, Import
import '../../features/admin/presentation/pages/admin_hub_page.dart';
import '../../features/territories/presentation/pages/territories_page.dart';
import '../../features/territories/presentation/pages/territory_detail_page.dart';
import '../../features/automations/presentation/pages/automations_page.dart';
import '../../features/automations/presentation/pages/automation_detail_page.dart';
import '../../features/documents/presentation/pages/documents_page.dart';
import '../../features/documents/presentation/pages/document_detail_page.dart';
import '../../features/duplicates/presentation/pages/duplicates_page.dart';
import '../../features/import/presentation/pages/import_page.dart';
import '../../features/custom_fields/presentation/pages/custom_fields_page.dart';
// Phase 5: CPQ Configuration & Organization
import '../../features/price_books/presentation/pages/price_books_page.dart';
import '../../features/price_books/presentation/pages/price_book_detail_page.dart';
import '../../features/discount_rules/presentation/pages/discount_rules_page.dart';
import '../../features/discount_rules/presentation/pages/discount_rule_detail_page.dart';
import '../../features/tax_rates/presentation/pages/tax_rates_page.dart';
import '../../features/tax_rates/presentation/pages/tax_rate_detail_page.dart';
import '../../features/pipelines/presentation/pages/pipelines_page.dart';
import '../../features/pipelines/presentation/pages/pipeline_detail_page.dart';
import '../../features/team/presentation/pages/team_page.dart';
import '../../features/team/presentation/pages/team_member_detail_page.dart';
import '../../features/integrations/presentation/pages/integrations_page.dart';
import '../../features/integrations/presentation/pages/integration_detail_page.dart';
import '../../shared/widgets/main_scaffold.dart';
import '../../shared/widgets/luxury_card.dart';

/// Route names for type-safe navigation
abstract class AppRoutes {
  static const String splash = '/';
  static const String authMode = '/auth-mode';
  static const String login = '/login';
  static const String salesforceLogin = '/salesforce-login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  static const String home = '/home';
  static const String dashboard = '/dashboard';
  static const String deals = '/deals';
  static const String dealDetail = '/deals/:id';
  static const String contacts = '/contacts';
  static const String contactDetail = '/contacts/:id';
  static const String leads = '/leads';
  static const String leadDetail = '/leads/:id';
  static const String aiChat = '/iris';
  static const String tasks = '/tasks';
  static const String calendar = '/calendar';
  static const String reports = '/reports';
  static const String activity = '/activity';
  static const String activityNew = '/activity/new';
  static const String irisInsights = '/iris-insights';
  static const String search = '/search';
  static const String accounts = '/accounts';
  static const String accountDetail = '/accounts/:id';
  static const String settings = '/settings';
  static const String profile = '/settings/profile';
  static const String generalSettings = '/settings/general';
  static const String licenseSettings = '/settings/license';
  static const String dataSettings = '/settings/data';
  static const String aiSettings = '/settings/ai';
  static const String aboutIris = '/settings/about';
  static const String helpSupport = '/settings/help';
  static const String termsOfService = '/settings/terms';
  static const String privacySecurity = '/settings/privacy-security';
  static const String dpa = '/settings/dpa';
  static const String ossLicenses = '/settings/oss-licenses';
  static const String dashboardSettings = '/settings/dashboard';
  static const String dashboardWidgetOrder = '/settings/dashboard/order';
  static const String notificationPreferences = '/settings/notifications';
  static const String privacyPreferences = '/settings/privacy-preferences';
  static const String agents = '/agents';
  static const String agentDetail = '/agents/:id';
  static const String agentBuilder = '/agents/builder';
  static const String smartCapture = '/smart-capture';
  static const String notes = '/notes';
  static const String canvasNotepad = '/canvas-notepad';
  static const String quotes = '/quotes';
  static const String quoteDetail = '/quotes/:id';
  static const String notifications = '/notifications';
  static const String campaigns = '/campaigns';
  static const String campaignDetail = '/campaigns/:id';
  static const String contracts = '/contracts';
  static const String contractDetail = '/contracts/:id';
  static const String callHistory = '/call-history';
  static const String realtimeVoice = '/realtime-voice';
  static const String meetingNew = '/meetings/new';

  // Phase 1: Core Sales Workflow
  static const String orders = '/orders';
  static const String orderDetail = '/orders/:id';
  static const String products = '/products';
  static const String productDetail = '/products/:id';
  static const String playbooks = '/playbooks';
  static const String playbookDetail = '/playbooks/:id';

  // Phase 2: Communication & Collaboration
  static const String meetings = '/meetings';
  static const String meetingDetail = '/meetings/:id';
  static const String messages = '/messages';
  static const String messageThread = '/messages/:id';
  static const String emailTemplates = '/email/templates';
  static const String emailCompose = '/email/compose';
  static const String approvals = '/approvals';

  // Phase 3: Intelligence & Analytics
  static const String forecast = '/forecast';
  static const String competitors = '/competitors';
  static const String competitorDetail = '/competitors/:id';
  static const String winLossAnalysis = '/analytics/win-loss';
  static const String coaching = '/coaching';
  static const String coachingSession = '/coaching/:id';

  // Phase 4: Admin & Power User
  static const String admin = '/admin';
  static const String territories = '/territories';
  static const String territoryDetail = '/territories/:id';
  static const String automations = '/automations';
  static const String automationDetail = '/automations/:id';
  static const String customFields = '/settings/custom-fields';
  static const String dataImport = '/import';
  static const String documents = '/documents';
  static const String documentDetail = '/documents/:id';
  static const String duplicates = '/duplicates';

  // Phase 5: CPQ Configuration & Organization
  static const String priceBooks = '/settings/price-books';
  static const String priceBookDetail = '/settings/price-books/:id';
  static const String discountRules = '/settings/discount-rules';
  static const String discountRuleDetail = '/settings/discount-rules/:id';
  static const String taxRates = '/settings/tax-rates';
  static const String taxRateDetail = '/settings/tax-rates/:id';
  static const String pipelines = '/settings/pipelines';
  static const String pipelineDetail = '/settings/pipelines/:id';
  static const String team = '/settings/team';
  static const String teamMemberDetail = '/settings/team/:id';
  static const String integrations = '/settings/integrations';
  static const String integrationDetail = '/settings/integrations/:id';

  /// Routes that don't require authentication
  static const List<String> publicRoutes = [
    splash,
    authMode,
    login,
    salesforceLogin,
    register,
    forgotPassword,
    resetPassword,
  ];

  /// Routes specifically for unauthenticated users (auth flow)
  static const List<String> authFlowRoutes = [
    authMode,
    login,
    salesforceLogin,
    register,
    forgotPassword,
    resetPassword,
  ];

  /// Check if a route is public (doesn't require authentication)
  static bool isPublicRoute(String location) {
    // Check exact match first
    if (publicRoutes.contains(location)) return true;

    // Check if location starts with any public route
    for (final route in publicRoutes) {
      if (location.startsWith(route)) {
        // Handle query parameters
        final baseLocation = location.split('?').first;
        if (baseLocation == route) return true;
      }
    }

    return false;
  }

  /// Check if a route is part of the auth flow (login, register, etc.)
  static bool isAuthFlowRoute(String location) {
    final baseLocation = location.split('?').first;
    return authFlowRoutes.contains(baseLocation);
  }
}

/// Shell route keys for bottom navigation
final _shellNavigatorKey = GlobalKey<NavigatorState>();
final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// Exposed root navigator key for deep linking from push notifications
GlobalKey<NavigatorState> get rootNavigatorKey => _rootNavigatorKey;

/// Auth state change notifier for router refresh
class AuthChangeNotifier extends ChangeNotifier {
  AuthChangeNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (previous, next) {
      // Only notify when auth status actually changes
      if (previous?.status != next.status) {
        notifyListeners();
      }
    });
  }

  final Ref _ref;

  AuthStatus get authStatus => _ref.read(authProvider).status;
}

/// Provider for auth change notifier
final authChangeNotifierProvider = Provider<AuthChangeNotifier>((ref) {
  return AuthChangeNotifier(ref);
});

/// Custom slide transition from right (for detail pages)
CustomTransitionPage<void> _buildSlideFromRightPage({
  required Widget child,
  required GoRouterState state,
  Duration duration = const Duration(milliseconds: 300),
}) {
  // Use a unique key combining the full URI to prevent duplicate key errors
  final uniqueKey = ValueKey('${state.matchedLocation}_${state.uri.toString()}');
  return CustomTransitionPage(
    key: uniqueKey,
    child: child,
    transitionDuration: duration,
    reverseTransitionDuration: duration,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curvedAnimation = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(1.0, 0.0),
          end: Offset.zero,
        ).animate(curvedAnimation),
        child: child,
      );
    },
  );
}

/// Custom slide transition from bottom (for modals/sheets)
CustomTransitionPage<void> _buildSlideFromBottomPage({
  required Widget child,
  required GoRouterState state,
  Duration duration = const Duration(milliseconds: 350),
}) {
  // Use a unique key combining the full URI to prevent duplicate key errors
  final uniqueKey = ValueKey('${state.matchedLocation}_${state.uri.toString()}');
  return CustomTransitionPage(
    key: uniqueKey,
    child: child,
    transitionDuration: duration,
    reverseTransitionDuration: duration,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curvedAnimation = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0.0, 1.0),
          end: Offset.zero,
        ).animate(curvedAnimation),
        child: child,
      );
    },
  );
}

/// Custom fade transition (for tab switches and search)
CustomTransitionPage<void> _buildFadePage({
  required Widget child,
  required GoRouterState state,
  Duration duration = const Duration(milliseconds: 200),
}) {
  // Use a unique key combining the full URI to prevent duplicate key errors
  final uniqueKey = ValueKey('${state.matchedLocation}_${state.uri.toString()}');
  return CustomTransitionPage(
    key: uniqueKey,
    child: child,
    transitionDuration: duration,
    reverseTransitionDuration: duration,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurvedAnimation(
          parent: animation,
          curve: Curves.easeOut,
        ),
        child: child,
      );
    },
  );
}

/// Premium 404 Error Page with luxury design
class NotFoundPage extends StatelessWidget {
  final String attemptedRoute;

  const NotFoundPage({
    super.key,
    required this.attemptedRoute,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = LuxuryColors.rolexGreen;

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(40),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Premium 404 icon with glow effect
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        accentColor.withValues(alpha: 0.15),
                        accentColor.withValues(alpha: 0.05),
                      ],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: accentColor.withValues(alpha: 0.3),
                      width: 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: accentColor.withValues(alpha: 0.2),
                        blurRadius: 40,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Icon(
                          Iconsax.map_1,
                          size: 48,
                          color: accentColor.withValues(alpha: 0.3),
                        ),
                        Icon(
                          Iconsax.close_circle,
                          size: 28,
                          color: accentColor,
                        ),
                      ],
                    ),
                  ),
                )
                    .animate()
                    .fadeIn(duration: 400.ms)
                    .scale(begin: const Offset(0.8, 0.8)),

                const SizedBox(height: 40),

                // 404 text with elegant typography
                Text(
                  '404',
                  style: IrisTheme.displayLarge.copyWith(
                    color: accentColor,
                    fontWeight: FontWeight.w300,
                    letterSpacing: 8,
                  ),
                ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.2),

                const SizedBox(height: 16),

                // Title
                Text(
                  'Page Not Found',
                  style: IrisTheme.titleLarge.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                  textAlign: TextAlign.center,
                ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.2),

                const SizedBox(height: 12),

                // Subtitle with attempted route
                Text(
                  'The page you\'re looking for doesn\'t exist or has been moved.',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: LuxuryColors.textMuted,
                    letterSpacing: 0.2,
                  ),
                  textAlign: TextAlign.center,
                ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.2),

                const SizedBox(height: 8),

                // Show attempted route in subtle chip
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Text(
                    attemptedRoute,
                    style: IrisTheme.caption.copyWith(
                      color: LuxuryColors.textMuted,
                      fontFamily: 'monospace',
                      letterSpacing: 0.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ).animate(delay: 250.ms).fadeIn(),

                const SizedBox(height: 40),

                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Go back button
                    _LuxuryOutlinedButton(
                      label: 'Go Back',
                      icon: Iconsax.arrow_left,
                      onPressed: () {
                        if (context.canPop()) {
                          context.pop();
                        } else {
                          context.go(AppRoutes.dashboard);
                        }
                      },
                    ),
                    const SizedBox(width: 16),
                    // Go home button
                    _LuxuryFilledButton(
                      label: 'Go Home',
                      icon: Iconsax.home_2,
                      onPressed: () => context.go(AppRoutes.dashboard),
                    ),
                  ],
                ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.2),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury outlined button for 404 page
class _LuxuryOutlinedButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const _LuxuryOutlinedButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = LuxuryColors.rolexGreen;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 24,
            vertical: 14,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: accentColor.withValues(alpha: 0.5),
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 18,
                color: accentColor,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: IrisTheme.labelLarge.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Luxury filled button for 404 page
class _LuxuryFilledButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const _LuxuryFilledButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor = LuxuryColors.rolexGreen;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 24,
            vertical: 14,
          ),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                accentColor,
                accentColor.withValues(alpha: 0.85),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: accentColor.withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 18,
                color: Colors.white,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: IrisTheme.labelLarge.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Router provider with authentication state and route guards
final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authChangeNotifierProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    refreshListenable: authNotifier,
    redirect: (context, state) {
      final authStatus = ref.read(authProvider).status;
      final currentLocation = state.matchedLocation;
      final isPublicRoute = AppRoutes.isPublicRoute(currentLocation);
      final isAuthFlowRoute = AppRoutes.isAuthFlowRoute(currentLocation);

      // Allow splash screen to handle initial auth check
      if (currentLocation == AppRoutes.splash) {
        return null;
      }

      // During initial loading, don't redirect
      if (authStatus == AuthStatus.initial ||
          authStatus == AuthStatus.loading) {
        return null;
      }

      final isAuthenticated = authStatus == AuthStatus.authenticated;

      // Unauthenticated user trying to access protected route
      if (!isAuthenticated && !isPublicRoute) {
        // Preserve the intended destination for redirect after login
        final redirectUri = Uri(
          path: AppRoutes.login,
          queryParameters: currentLocation != AppRoutes.dashboard
              ? {'redirect': currentLocation}
              : null,
        );
        return redirectUri.toString();
      }

      // Authenticated user trying to access auth flow routes
      if (isAuthenticated && isAuthFlowRoute) {
        // Check if there's a redirect parameter
        final redirectParam = state.uri.queryParameters['redirect'];
        if (redirectParam != null && redirectParam.isNotEmpty) {
          return redirectParam;
        }
        return AppRoutes.dashboard;
      }

      // Handle deep links for reset password (allow even when authenticated)
      if (currentLocation == AppRoutes.resetPassword) {
        final token = state.uri.queryParameters['token'];
        if (token != null && token.isNotEmpty) {
          return null; // Allow access to reset password with token
        }
      }

      return null;
    },
    routes: [
      // Splash Screen - Premium animated experience
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      // Auth Mode Selection
      GoRoute(
        path: AppRoutes.authMode,
        name: 'auth-mode',
        pageBuilder: (context, state) => _buildFadePage(
          child: const AuthModePage(),
          state: state,
        ),
      ),
      // Login
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        pageBuilder: (context, state) => _buildFadePage(
          child: const LoginPage(),
          state: state,
        ),
      ),
      // Salesforce Login
      GoRoute(
        path: AppRoutes.salesforceLogin,
        name: 'salesforce-login',
        pageBuilder: (context, state) => _buildFadePage(
          child: const SalesforceLoginPage(),
          state: state,
        ),
      ),
      // Register
      GoRoute(
        path: AppRoutes.register,
        name: 'register',
        pageBuilder: (context, state) => _buildFadePage(
          child: const RegisterPage(),
          state: state,
        ),
      ),
      // Forgot Password
      GoRoute(
        path: AppRoutes.forgotPassword,
        name: 'forgot-password',
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ForgotPasswordPage(),
          state: state,
        ),
      ),
      // Reset Password (with token from deep link)
      GoRoute(
        path: AppRoutes.resetPassword,
        name: 'reset-password',
        pageBuilder: (context, state) {
          final token = state.uri.queryParameters['token'] ?? '';
          return _buildSlideFromRightPage(
            child: ResetPasswordPage(token: token),
            state: state,
          );
        },
      ),
      // Main App Shell with Bottom Navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          // Dashboard (Home)
          GoRoute(
            path: AppRoutes.dashboard,
            name: 'dashboard',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const DashboardPage(),
            ),
          ),
          // Deals
          GoRoute(
            path: AppRoutes.deals,
            name: 'deals',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const DealsPage(),
            ),
            routes: [
              GoRoute(
                path: ':id',
                name: 'deal-detail',
                parentNavigatorKey: _rootNavigatorKey,
                pageBuilder: (context, state) {
                  final action = state.uri.queryParameters['action'];
                  return _buildSlideFromRightPage(
                    child: DealDetailPage(
                      dealId: state.pathParameters['id']!,
                      initialAction: action,
                    ),
                    state: state,
                  );
                },
              ),
            ],
          ),
          // Contacts
          GoRoute(
            path: AppRoutes.contacts,
            name: 'contacts',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ContactsPage(),
            ),
            routes: [
              GoRoute(
                path: ':id',
                name: 'contact-detail',
                parentNavigatorKey: _rootNavigatorKey,
                pageBuilder: (context, state) => _buildSlideFromRightPage(
                  child: ContactDetailPage(
                    contactId: state.pathParameters['id']!,
                  ),
                  state: state,
                ),
              ),
            ],
          ),
          // Leads
          GoRoute(
            path: AppRoutes.leads,
            name: 'leads',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const LeadsPage(),
            ),
            routes: [
              GoRoute(
                path: ':id',
                name: 'lead-detail',
                parentNavigatorKey: _rootNavigatorKey,
                pageBuilder: (context, state) => _buildSlideFromRightPage(
                  child: LeadDetailPage(
                    leadId: state.pathParameters['id']!,
                  ),
                  state: state,
                ),
              ),
            ],
          ),
          // Tasks
          GoRoute(
            path: AppRoutes.tasks,
            name: 'tasks',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const TasksPage(),
            ),
          ),
          // Settings
          GoRoute(
            path: AppRoutes.settings,
            name: 'settings',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const SettingsPage(),
            ),
          ),
        ],
      ),
      // Calendar (Full Screen)
      GoRoute(
        path: AppRoutes.calendar,
        name: 'calendar',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const CalendarPage(),
          state: state,
        ),
      ),
      // Reports (Full Screen)
      GoRoute(
        path: AppRoutes.reports,
        name: 'reports',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ReportsPage(),
          state: state,
        ),
      ),
      // IRIS Insights (Full Screen) - AI-Powered Analytics
      GoRoute(
        path: AppRoutes.irisInsights,
        name: 'iris-insights',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const IrisInsightsPage(),
          state: state,
        ),
      ),
      // Activity New (Full Screen) - must come before /activity
      GoRoute(
        path: AppRoutes.activityNew,
        name: 'activity-new',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final type = state.uri.queryParameters['type'];
          final contactId = state.uri.queryParameters['contactId'];
          final relatedToId = state.uri.queryParameters['relatedToId'];
          return _buildFadePage(
            child: ActivityNewPage(
              type: type,
              contactId: contactId,
              relatedToId: relatedToId,
            ),
            state: state,
          );
        },
      ),
      // Activity (Full Screen)
      GoRoute(
        path: AppRoutes.activity,
        name: 'activity',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ActivityPage(),
          state: state,
        ),
      ),
      // Search (Full Screen with Fade)
      GoRoute(
        path: AppRoutes.search,
        name: 'search',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildFadePage(
          child: const SearchPage(),
          state: state,
        ),
      ),
      // Accounts (Full Screen)
      GoRoute(
        path: AppRoutes.accounts,
        name: 'accounts',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const AccountsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'account-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: AccountDetailPage(
                accountId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Profile Settings
      GoRoute(
        path: AppRoutes.profile,
        name: 'profile',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ProfileSettingsPage(),
          state: state,
        ),
      ),
      // General Settings
      GoRoute(
        path: AppRoutes.generalSettings,
        name: 'general-settings',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const GeneralSettingsPage(),
          state: state,
        ),
      ),
      // License Settings
      GoRoute(
        path: AppRoutes.licenseSettings,
        name: 'license-settings',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const LicenseSettingsPage(),
          state: state,
        ),
      ),
      // Data & Privacy Settings
      GoRoute(
        path: AppRoutes.dataSettings,
        name: 'data-settings',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const DataSettingsPage(),
          state: state,
        ),
      ),
      // AI Settings
      GoRoute(
        path: AppRoutes.aiSettings,
        name: 'ai-settings',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const AISettingsPage(),
          state: state,
        ),
      ),
      // About SalesOS
      GoRoute(
        path: AppRoutes.aboutIris,
        name: 'about-salesos',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const AboutIrisPage(),
          state: state,
        ),
      ),
      // Help & Support
      GoRoute(
        path: AppRoutes.helpSupport,
        name: 'help-support',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const HelpSupportPage(),
          state: state,
        ),
      ),
      // Terms of Service
      GoRoute(
        path: AppRoutes.termsOfService,
        name: 'terms-of-service',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const TermsOfServicePage(),
          state: state,
        ),
      ),
      // Privacy & Security
      GoRoute(
        path: AppRoutes.privacySecurity,
        name: 'privacy-security',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const PrivacySecurityPage(),
          state: state,
        ),
      ),
      // Open Source Licenses
      GoRoute(
        path: AppRoutes.ossLicenses,
        name: 'oss-licenses',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const OssLicensesPage(),
          state: state,
        ),
      ),
      // Data Processing Agreement
      GoRoute(
        path: AppRoutes.dpa,
        name: 'dpa',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const DataProcessingAgreementPage(),
          state: state,
        ),
      ),
      // Dashboard Settings
      GoRoute(
        path: '/settings/dashboard',
        name: 'dashboardSettings',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const DashboardSettingsPage(),
          state: state,
        ),
      ),
      GoRoute(
        path: '/settings/dashboard/order',
        name: 'dashboardWidgetOrder',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const DashboardWidgetOrderPage(),
          state: state,
        ),
      ),
      // Notification Preferences
      GoRoute(
        path: AppRoutes.notificationPreferences,
        name: 'notification-preferences',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const NotificationPreferencesPage(),
          state: state,
        ),
      ),
      // Privacy Preferences
      GoRoute(
        path: AppRoutes.privacyPreferences,
        name: 'privacy-preferences',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const PrivacyPreferencesPage(),
          state: state,
        ),
      ),
      // Agents Hub
      GoRoute(
        path: AppRoutes.agents,
        name: 'agents',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const AgentsHubPage(),
          state: state,
        ),
      ),
      // Agent Detail
      GoRoute(
        path: AppRoutes.agentDetail,
        name: 'agent-detail',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: AgentDetailPage(
            agentId: state.pathParameters['id']!,
          ),
          state: state,
        ),
      ),
      // Agent Builder (New)
      GoRoute(
        path: AppRoutes.agentBuilder,
        name: 'agent-builder',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromBottomPage(
          child: const AgentBuilderPage(),
          state: state,
        ),
      ),
      // Smart Capture - Now redirects to combined Smart Notes page
      GoRoute(
        path: AppRoutes.smartCapture,
        name: 'smart-capture',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final linkedEntityId = state.uri.queryParameters['entityId'];
          final linkedEntityType = state.uri.queryParameters['entityType'];
          final linkedEntityName = state.uri.queryParameters['entityName'];
          return _buildSlideFromBottomPage(
            child: SmartNotesPage(
              linkedEntityId: linkedEntityId,
              linkedEntityType: linkedEntityType,
              linkedEntityName: linkedEntityName,
            ),
            state: state,
          );
        },
      ),
      // Smart Notes
      GoRoute(
        path: AppRoutes.notes,
        name: 'notes',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final linkedEntityId = state.uri.queryParameters['entityId'];
          final linkedEntityType = state.uri.queryParameters['entityType'];
          final linkedEntityName = state.uri.queryParameters['entityName'];
          return _buildSlideFromRightPage(
            child: SmartNotesPage(
              linkedEntityId: linkedEntityId,
              linkedEntityType: linkedEntityType,
              linkedEntityName: linkedEntityName,
            ),
            state: state,
          );
        },
      ),
      // Canvas Notepad (iPad Apple Pencil Drawing)
      GoRoute(
        path: AppRoutes.canvasNotepad,
        name: 'canvas-notepad',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final noteId = state.uri.queryParameters['noteId'];
          final linkedEntityId = state.uri.queryParameters['entityId'];
          final linkedEntityType = state.uri.queryParameters['entityType'];
          final linkedEntityName = state.uri.queryParameters['entityName'];
          return _buildSlideFromBottomPage(
            child: CanvasNotepadPage(
              noteId: noteId,
              linkedEntityId: linkedEntityId,
              linkedEntityType: linkedEntityType,
              linkedEntityName: linkedEntityName,
            ),
            state: state,
          );
        },
      ),
      // Quotes (Full Screen)
      GoRoute(
        path: AppRoutes.quotes,
        name: 'quotes',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const QuotesPage(),
          state: state,
        ),
      ),
      // Notification Center
      GoRoute(
        path: AppRoutes.notifications,
        name: 'notifications',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const NotificationCenterPage(),
          state: state,
        ),
      ),
      // AI Chat (Full Screen Modal - Slide from bottom)
      GoRoute(
        path: AppRoutes.aiChat,
        name: 'ai-chat',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final contextType = state.uri.queryParameters['context'];
          final dealId = state.uri.queryParameters['dealId'];
          return _buildSlideFromBottomPage(
            child: AiChatPage(
              initialContext: contextType,
              dealId: dealId,
            ),
            state: state,
          );
        },
      ),
      // Campaigns (Full Screen)
      GoRoute(
        path: AppRoutes.campaigns,
        name: 'campaigns',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const CampaignsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'campaign-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: CampaignDetailPage(
                campaignId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Contracts (Full Screen)
      GoRoute(
        path: AppRoutes.contracts,
        name: 'contracts',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ContractsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'contract-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: ContractDetailPage(
                contractId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Quote Detail
      GoRoute(
        path: AppRoutes.quoteDetail,
        name: 'quote-detail',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: QuoteDetailPage(
            quoteId: state.pathParameters['id']!,
          ),
          state: state,
        ),
      ),

      // Call History (Full Screen)
      GoRoute(
        path: AppRoutes.callHistory,
        name: 'call-history',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const CallHistoryPage(),
          state: state,
        ),
      ),

      // Realtime Voice (Full Screen)
      GoRoute(
        path: AppRoutes.realtimeVoice,
        name: 'realtime-voice',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromBottomPage(
          child: const RealtimeVoicePage(),
          state: state,
        ),
      ),

      // ═══════════════════════════════════════════════════════════════
      // Phase 1: Core Sales Workflow
      // ═══════════════════════════════════════════════════════════════

      // Orders (Full Screen)
      GoRoute(
        path: AppRoutes.orders,
        name: 'orders',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const OrdersPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'order-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: OrderDetailPage(
                orderId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Products (Full Screen)
      GoRoute(
        path: AppRoutes.products,
        name: 'products',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ProductsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'product-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: ProductDetailPage(
                productId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Playbooks (Full Screen)
      GoRoute(
        path: AppRoutes.playbooks,
        name: 'playbooks',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const PlaybooksPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'playbook-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: PlaybookDetailPage(
                playbookId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),

      // ═══════════════════════════════════════════════════════════════
      // Phase 2: Communication & Collaboration
      // ═══════════════════════════════════════════════════════════════

      // Meetings (Full Screen)
      GoRoute(
        path: AppRoutes.meetings,
        name: 'meetings',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const MeetingsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'meeting-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: MeetingDetailPage(
                meetingId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Messages (Full Screen)
      GoRoute(
        path: AppRoutes.messages,
        name: 'messages',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const MessagesPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'message-thread',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: MessageThreadPage(
                conversationId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Email Templates (Full Screen)
      GoRoute(
        path: AppRoutes.emailTemplates,
        name: 'email-templates',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const EmailTemplatesPage(),
          state: state,
        ),
      ),
      // Email Compose (Full Screen Modal)
      GoRoute(
        path: AppRoutes.emailCompose,
        name: 'email-compose',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          return _buildSlideFromBottomPage(
            child: const EmailComposePage(),
            state: state,
          );
        },
      ),
      // Approvals (Full Screen)
      GoRoute(
        path: AppRoutes.approvals,
        name: 'approvals',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ApprovalsPage(),
          state: state,
        ),
      ),

      // ═══════════════════════════════════════════════════════════════
      // Phase 3: Intelligence & Analytics
      // ═══════════════════════════════════════════════════════════════

      // Forecast Dashboard (Full Screen)
      GoRoute(
        path: AppRoutes.forecast,
        name: 'forecast',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ForecastPage(),
          state: state,
        ),
      ),
      // Competitors (Full Screen)
      GoRoute(
        path: AppRoutes.competitors,
        name: 'competitors',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const CompetitorsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'competitor-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: CompetitorDetailPage(
                competitorId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Win/Loss Analysis (Full Screen)
      GoRoute(
        path: AppRoutes.winLossAnalysis,
        name: 'win-loss-analysis',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const WinLossPage(),
          state: state,
        ),
      ),
      // Coaching Hub (Full Screen)
      GoRoute(
        path: AppRoutes.coaching,
        name: 'coaching',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const CoachingHubPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'coaching-session',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: CoachingSessionPage(
                sessionId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),

      // ═══════════════════════════════════════════════════════════════
      // Phase 4: Admin & Power User Features
      // ═══════════════════════════════════════════════════════════════

      // Admin Hub (Full Screen)
      GoRoute(
        path: AppRoutes.admin,
        name: 'admin',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const AdminHubPage(),
          state: state,
        ),
      ),
      // Territories (Full Screen)
      GoRoute(
        path: AppRoutes.territories,
        name: 'territories',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const TerritoriesPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'territory-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: TerritoryDetailPage(
                territoryId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Automations (Full Screen)
      GoRoute(
        path: AppRoutes.automations,
        name: 'automations',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const AutomationsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'automation-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: AutomationDetailPage(
                automationId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Custom Fields (Full Screen)
      GoRoute(
        path: AppRoutes.customFields,
        name: 'custom-fields',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const CustomFieldsPage(),
          state: state,
        ),
      ),
      // Data Import (Full Screen)
      GoRoute(
        path: AppRoutes.dataImport,
        name: 'data-import',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const ImportPage(),
          state: state,
        ),
      ),
      // Documents (Full Screen)
      GoRoute(
        path: AppRoutes.documents,
        name: 'documents',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const DocumentsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'document-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: DocumentDetailPage(
                documentId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Duplicates (Full Screen)
      GoRoute(
        path: AppRoutes.duplicates,
        name: 'duplicates',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const DuplicatesPage(),
          state: state,
        ),
      ),
      // Price Books (Full Screen)
      GoRoute(
        path: AppRoutes.priceBooks,
        name: 'price-books',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const PriceBooksPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'price-book-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: PriceBookDetailPage(
                priceBookId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Discount Rules (Full Screen)
      GoRoute(
        path: AppRoutes.discountRules,
        name: 'discount-rules',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const DiscountRulesPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'discount-rule-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: DiscountRuleDetailPage(
                ruleId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Tax Rates (Full Screen)
      GoRoute(
        path: AppRoutes.taxRates,
        name: 'tax-rates',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const TaxRatesPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'tax-rate-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: TaxRateDetailPage(
                taxRateId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Pipelines (Full Screen)
      GoRoute(
        path: AppRoutes.pipelines,
        name: 'pipelines',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const PipelinesPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'pipeline-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: PipelineDetailPage(
                pipelineId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Team Management (Full Screen)
      GoRoute(
        path: AppRoutes.team,
        name: 'team',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const TeamPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'team-member-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: TeamMemberDetailPage(
                memberId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
      // Integrations (Full Screen)
      GoRoute(
        path: AppRoutes.integrations,
        name: 'integrations',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) => _buildSlideFromRightPage(
          child: const IntegrationsPage(),
          state: state,
        ),
        routes: [
          GoRoute(
            path: ':id',
            name: 'integration-detail',
            parentNavigatorKey: _rootNavigatorKey,
            pageBuilder: (context, state) => _buildSlideFromRightPage(
              child: IntegrationDetailPage(
                integrationId: state.pathParameters['id']!,
              ),
              state: state,
            ),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => NotFoundPage(
      attemptedRoute: state.uri.toString(),
    ),
  );
});
