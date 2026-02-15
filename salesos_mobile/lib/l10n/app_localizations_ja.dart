// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => 'SalesOS';

  @override
  String get dashboard => 'ダッシュボード';

  @override
  String get deals => '取引';

  @override
  String get leads => 'リード';

  @override
  String get accounts => 'アカウント';

  @override
  String get contacts => '連絡先';

  @override
  String get tasks => 'タスク';

  @override
  String get activities => 'アクティビティ';

  @override
  String get settings => '設定';

  @override
  String get profile => 'プロフィール';

  @override
  String get aiChat => 'SalesOS AI';

  @override
  String get search => '検索';

  @override
  String get cancel => 'キャンセル';

  @override
  String get save => '保存';

  @override
  String get delete => '削除';

  @override
  String get edit => '編集';

  @override
  String get create => '作成';

  @override
  String get close => '閉じる';

  @override
  String get confirm => '確認';

  @override
  String get loading => '読み込み中...';

  @override
  String get error => 'エラー';

  @override
  String get success => '成功';

  @override
  String get noResults => '結果が見つかりません';

  @override
  String get today => '今日';

  @override
  String get yesterday => '昨日';

  @override
  String get tomorrow => '明日';

  @override
  String get darkMode => 'ダークモード';

  @override
  String get fontSize => 'フォントサイズ';

  @override
  String get language => '言語';

  @override
  String get timezone => 'タイムゾーン';

  @override
  String get pushNotifications => 'プッシュ通知';

  @override
  String get emailNotifications => 'メール通知';

  @override
  String get generalSettings => '一般設定';

  @override
  String get appearance => '外観';

  @override
  String get languageAndRegion => '言語と地域';

  @override
  String get notifications => '通知';

  @override
  String get useDarkTheme => 'アプリ全体でダークテーマを使用';

  @override
  String get receiveNotifications => 'デバイスで通知を受け取る';

  @override
  String get receiveEmailUpdates => 'メールで更新を受け取る';

  @override
  String languageChanged(String language) {
    return '言語が$languageに変更されました';
  }

  @override
  String get compact => 'コンパクト';

  @override
  String get comfortable => '快適';

  @override
  String get large => '大きい';
}
