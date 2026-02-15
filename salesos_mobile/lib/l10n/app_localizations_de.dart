// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'SalesOS';

  @override
  String get dashboard => 'Dashboard';

  @override
  String get deals => 'Geschafte';

  @override
  String get leads => 'Leads';

  @override
  String get accounts => 'Konten';

  @override
  String get contacts => 'Kontakte';

  @override
  String get tasks => 'Aufgaben';

  @override
  String get activities => 'Aktivitaten';

  @override
  String get settings => 'Einstellungen';

  @override
  String get profile => 'Profil';

  @override
  String get aiChat => 'SalesOS AI';

  @override
  String get search => 'Suchen';

  @override
  String get cancel => 'Abbrechen';

  @override
  String get save => 'Speichern';

  @override
  String get delete => 'Loschen';

  @override
  String get edit => 'Bearbeiten';

  @override
  String get create => 'Erstellen';

  @override
  String get close => 'Schliessen';

  @override
  String get confirm => 'Bestatigen';

  @override
  String get loading => 'Laden...';

  @override
  String get error => 'Fehler';

  @override
  String get success => 'Erfolg';

  @override
  String get noResults => 'Keine Ergebnisse gefunden';

  @override
  String get today => 'Heute';

  @override
  String get yesterday => 'Gestern';

  @override
  String get tomorrow => 'Morgen';

  @override
  String get darkMode => 'Dunkelmodus';

  @override
  String get fontSize => 'Schriftgrosse';

  @override
  String get language => 'Sprache';

  @override
  String get timezone => 'Zeitzone';

  @override
  String get pushNotifications => 'Push-Benachrichtigungen';

  @override
  String get emailNotifications => 'E-Mail-Benachrichtigungen';

  @override
  String get generalSettings => 'Allgemeine Einstellungen';

  @override
  String get appearance => 'Erscheinungsbild';

  @override
  String get languageAndRegion => 'Sprache und Region';

  @override
  String get notifications => 'Benachrichtigungen';

  @override
  String get useDarkTheme => 'Dunkles Thema in der gesamten App verwenden';

  @override
  String get receiveNotifications =>
      'Benachrichtigungen auf Ihrem Gerat erhalten';

  @override
  String get receiveEmailUpdates => 'Updates per E-Mail erhalten';

  @override
  String languageChanged(String language) {
    return 'Sprache geandert zu $language';
  }

  @override
  String get compact => 'Kompakt';

  @override
  String get comfortable => 'Komfortabel';

  @override
  String get large => 'Gross';
}
