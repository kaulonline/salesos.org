import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_localizations.dart';
import 'core/config/theme.dart';
import 'core/config/routes.dart';
import 'core/providers/providers.dart';
import 'core/services/error_reporting_service.dart';
import 'core/services/preferences_service.dart';

/// Main SalesOS Mobile Application
class SalesOSApp extends ConsumerWidget {
  const SalesOSApp({super.key});

  /// Map AppLanguage enum to Locale
  Locale _getLocale(AppLanguage language) {
    switch (language) {
      case AppLanguage.english:
        return const Locale('en');
      case AppLanguage.spanish:
        return const Locale('es');
      case AppLanguage.french:
        return const Locale('fr');
      case AppLanguage.german:
        return const Locale('de');
      case AppLanguage.japanese:
        return const Locale('ja');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final isDarkMode = ref.watch(themeModeProvider);
    final errorReportingService = ref.watch(errorReportingServiceProvider);
    final preferences = ref.watch(userPreferencesProvider);

    return MaterialApp.router(
      title: 'SalesOS',
      debugShowCheckedModeBanner: false,
      theme: isDarkMode ? SalesOSTheme.darkTheme : SalesOSTheme.lightTheme,
      routerConfig: router,
      // Localization support
      locale: _getLocale(preferences.language),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'), // English
        Locale('es'), // Spanish
        Locale('fr'), // French
        Locale('de'), // German
        Locale('ja'), // Japanese
      ],
      builder: (context, child) {
        // Apply user's font size preference
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(preferences.fontSize.scaleFactor),
          ),
          child: _AppErrorObserver(
            errorReportingService: errorReportingService,
            child: child ?? const SizedBox.shrink(),
          ),
        );
      },
    );
  }
}

/// Widget that observes and reports errors within the app's widget tree
class _AppErrorObserver extends StatefulWidget {
  final ErrorReportingService errorReportingService;
  final Widget child;

  const _AppErrorObserver({
    required this.errorReportingService,
    required this.child,
  });

  @override
  State<_AppErrorObserver> createState() => _AppErrorObserverState();
}

class _AppErrorObserverState extends State<_AppErrorObserver> {
  @override
  void initState() {
    super.initState();
    // Log app initialization
    widget.errorReportingService.logInfo('SalesOSApp initialized');
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}

// Backward compatibility alias
@Deprecated('Use SalesOSApp instead')
typedef IrisApp = SalesOSApp;
