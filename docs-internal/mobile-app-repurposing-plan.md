# SalesOS Mobile - Repurposing Plan
## Transform IRIS Mobile into SalesOS Mobile

---

## 📊 Executive Summary

**Good News!** The IRIS mobile app at `/opt/IRIS_Sales_GPT/iris_mobile` is a **world-class Flutter application** that can be repurposed for SalesOS in **2-3 months** instead of building from scratch (which would take 12+ months).

### What We Have

✅ **254 Dart files** - Complete, production-ready codebase
✅ **22 Feature Modules** - All core CRM features implemented
✅ **Clean Architecture** - Feature-based with Data/Domain/Presentation layers
✅ **Modern Stack** - Flutter 3.10+, Riverpod state management, Go Router
✅ **Offline-First** - Full offline capabilities with Hive caching
✅ **AI Features** - Azure OpenAI integration, voice coaching, meeting intelligence
✅ **Security** - JWT auth, biometric login, secure storage
✅ **International** - 5 languages (EN, ES, FR, DE, JA)
✅ **Test Infrastructure** - E2E and unit testing framework

### Estimated Effort

| Phase | Duration | Effort |
|-------|----------|--------|
| **Rebranding** | 2-3 weeks | Update colors, assets, strings |
| **API Integration** | 1 week | Map endpoints to SalesOS API |
| **Feature Adaptation** | 2-4 weeks | Remove IRIS-specific features |
| **Testing & QA** | 2 weeks | Full testing cycle |
| **Total** | **7-12 weeks** | **2-3 months** |

**vs. Building from Scratch:** 12-16 months

**Savings:** 9-13 months (75-85% time reduction)

---

## 🎯 Current State Analysis

### ✅ What Works Perfectly for SalesOS

| Feature | Status | Notes |
|---------|--------|-------|
| **Authentication** | ✅ Ready | JWT auth, biometric login |
| **Dashboard** | ✅ Ready | KPI cards, pipeline stats, AI insights |
| **Leads Management** | ✅ Ready | CRUD, scoring, export |
| **Deals/Pipeline** | ✅ Ready | Kanban view, health indicators |
| **Contacts** | ✅ Ready | Full contact management |
| **Accounts** | ✅ Ready | Account hierarchies |
| **Tasks** | ✅ Ready | Task tracking |
| **Calendar** | ✅ Ready | Event management |
| **Quotes** | ✅ Ready | Quote management |
| **Reports** | ✅ Ready | Analytics dashboard |
| **Search** | ✅ Ready | Global search |
| **Notifications** | ✅ Ready | Notification center |
| **Settings** | ✅ Ready | Profile, preferences |
| **Offline Mode** | ✅ Ready | Hive-based caching |
| **AI Chat** | ✅ Ready | Conversational AI |
| **Voice Features** | ✅ Ready | Speech-to-text, TTS |

### ⚠️ What Needs Changes

| Item | Current (IRIS) | SalesOS Target | Effort |
|------|----------------|----------------|--------|
| **Brand Colors** | #D99C79 (tan) | #EAD07D (gold), #1A1A1A (dark) | Medium |
| **App Name** | "IRIS" | "SalesOS" | Low |
| **API Base URL** | engage.iriseller.com | salesos.org | Very Low |
| **Font** | Lufga | Inter (or keep Lufga) | Low |
| **License System** | IRIS-specific | SalesOS pricing model | Medium |
| **Org Codes** | IRIS B2B feature | SalesOS multi-tenant | Low |
| **Salesforce Mode** | Integrated | Remove or keep | Low |

### ❌ What to Remove

- IRIS-specific license management UI
- Organization code registration (unless SalesOS needs it)
- IRIS branding strings and assets
- Salesforce OAuth (unless SalesOS integrates Salesforce)
- IRIS support email addresses

---

## 🗺️ Repurposing Roadmap

### Phase 1: Setup & Discovery (Week 1)

**Objective:** Prepare codebase and validate API compatibility

#### Tasks:
1. **Clone IRIS Mobile**
   ```bash
   # Copy IRIS mobile to SalesOS workspace
   cp -r /opt/IRIS_Sales_GPT/iris_mobile /opt/salesos.org/salesos_mobile
   cd /opt/salesos.org/salesos_mobile

   # Clean up old references
   git init
   git remote add origin <salesos-mobile-repo>
   ```

2. **Test Against SalesOS API**
   - Update base URL in `lib/core/config/app_config.dart`
   - Test authentication endpoints
   - Test leads, deals, contacts endpoints
   - Document any API differences

3. **Create API Compatibility Matrix**
   | IRIS Endpoint | SalesOS Endpoint | Compatible? | Notes |
   |---------------|------------------|-------------|-------|
   | POST /auth/login | POST /api/auth/login | ✓ | |
   | GET /leads | GET /api/leads | ? | Test pagination |
   | GET /deals | GET /api/opportunities | ? | Different name? |

4. **Setup Environment Variables**
   ```dart
   // lib/core/config/env.dart
   class Env {
     static const apiBaseUrl = String.fromEnvironment(
       'API_BASE_URL',
       defaultValue: 'https://salesos.org/api',
     );

     static const wsUrl = String.fromEnvironment(
       'WS_URL',
       defaultValue: 'wss://salesos.org',
     );
   }
   ```

**Deliverable:** API compatibility report and environment configuration

---

### Phase 2: Rebranding (Weeks 2-3)

**Objective:** Transform IRIS visual identity to SalesOS

#### 2.1 Color Scheme Update

**File:** `lib/core/config/theme.dart`

```dart
// BEFORE (IRIS)
static const irisGold = Color(0xFFD99C79);      // Warm tan
static const irisGoldDark = Color(0xFFBF7154);  // Terracotta
static const irisBlack = Color(0xFF0D0D0D);     // Near black

// AFTER (SalesOS)
static const salesOSGold = Color(0xFFEAD07D);   // Gold accent
static const salesOSDark = Color(0xFF1A1A1A);   // Dark primary
static const salesOSBg = Color(0xFFF2F1EA);     // Warm beige background
static const salesOSText = Color(0xFF666666);   // Muted text
static const salesOSSuccess = Color(0xFF93C01F); // Success green
```

**Files to Update:**
- `lib/core/config/theme.dart` (main theme file)
- `lib/shared/widgets/*` (custom widgets using colors)
- `lib/features/*/presentation/widgets/*` (feature-specific widgets)

**Tool:** Use Find & Replace with regex:
```regex
Find: irisGold(?!Dark|Light)
Replace: salesOSGold
```

#### 2.2 Typography Update

**Current:** Lufga font (9 weights)
**Options:**
1. **Keep Lufga** - It's a premium font, matches SalesOS luxury aesthetic
2. **Switch to Inter** - More widely used, open-source
3. **Use SF Pro** (iOS) / Roboto (Android) - Native fonts

**Recommendation:** Keep Lufga or switch to Inter for consistency with web app

**If switching to Inter:**
```yaml
# pubspec.yaml
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

#### 2.3 App Name & Package ID

**Update Files:**

1. **pubspec.yaml**
   ```yaml
   name: salesos_mobile
   description: AI-Powered Sales CRM for iOS & Android
   ```

2. **android/app/build.gradle**
   ```gradle
   defaultConfig {
       applicationId "com.salesos.mobile"
       // ...
   }
   ```

3. **ios/Runner/Info.plist**
   ```xml
   <key>CFBundleDisplayName</key>
   <string>SalesOS</string>
   <key>CFBundleIdentifier</key>
   <string>com.salesos.mobile</string>
   ```

4. **lib/core/config/app_config.dart**
   ```dart
   class AppConfig {
     static const appName = 'SalesOS';
     static const appTagline = 'AI-Powered Sales CRM';
     static const baseUrl = 'https://salesos.org/api';
     static const wsUrl = 'wss://salesos.org';
   }
   ```

#### 2.4 App Icons & Assets

**Required Assets:**

1. **App Icon** (1024x1024px)
   - iOS: ios/Runner/Assets.xcassets/AppIcon.appiconset/
   - Android: android/app/src/main/res/mipmap-*/ic_launcher.png

2. **Splash Screen**
   - Create SalesOS logo splash
   - Use flutter_native_splash package

3. **In-App Assets**
   - Replace IRIS logo with SalesOS logo
   - Update empty state illustrations
   - Update onboarding images

**Tool:** Use Flutter Icon Generator
```bash
flutter pub run flutter_launcher_icons
```

**Config:**
```yaml
# pubspec.yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icons/app_icon.png"
  adaptive_icon_background: "#F2F1EA"
  adaptive_icon_foreground: "assets/icons/app_icon_foreground.png"
```

#### 2.5 String Resources

**Update all hardcoded strings:**

```bash
# Find IRIS references
grep -r "IRIS" lib/ --exclude-dir={.dart_tool,build}

# Common replacements
sed -i '' 's/IRIS Sales GPT/SalesOS/g' lib/**/*.dart
sed -i '' 's/iriseller\.com/salesos\.org/g' lib/**/*.dart
sed -i '' 's/rosa@iriseller\.com/support@salesos\.org/g' lib/**/*.dart
```

**Files needing manual review:**
- `lib/l10n/app_en.arb` - English strings
- `lib/l10n/app_es.arb` - Spanish strings
- `lib/l10n/app_fr.arb` - French strings
- `lib/l10n/app_de.arb` - German strings
- `lib/l10n/app_ja.arb` - Japanese strings

**Key Strings:**
```json
{
  "appName": "SalesOS",
  "appTagline": "AI-Powered Sales CRM",
  "supportEmail": "support@salesos.org",
  "privacyPolicyUrl": "https://salesos.org/privacy",
  "termsOfServiceUrl": "https://salesos.org/terms"
}
```

**Deliverable:** Fully rebranded app with SalesOS identity

---

### Phase 3: API Integration (Week 4)

**Objective:** Ensure seamless integration with SalesOS backend

#### 3.1 API Endpoint Mapping

**Create Mapping Document:**

```dart
// lib/core/config/api_endpoints.dart
class ApiEndpoints {
  // Auth
  static const login = '/auth/login';
  static const register = '/auth/register';
  static const logout = '/auth/logout';
  static const me = '/auth/me';
  static const refreshToken = '/auth/refresh';

  // Leads
  static const leads = '/leads';
  static lead(String id) => '/leads/$id';
  static const scoreLeads = '/leads/score';
  static const convertLead = '/leads/convert';

  // Opportunities (IRIS called them "deals")
  static const opportunities = '/opportunities';
  static opportunity(String id) => '/opportunities/$id';
  static const analyzeOpportunity = '/opportunities/analyze';

  // Contacts
  static const contacts = '/contacts';
  static contact(String id) => '/contacts/$id';

  // Accounts
  static const accounts = '/accounts';
  static account(String id) => '/accounts/$id';

  // Dashboard
  static const dashboardStats = '/dashboard/stats';
  static const dashboardMetrics = '/dashboard/metrics';

  // ... more endpoints
}
```

#### 3.2 Data Model Mapping

**Compare IRIS vs SalesOS schemas:**

| Entity | IRIS Fields | SalesOS Fields | Action Needed |
|--------|-------------|----------------|---------------|
| Lead | firstName, lastName, email, phone, company, status | name, email, phone, company, status, score | Add `name` field |
| Deal | title, amount, stage, closeDate, probability | name, amount, stage, closeDate, probability | Rename `title` → `name` |
| Contact | firstName, lastName, email, phone, accountId | name, email, phone, accountId | Add `name` field |

**Example Model Adaptation:**

```dart
// BEFORE (IRIS)
class Lead {
  final String firstName;
  final String lastName;

  String get fullName => '$firstName $lastName';
}

// AFTER (SalesOS)
class Lead {
  final String name;          // Single name field
  final String? firstName;    // Optional for backwards compatibility
  final String? lastName;     // Optional for backwards compatibility

  factory Lead.fromJson(Map<String, dynamic> json) {
    return Lead(
      name: json['name'] ?? '${json['firstName']} ${json['lastName']}',
      firstName: json['firstName'],
      lastName: json['lastName'],
      // ...
    );
  }
}
```

#### 3.3 Authentication Flow Testing

**Test Scenarios:**
1. ✓ Login with email/password
2. ✓ Token refresh on 401
3. ✓ Biometric login
4. ✓ Password reset
5. ✓ Session persistence
6. ✓ Multi-device logout

#### 3.4 Offline Sync Testing

**Verify:**
- Offline data caching works with SalesOS models
- Sync queue processes correctly
- Conflict resolution handles SalesOS responses
- Cache expiry and max size limits

**Deliverable:** API integration complete and tested

---

### Phase 4: Feature Adaptation (Weeks 5-7)

**Objective:** Remove IRIS-specific features and adapt to SalesOS

#### 4.1 Remove License Management UI

**Files to Remove/Modify:**
- `lib/features/settings/presentation/pages/license_page.dart`
- `lib/features/settings/data/services/license_service.dart`
- References in settings menu

**Replace with SalesOS subscription model (if needed)**

#### 4.2 Adapt Organization System

**Current:** IRIS uses organization codes for B2B registration
**SalesOS:** Uses multi-tenant organization system

**Update:**
```dart
// lib/features/organizations/data/models/organization_model.dart

// BEFORE
class Organization {
  final String organizationCode;  // IRIS-specific
  final String name;
}

// AFTER
class Organization {
  final String id;               // SalesOS UUID
  final String name;
  final String slug;
  final OrganizationRole role;   // OWNER, ADMIN, MANAGER, MEMBER
}
```

#### 4.3 Review Salesforce Integration

**Decision Point:** Does SalesOS need Salesforce integration?

**Option A: Keep Salesforce Integration**
- Useful for SalesOS customers who use Salesforce
- Provides data migration path
- Can be a competitive feature

**Option B: Remove Salesforce Integration**
- Simplifies codebase
- Reduces maintenance burden
- Focus on native SalesOS experience

**Recommendation:** Keep but make optional (feature flag)

```dart
// lib/core/config/features.dart
class FeatureFlags {
  static const enableSalesforceIntegration = bool.fromEnvironment(
    'ENABLE_SALESFORCE',
    defaultValue: false,
  );
}
```

#### 4.4 Update AI Features

**Current AI Features:**
- Azure OpenAI Realtime API (voice coaching)
- Meeting intelligence
- Morning brief generation
- AI insights

**Verify SalesOS Backend Supports:**
- `/api/ai/chat` endpoint
- `/api/ai/coaching` endpoint
- `/api/ai/insights` endpoint
- WebRTC signaling for real-time voice

**If SalesOS uses different AI provider:**
- Abstract AI service interface
- Create provider implementations (Azure, Anthropic Claude, etc.)

```dart
// lib/core/services/ai/ai_service.dart
abstract class AIService {
  Future<String> generateInsight(String context);
  Future<Stream<String>> streamChat(String message);
  Future<CoachingSession> startCoaching(String scenario);
}

class AnthropicAIService implements AIService {
  // Claude API implementation
}

class AzureAIService implements AIService {
  // Azure OpenAI implementation
}
```

#### 4.5 Customize Dashboard Widgets

**IRIS Dashboard:**
- Morning Brief
- Hot Leads (IRIS Rank)
- Pipeline Overview
- Sales Performance Chart
- Unread Alerts
- Recent Activities

**SalesOS Dashboard:**
- Today's Summary
- Hot Leads (AI Score)
- At-Risk Deals
- Pipeline Overview
- Quick Actions
- Upcoming Meetings

**Update:**
```dart
// lib/features/dashboard/data/models/dashboard_config.dart

final defaultSalesOSDashboard = DashboardConfig(
  widgets: [
    DashboardWidget.todaysSummary,
    DashboardWidget.quickActions,
    DashboardWidget.hotLeads,
    DashboardWidget.atRiskDeals,
    DashboardWidget.pipelineOverview,
    DashboardWidget.upcomingMeetings,
  ],
);
```

**Deliverable:** Feature-complete SalesOS mobile app

---

### Phase 5: Testing & QA (Weeks 8-9)

**Objective:** Ensure production-ready quality

#### 5.1 Unit Testing

**Run existing tests:**
```bash
flutter test
```

**Update test credentials:**
```dart
// test/fixtures/test_credentials.dart
const testEmail = 'test@salesos.org';
const testPassword = 'testpass123';
```

**Add new tests for:**
- SalesOS-specific features
- Rebranded UI components
- API integration with SalesOS backend

#### 5.2 Integration Testing

**Test Journeys:**
1. **Complete Sales Flow**
   - Login → View Dashboard → Create Lead → Qualify → Convert to Deal → Close Won

2. **Offline Scenario**
   - Go offline → Create lead → Log activity → Go online → Verify sync

3. **AI Features**
   - Use AI Chat → Start Coaching Session → Review Morning Brief

**Run tests:**
```bash
flutter drive \
  --target=integration_test/complete_sales_flow_test.dart \
  --driver=test_driver/integration_test.dart
```

#### 5.3 Manual Testing Checklist

**Platforms:**
- [ ] iOS 13+ (iPhone 11, 12, 13, 14, 15)
- [ ] iOS 15+ (iPad Air, iPad Pro)
- [ ] Android 8+ (Pixel, Samsung Galaxy)
- [ ] Android Tablets (Samsung Tab, others)

**Features:**
- [ ] Authentication (login, register, biometric, logout)
- [ ] Dashboard metrics load correctly
- [ ] Leads CRUD operations
- [ ] Deals pipeline drag-and-drop
- [ ] Contacts management
- [ ] Accounts management
- [ ] Tasks creation and completion
- [ ] Calendar events sync
- [ ] AI Chat works
- [ ] Voice coaching functional
- [ ] Quotes generation
- [ ] Reports and analytics
- [ ] Search finds entities
- [ ] Notifications appear
- [ ] Offline mode works
- [ ] Sync resolves conflicts
- [ ] Settings save preferences
- [ ] Dark mode toggles
- [ ] Language switching works

**Performance:**
- [ ] App launches < 3 seconds
- [ ] Screens load < 500ms
- [ ] Smooth 60fps animations
- [ ] No memory leaks
- [ ] Battery drain < 5%/hour

#### 5.4 Security Testing

**Checklist:**
- [ ] Tokens stored securely (FlutterSecureStorage)
- [ ] API requests use HTTPS
- [ ] No sensitive data in logs
- [ ] Biometric authentication works
- [ ] Auto-logout after inactivity (15 min)
- [ ] Certificate pinning (optional)

#### 5.5 Accessibility Testing

**VoiceOver (iOS):**
- [ ] All buttons have labels
- [ ] Form fields have hints
- [ ] Semantic grouping correct
- [ ] Navigation flow logical

**TalkBack (Android):**
- [ ] Content descriptions present
- [ ] Focus order correct
- [ ] Announcements clear

**Visual:**
- [ ] Font size preferences work
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥ 44x44 pt

**Deliverable:** QA-approved, production-ready app

---

### Phase 6: Deployment Preparation (Week 10-11)

**Objective:** Prepare for App Store and Play Store launch

#### 6.1 Build Configuration

**Android:**
```gradle
// android/app/build.gradle
android {
    defaultConfig {
        applicationId "com.salesos.mobile"
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
}
```

**iOS:**
```bash
# Update bundle ID in Xcode
open ios/Runner.xcworkspace

# Configure signing & capabilities
# Add Push Notifications, Background Modes, etc.
```

#### 6.2 App Store Metadata

**App Name:** SalesOS - AI Sales CRM

**Subtitle:** AI-Powered Revenue Platform

**Description:** (See mobile-app-proposal.md)

**Keywords:** CRM, sales, AI, pipeline, deals, leads, revenue

**Screenshots:** (Capture from both iPhone and iPad)
1. Dashboard with metrics
2. Pipeline Kanban board
3. Lead detail with AI insights
4. Deal analysis screen
5. AI coaching session
6. Calendar view

**Privacy Policy:** Link to salesos.org/privacy

**Support URL:** Link to salesos.org/support

#### 6.3 CI/CD Pipeline

**GitHub Actions:**
```yaml
# .github/workflows/build.yml
name: Build & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter test
      - run: flutter analyze

  build-ios:
    runs-on: macos-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build ios --release
      - run: bundle exec fastlane beta  # TestFlight

  build-android:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build appbundle --release
      - run: bundle exec fastlane beta  # Play Console
```

#### 6.4 Beta Distribution

**iOS:**
- TestFlight for internal and external beta
- Invite SalesOS team and select customers

**Android:**
- Google Play Internal Testing track
- Invite testers via email

**Deliverable:** App deployed to TestFlight and Play Console (Beta)

---

### Phase 7: Launch (Week 12)

**Objective:** Public release on App Store and Play Store

#### 7.1 Pre-Launch Checklist

- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance targets met
- [ ] Security audit complete
- [ ] Accessibility verified
- [ ] App Store metadata complete
- [ ] Screenshots uploaded
- [ ] Privacy policy linked
- [ ] Support channels ready
- [ ] Marketing materials ready
- [ ] Press release drafted

#### 7.2 Soft Launch

**Strategy:** Roll out gradually to manage load and catch issues

**Week 1:** Beta users only
**Week 2:** 10% of traffic
**Week 3:** 50% of traffic
**Week 4:** 100% of traffic

**Monitor:**
- Crash rate (target: <0.1%)
- App Store reviews
- User feedback
- API load on backend
- Support tickets

#### 7.3 Launch Day Activities

- [ ] Submit app for App Store review
- [ ] Submit app for Play Store review
- [ ] Publish blog post announcement
- [ ] Send email to existing customers
- [ ] Post on social media
- [ ] Update website with app links
- [ ] Monitor crash reports
- [ ] Respond to user reviews

**Deliverable:** SalesOS Mobile live on App Store and Play Store! 🎉

---

## 📋 Complete Checklist

### Rebranding
- [ ] Update color scheme in theme.dart
- [ ] Replace app name in pubspec.yaml
- [ ] Update package ID (Android)
- [ ] Update bundle ID (iOS)
- [ ] Replace app icons
- [ ] Update splash screen
- [ ] Replace in-app logo assets
- [ ] Update all hardcoded strings
- [ ] Update localization files (5 languages)
- [ ] Update support email addresses
- [ ] Update privacy policy URL
- [ ] Update terms of service URL

### API Integration
- [ ] Map all API endpoints
- [ ] Update base URL configuration
- [ ] Test authentication flow
- [ ] Test CRUD operations (leads, deals, contacts, accounts)
- [ ] Verify pagination works
- [ ] Test search functionality
- [ ] Test filtering and sorting
- [ ] Verify offline sync queue
- [ ] Test conflict resolution
- [ ] Validate data models match SalesOS schemas

### Features
- [ ] Remove/adapt license management
- [ ] Update organization system
- [ ] Review Salesforce integration (keep or remove)
- [ ] Verify AI features work with SalesOS backend
- [ ] Customize dashboard widgets
- [ ] Test all 22 feature modules
- [ ] Verify offline functionality
- [ ] Test push notifications
- [ ] Validate WebSocket real-time updates

### Testing
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Manual testing on iOS devices
- [ ] Manual testing on Android devices
- [ ] Manual testing on tablets
- [ ] Performance testing
- [ ] Security testing
- [ ] Accessibility testing (VoiceOver, TalkBack)

### Deployment
- [ ] Configure build settings
- [ ] Setup signing certificates
- [ ] Create CI/CD pipeline
- [ ] Prepare App Store metadata
- [ ] Prepare Play Store metadata
- [ ] Create screenshots
- [ ] Record app preview videos
- [ ] Beta distribution (TestFlight, Play Console)
- [ ] Gather beta feedback
- [ ] Fix critical issues
- [ ] Submit for App Store review
- [ ] Submit for Play Store review
- [ ] Launch! 🚀

---

## 💰 Cost Comparison

### Option A: Repurpose IRIS Mobile
**Timeline:** 2-3 months
**Cost:** $40,000 - $60,000
- 1 Senior Flutter Developer (full-time)
- 1 QA Engineer (part-time)
- 1 Designer (part-time for assets)

### Option B: Build from Scratch
**Timeline:** 12-16 months
**Cost:** $280,000 - $420,000
- 2-3 Flutter Developers
- 1 QA Engineer
- 1 UI/UX Designer
- 1 DevOps Engineer

**Savings:** $220,000 - $360,000 (85% cost reduction)

---

## 🎯 Success Metrics

### Technical KPIs
- Crash-free rate: >99.5%
- App launch time: <3 seconds
- Screen load time: <500ms
- API response time: <1 second
- Offline sync success: >95%

### Business KPIs
- App Store rating: >4.5 stars
- Downloads: 5,000 in first 3 months
- Daily Active Users: 40% of signups
- Feature adoption: 70% use core features
- Deals closed via mobile: 20% of total

---

## 🚨 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API incompatibility | High | Medium | Test early, create adapter layer |
| Data model mismatch | Medium | Medium | Map models, add compatibility fields |
| Missing SalesOS features | Medium | Low | Verify feature parity with backend team |
| Performance issues | Medium | Low | Profile early, optimize bottlenecks |
| App Store rejection | Low | Low | Follow guidelines, test thoroughly |
| User confusion from rebrand | Low | Low | Clear onboarding, help documentation |

---

## 👥 Team Roles

| Role | Responsibility | Time Commitment |
|------|----------------|-----------------|
| **Flutter Developer** | Rebranding, API integration, features | Full-time (10 weeks) |
| **QA Engineer** | Testing, quality assurance | Part-time (4 weeks) |
| **Designer** | App icons, screenshots, assets | Part-time (2 weeks) |
| **Backend Developer** | API compatibility, endpoint verification | Part-time (2 weeks) |
| **Product Manager** | Feature prioritization, requirements | Part-time (throughout) |

---

## 📞 Next Steps

1. **Approval & Kickoff**
   - Review this plan with stakeholders
   - Get approval to proceed
   - Assemble team

2. **Week 1 Sprint Planning**
   - Setup salesos_mobile repository
   - Copy IRIS codebase
   - Create project board with tasks
   - Begin API compatibility testing

3. **Daily Standups**
   - Track progress
   - Unblock issues
   - Adjust timeline as needed

4. **Weekly Reviews**
   - Demo progress to stakeholders
   - Gather feedback
   - Prioritize next week's work

---

## 🎉 Conclusion

Repurposing the IRIS mobile app for SalesOS is a **strategic win**:

✅ **85% faster** than building from scratch
✅ **Proven architecture** with 254 Dart files
✅ **All features** already implemented
✅ **Production-ready** with testing infrastructure
✅ **Modern stack** (Flutter 3.10+, Riverpod, Go Router)

**Investment:** 2-3 months, $40K-$60K

**Return:** World-class mobile app that differentiates SalesOS from competitors

**Let's build it! 🚀**

---

_Document Version: 1.0_
_Last Updated: February 15, 2026_
_Author: SalesOS Product Team_
