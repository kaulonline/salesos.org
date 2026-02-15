import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'app.dart';
import 'core/utils/orientation_manager.dart';
import 'core/services/app_lifecycle_service.dart';
import 'core/services/user_preferences_service.dart';
import 'core/services/error_reporting_service.dart';
import 'core/services/cache_service.dart';
import 'core/models/cached_lead.dart';
import 'core/models/cached_contact.dart';
import 'shared/widgets/global_error_handler.dart';

/// Global provider container for error reporting access before runApp
late ProviderContainer _providerContainer;

void main() {
  // Run everything in a single zone to avoid zone mismatch errors
  runZonedGuarded(
    () async {
      // Ensure Flutter bindings are initialized in the same zone as runApp
      WidgetsFlutterBinding.ensureInitialized();

      // Initialize the app
      await _initializeAndRunApp();
    },
    (error, stackTrace) {
      // Handle uncaught async errors
      FirebaseCrashlytics.instance.recordError(error, stackTrace, fatal: true);

      // In debug mode, also print to console
      if (kDebugMode) {
        debugPrint('Uncaught async error: $error');
        debugPrint('Stack trace: $stackTrace');
      }
    },
  );
}

/// Initialize the app and run it
Future<void> _initializeAndRunApp() async {
  // Initialize Firebase (required for Crashlytics)
  await Firebase.initializeApp();

  // Create provider container for accessing services
  final sharedPreferences = await SharedPreferences.getInstance();
  _providerContainer = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(sharedPreferences),
    ],
  );

  // Initialize error reporting service
  final errorReportingService = _providerContainer.read(errorReportingServiceProvider);
  await errorReportingService.initialize();

  // Set up Flutter framework error handler (reports to both Crashlytics and backend)
  FlutterError.onError = (FlutterErrorDetails details) {
    // Report to Firebase Crashlytics
    FirebaseCrashlytics.instance.recordFlutterFatalError(details);

    // Report to our error service (backend reporting)
    errorReportingService.reportFlutterError(details);

    // In debug mode, also print to console with Flutter's default handler
    if (kDebugMode) {
      FlutterError.dumpErrorToConsole(details);
    }
  };

  // Set up platform dispatcher error handler for async errors not caught by zones
  PlatformDispatcher.instance.onError = (error, stack) {
    // Report to Firebase Crashlytics
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);

    // Report to our error service
    errorReportingService.reportAsyncError(error, stack);
    return true; // Prevent the error from propagating
  };

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Register Hive type adapters for CRM entity caching
  // These enable efficient binary serialization for offline-first data access
  if (!Hive.isAdapterRegistered(1)) {
    Hive.registerAdapter(CachedLeadAdapter());
  }
  if (!Hive.isAdapterRegistered(2)) {
    Hive.registerAdapter(CachedContactAdapter());
  }

  // Initialize the cache service with typed boxes
  final cacheService = _providerContainer.read(cacheServiceProvider);
  await cacheService.initialize();
  await cacheService.initializeTypedBoxes();

  // Allow all orientations initially - OrientationManager will restrict
  // based on device type (phones get portrait only, tablets get all)
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.black,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    UncontrolledProviderScope(
      container: _providerContainer,
      child: GlobalErrorHandler(
        child: const OrientationManager(
          child: AppLifecycleWrapper(
            child: SalesOSApp(),
          ),
        ),
      ),
    ),
  );
}
