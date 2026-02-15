// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'SalesOS';

  @override
  String get dashboard => 'Tableau de bord';

  @override
  String get deals => 'Affaires';

  @override
  String get leads => 'Prospects';

  @override
  String get accounts => 'Comptes';

  @override
  String get contacts => 'Contacts';

  @override
  String get tasks => 'Taches';

  @override
  String get activities => 'Activites';

  @override
  String get settings => 'Parametres';

  @override
  String get profile => 'Profil';

  @override
  String get aiChat => 'SalesOS AI';

  @override
  String get search => 'Rechercher';

  @override
  String get cancel => 'Annuler';

  @override
  String get save => 'Enregistrer';

  @override
  String get delete => 'Supprimer';

  @override
  String get edit => 'Modifier';

  @override
  String get create => 'Creer';

  @override
  String get close => 'Fermer';

  @override
  String get confirm => 'Confirmer';

  @override
  String get loading => 'Chargement...';

  @override
  String get error => 'Erreur';

  @override
  String get success => 'Succes';

  @override
  String get noResults => 'Aucun resultat trouve';

  @override
  String get today => 'Aujourd\'hui';

  @override
  String get yesterday => 'Hier';

  @override
  String get tomorrow => 'Demain';

  @override
  String get darkMode => 'Mode sombre';

  @override
  String get fontSize => 'Taille de police';

  @override
  String get language => 'Langue';

  @override
  String get timezone => 'Fuseau horaire';

  @override
  String get pushNotifications => 'Notifications push';

  @override
  String get emailNotifications => 'Notifications par e-mail';

  @override
  String get generalSettings => 'Parametres generaux';

  @override
  String get appearance => 'Apparence';

  @override
  String get languageAndRegion => 'Langue et region';

  @override
  String get notifications => 'Notifications';

  @override
  String get useDarkTheme =>
      'Utiliser le theme sombre dans toute l\'application';

  @override
  String get receiveNotifications =>
      'Recevoir des notifications sur votre appareil';

  @override
  String get receiveEmailUpdates => 'Recevoir des mises a jour par e-mail';

  @override
  String languageChanged(String language) {
    return 'Langue changee en $language';
  }

  @override
  String get compact => 'Compact';

  @override
  String get comfortable => 'Confortable';

  @override
  String get large => 'Grand';
}
