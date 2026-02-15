import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_ja.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fr'),
    Locale('ja'),
  ];

  /// The app title
  ///
  /// In en, this message translates to:
  /// **'SalesOS'**
  String get appTitle;

  /// Dashboard navigation label
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get dashboard;

  /// Deals navigation label
  ///
  /// In en, this message translates to:
  /// **'Deals'**
  String get deals;

  /// Leads navigation label
  ///
  /// In en, this message translates to:
  /// **'Leads'**
  String get leads;

  /// Accounts navigation label
  ///
  /// In en, this message translates to:
  /// **'Accounts'**
  String get accounts;

  /// Contacts navigation label
  ///
  /// In en, this message translates to:
  /// **'Contacts'**
  String get contacts;

  /// Tasks navigation label
  ///
  /// In en, this message translates to:
  /// **'Tasks'**
  String get tasks;

  /// Activities navigation label
  ///
  /// In en, this message translates to:
  /// **'Activities'**
  String get activities;

  /// Settings navigation label
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// Profile navigation label
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// AI Chat navigation label
  ///
  /// In en, this message translates to:
  /// **'SalesOS AI'**
  String get aiChat;

  /// Search placeholder
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// Cancel button
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// Save button
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// Delete button
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// Edit button
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// Create button
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get create;

  /// Close button
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// Confirm button
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// Loading indicator
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loading;

  /// Error label
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error;

  /// Success label
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get success;

  /// No results message
  ///
  /// In en, this message translates to:
  /// **'No results found'**
  String get noResults;

  /// Today label
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// Yesterday label
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get yesterday;

  /// Tomorrow label
  ///
  /// In en, this message translates to:
  /// **'Tomorrow'**
  String get tomorrow;

  /// Dark mode setting label
  ///
  /// In en, this message translates to:
  /// **'Dark Mode'**
  String get darkMode;

  /// Font size setting label
  ///
  /// In en, this message translates to:
  /// **'Font Size'**
  String get fontSize;

  /// Language setting label
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// Timezone setting label
  ///
  /// In en, this message translates to:
  /// **'Timezone'**
  String get timezone;

  /// Push notifications setting label
  ///
  /// In en, this message translates to:
  /// **'Push Notifications'**
  String get pushNotifications;

  /// Email notifications setting label
  ///
  /// In en, this message translates to:
  /// **'Email Notifications'**
  String get emailNotifications;

  /// General settings page title
  ///
  /// In en, this message translates to:
  /// **'General Settings'**
  String get generalSettings;

  /// Appearance section title
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// Language and region section title
  ///
  /// In en, this message translates to:
  /// **'Language & Region'**
  String get languageAndRegion;

  /// Notifications section title
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// Dark theme description
  ///
  /// In en, this message translates to:
  /// **'Use dark theme throughout the app'**
  String get useDarkTheme;

  /// Push notifications description
  ///
  /// In en, this message translates to:
  /// **'Receive notifications on your device'**
  String get receiveNotifications;

  /// Email notifications description
  ///
  /// In en, this message translates to:
  /// **'Receive updates via email'**
  String get receiveEmailUpdates;

  /// Language changed confirmation message
  ///
  /// In en, this message translates to:
  /// **'Language changed to {language}'**
  String languageChanged(String language);

  /// Compact font size option
  ///
  /// In en, this message translates to:
  /// **'Compact'**
  String get compact;

  /// Comfortable font size option
  ///
  /// In en, this message translates to:
  /// **'Comfortable'**
  String get comfortable;

  /// Large font size option
  ///
  /// In en, this message translates to:
  /// **'Large'**
  String get large;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['de', 'en', 'es', 'fr', 'ja'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
    case 'ja':
      return AppLocalizationsJa();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
