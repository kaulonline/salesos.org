# SalesOS Mobile - Quick Start Guide
## Get Started in 30 Minutes

---

## 📋 Prerequisites

### Required Tools
- **Flutter SDK** 3.24+ ([Install Guide](https://docs.flutter.dev/get-started/install))
- **Dart** 3.4+ (included with Flutter)
- **IDE**: VS Code or Android Studio
- **Xcode** 15+ (macOS only, for iOS development)
- **Android Studio** (for Android SDK and emulators)
- **Git**
- **CocoaPods** (macOS only): `sudo gem install cocoapods`

### Backend Access
- SalesOS API endpoint: `https://salesos.org/api`
- API documentation: `https://docs.salesos.org`
- Test credentials (get from team)

---

## 🚀 Step 1: Create Flutter Project (5 minutes)

```bash
# Create new Flutter project
flutter create salesos_mobile \
  --org com.salesos \
  --project-name salesos_mobile \
  --platforms ios,android

cd salesos_mobile

# Verify setup
flutter doctor
```

Expected output:
```
✓ Flutter (Channel stable, 3.24.0)
✓ Android toolchain
✓ Xcode
✓ Chrome
✓ Android Studio
✓ VS Code
```

---

## 📦 Step 2: Add Dependencies (5 minutes)

Replace `pubspec.yaml` with:

```yaml
name: salesos_mobile
description: AI-Powered Sales CRM for iOS & Android
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_bloc: ^8.1.6
  hydrated_bloc: ^9.1.5
  equatable: ^2.0.5

  # Networking
  dio: ^5.5.0
  retrofit: ^4.1.0
  retrofit_generator: ^8.1.0
  pretty_dio_logger: ^1.3.1
  socket_io_client: ^3.0.0
  connectivity_plus: ^6.0.3

  # Storage
  drift: ^2.18.0
  sqlite3_flutter_libs: ^0.5.24
  path_provider: ^2.1.3
  path: ^1.9.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  flutter_secure_storage: ^9.2.2

  # Authentication
  flutter_appauth: ^7.0.0
  local_auth: ^2.2.0
  jwt_decoder: ^2.0.1

  # UI Components
  flutter_animate: ^4.5.0
  shimmer: ^3.0.0
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.10
  lottie: ^3.1.2

  # Navigation
  go_router: ^14.2.0
  modal_bottom_sheet: ^3.0.0

  # Forms
  flutter_form_builder: ^9.3.0
  form_builder_validators: ^10.0.1

  # Charts
  fl_chart: ^0.68.0

  # Utilities
  intl: ^0.19.0
  timeago: ^3.7.0
  flutter_slidable: ^3.1.1
  pull_to_refresh: ^2.0.0
  badges: ^3.1.2

  # Firebase
  firebase_core: ^3.2.0
  firebase_analytics: ^11.2.0
  firebase_crashlytics: ^4.0.2
  firebase_messaging: ^15.0.2
  flutter_local_notifications: ^17.2.1

  # Dependency Injection
  get_it: ^7.7.0
  injectable: ^2.4.2

  # JSON Serialization
  json_annotation: ^4.9.0
  freezed_annotation: ^2.4.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

  # Code Generation
  build_runner: ^2.4.11
  json_serializable: ^6.8.0
  freezed: ^2.5.2
  retrofit_generator: ^8.1.0
  drift_dev: ^2.18.0
  injectable_generator: ^2.6.1

  # Testing
  mockito: ^5.4.4
  bloc_test: ^9.1.7

flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/animations/
    - assets/fonts/

  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Light.ttf
          weight: 300
        - asset: assets/fonts/Inter-Regular.ttf
          weight: 400
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

Install dependencies:
```bash
flutter pub get
```

---

## 🎨 Step 3: Setup Design System (10 minutes)

Create `lib/core/theme/colors.dart`:

```dart
import 'package:flutter/material.dart';

class SalesOSColors {
  // Primary Palette
  static const primaryGold = Color(0xFFEAD07D);
  static const secondaryDark = Color(0xFF1A1A1A);
  static const backgroundWarm = Color(0xFFF2F1EA);
  static const surfaceWhite = Color(0xFFFFFFFF);
  static const surfaceHover = Color(0xFFF8F8F6);
  static const lightSurface = Color(0xFFF0EBD8);

  // Text Colors
  static const textDark = Color(0xFF1A1A1A);
  static const textMuted = Color(0xFF666666);
  static const textLight = Color(0xFF999999);

  // Status Colors
  static const successGreen = Color(0xFF93C01F);
  static const errorRed = Color(0xFFDC2626);
  static const warningYellow = Color(0xFFF59E0B);
  static const infoBlue = Color(0xFF3B82F6);

  // Gradients
  static const goldGradient = LinearGradient(
    colors: [Color(0xFFEAD07D), Color(0xFFD4B85C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const darkGradient = LinearGradient(
    colors: [Color(0xFF1A1A1A), Color(0xFF333333)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
```

Create `lib/core/theme/text_styles.dart`:

```dart
import 'package:flutter/material.dart';
import 'colors.dart';

class SalesOSTextStyles {
  static const String fontFamily = 'Inter';

  // Page Titles
  static const pageTitle = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w300,
    color: SalesOSColors.textDark,
    letterSpacing: -0.5,
    fontFamily: fontFamily,
  );

  // Section Headers
  static const sectionHeader = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w500,
    color: SalesOSColors.textDark,
    fontFamily: fontFamily,
  );

  // Card Titles
  static const cardTitle = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: SalesOSColors.textDark,
    fontFamily: fontFamily,
  );

  // Body Text
  static const bodyText = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: SalesOSColors.textMuted,
    height: 1.5,
    fontFamily: fontFamily,
  );

  // Captions
  static const caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: SalesOSColors.textLight,
    fontFamily: fontFamily,
  );

  // Large Numbers
  static const metricLarge = TextStyle(
    fontSize: 36,
    fontWeight: FontWeight.w300,
    color: SalesOSColors.textDark,
    fontFamily: fontFamily,
  );

  // Button Text
  static const button = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    fontFamily: fontFamily,
  );
}
```

Create `lib/core/theme/app_theme.dart`:

```dart
import 'package:flutter/material.dart';
import 'colors.dart';
import 'text_styles.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: SalesOSTextStyles.fontFamily,
      colorScheme: ColorScheme.light(
        primary: SalesOSColors.primaryGold,
        secondary: SalesOSColors.secondaryDark,
        surface: SalesOSColors.surfaceWhite,
        background: SalesOSColors.backgroundWarm,
        error: SalesOSColors.errorRed,
      ),
      scaffoldBackgroundColor: SalesOSColors.backgroundWarm,
      appBarTheme: AppBarTheme(
        backgroundColor: SalesOSColors.backgroundWarm,
        elevation: 0,
        iconTheme: IconThemeData(color: SalesOSColors.textDark),
        titleTextStyle: SalesOSTextStyles.sectionHeader,
      ),
      cardTheme: CardTheme(
        color: SalesOSColors.surfaceWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: SalesOSColors.secondaryDark,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(100),
          ),
          textStyle: SalesOSTextStyles.button,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: SalesOSColors.surfaceHover,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: SalesOSColors.primaryGold, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: SalesOSColors.errorRed),
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: SalesOSTextStyles.bodyText.copyWith(
          color: SalesOSColors.textLight,
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: SalesOSTextStyles.fontFamily,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: SalesOSColors.primaryGold,
        secondary: SalesOSColors.surfaceWhite,
        surface: Color(0xFF2A2A2A),
        background: Color(0xFF1A1A1A),
        error: SalesOSColors.errorRed,
      ),
      scaffoldBackgroundColor: Color(0xFF1A1A1A),
      // ... dark theme variants
    );
  }
}
```

---

## 🔌 Step 4: Setup API Client (5 minutes)

Create `lib/core/constants/api_constants.dart`:

```dart
class ApiConstants {
  static const String baseUrl = 'https://salesos.org/api';

  // Endpoints
  static const String auth = '/auth';
  static const String leads = '/leads';
  static const String opportunities = '/opportunities';
  static const String contacts = '/contacts';
  static const String accounts = '/accounts';
  static const String dashboard = '/dashboard';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
}
```

Create `lib/core/network/dio_client.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../constants/api_constants.dart';
import 'interceptors.dart';

class DioClient {
  late final Dio _dio;

  DioClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        sendTimeout: ApiConstants.sendTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptors
    _dio.interceptors.addAll([
      AuthInterceptor(),
      PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        compact: true,
      ),
    ]);
  }

  Dio get instance => _dio;
}
```

Create `lib/core/network/interceptors.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthInterceptor extends Interceptor {
  final _storage = FlutterSecureStorage();

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(key: 'access_token');

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Token expired, try to refresh
      final refreshed = await _refreshToken();

      if (refreshed) {
        // Retry original request
        final response = await Dio().fetch(err.requestOptions);
        handler.resolve(response);
        return;
      }
    }

    handler.next(err);
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');

      if (refreshToken == null) return false;

      final response = await Dio().post(
        'https://salesos.org/api/auth/refresh',
        data: {'refresh_token': refreshToken},
      );

      final newToken = response.data['access_token'];
      await _storage.write(key: 'access_token', value: newToken);

      return true;
    } catch (e) {
      return false;
    }
  }
}
```

---

## 📱 Step 5: Create First Screen (5 minutes)

Update `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'presentation/auth/screens/splash_screen.dart';

void main() {
  runApp(const SalesOSApp());
}

class SalesOSApp extends StatelessWidget {
  const SalesOSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SalesOS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const SplashScreen(),
    );
  }
}
```

Create `lib/presentation/auth/screens/splash_screen.dart`:

```dart
import 'package:flutter/material.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/text_styles.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();

    // Navigate after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      // Navigate to login or dashboard
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SalesOSColors.backgroundWarm,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo placeholder
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    gradient: SalesOSColors.goldGradient,
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(
                        color: SalesOSColors.primaryGold.withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Text(
                      'S',
                      style: TextStyle(
                        fontSize: 60,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'SalesOS',
                  style: SalesOSTextStyles.pageTitle,
                ),
                const SizedBox(height: 8),
                Text(
                  'AI-Powered Sales CRM',
                  style: SalesOSTextStyles.bodyText,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## ▶️ Step 6: Run the App

```bash
# iOS Simulator
flutter run

# Android Emulator
flutter run

# Physical device
flutter run -d <device-id>

# List available devices
flutter devices
```

You should see the splash screen with the SalesOS logo!

---

## 📂 Next Steps

### 1. Setup Folder Structure
```bash
mkdir -p lib/core/{constants,di,error,network,theme,utils}
mkdir -p lib/data/{models,repositories,datasources/{remote,local},dto}
mkdir -p lib/domain/{entities,repositories,usecases}
mkdir -p lib/presentation/{auth,dashboard,leads,deals,contacts,shared}
mkdir -p lib/config/{routes,env,l10n}
mkdir -p assets/{images,fonts,animations}
```

### 2. Implement Authentication
- Create login screen
- Integrate with SalesOS API
- Store JWT tokens securely
- Implement biometric login

### 3. Build Dashboard
- Dashboard home with metrics
- Quick actions
- Hot leads widget
- At-risk deals widget

### 4. Add Leads Module
- Leads list with filtering
- Lead detail screen
- Create lead form
- AI lead scoring

### 5. Implement Offline Mode
- Setup Drift database
- Create sync queue
- Handle conflict resolution

---

## 🛠️ Useful Commands

```bash
# Run with specific flavor (dev/staging/prod)
flutter run --flavor dev

# Build APK
flutter build apk --release

# Build iOS IPA
flutter build ios --release

# Run tests
flutter test

# Run code generation
flutter pub run build_runner build --delete-conflicting-outputs

# Analyze code
flutter analyze

# Format code
dart format lib/

# Clean build
flutter clean && flutter pub get
```

---

## 📚 Resources

- **Flutter Docs**: https://docs.flutter.dev/
- **BLoC Pattern**: https://bloclibrary.dev/
- **Dio HTTP**: https://pub.dev/packages/dio
- **Go Router**: https://pub.dev/packages/go_router
- **SalesOS API**: https://docs.salesos.org

---

## 🐛 Troubleshooting

### Issue: "flutter command not found"
```bash
# Add Flutter to PATH
export PATH="$PATH:`pwd`/flutter/bin"

# Or add to ~/.zshrc or ~/.bashrc
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc
```

### Issue: iOS build fails
```bash
cd ios
pod install
cd ..
flutter clean
flutter pub get
flutter run
```

### Issue: Android build fails
```bash
# Update Android SDK
flutter doctor --android-licenses

# Clean gradle cache
cd android
./gradlew clean
cd ..
flutter clean
flutter run
```

---

## ✅ Checklist

- [ ] Flutter SDK installed
- [ ] IDE setup (VS Code or Android Studio)
- [ ] Project created
- [ ] Dependencies added
- [ ] Design system created
- [ ] API client setup
- [ ] Splash screen running
- [ ] iOS simulator working
- [ ] Android emulator working
- [ ] Ready to build features!

---

**🎉 Congratulations! You're ready to build SalesOS Mobile!**

Next: Read the full proposal (`mobile-app-proposal.md`) for feature details and architecture.
