import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'entity_context_service.dart';
import 'user_preferences_service.dart';
import 'smart_fill_service.dart';

/// Unified service for pre-filling form data
/// Combines context, user preferences, and AI smart fill
class PrefillService {
  final EntityContextNotifier _entityContext;
  final UserPreferencesService _userPrefs;
  final SmartFillService _smartFill;

  PrefillService(this._entityContext, this._userPrefs, this._smartFill);

  /// Get combined pre-fill data for a Lead form
  Map<String, dynamic> getLeadPrefill() {
    final Map<String, dynamic> data = {};

    // 1. Apply user defaults
    data.addAll(_userPrefs.getLeadPrefill());

    // 2. Apply context (if creating from another entity)
    final contextPrefill = _entityContext.getPrefillFor(EntityType.lead);
    data.addAll(contextPrefill);

    return data;
  }

  /// Get combined pre-fill data for a Contact form
  Map<String, dynamic> getContactPrefill() {
    final Map<String, dynamic> data = {};

    // 1. Apply user defaults
    data.addAll(_userPrefs.getContactPrefill());

    // 2. Apply context (e.g., creating contact from account or lead)
    final contextPrefill = _entityContext.getPrefillFor(EntityType.contact);
    data.addAll(contextPrefill);

    return data;
  }

  /// Get combined pre-fill data for an Account form
  Map<String, dynamic> getAccountPrefill() {
    final Map<String, dynamic> data = {};

    // Account doesn't have much context-based prefill
    // but we can add user defaults in the future

    return data;
  }

  /// Get combined pre-fill data for a Deal/Opportunity form
  Map<String, dynamic> getDealPrefill() {
    final Map<String, dynamic> data = {};

    // 1. Apply user defaults
    data.addAll(_userPrefs.getDealPrefill());

    // 2. Apply context (e.g., creating deal from account or contact)
    final contextPrefill = _entityContext.getPrefillFor(EntityType.opportunity);
    data.addAll(contextPrefill);

    return data;
  }

  /// Get combined pre-fill data for a Task form
  Map<String, dynamic> getTaskPrefill() {
    final Map<String, dynamic> data = {};

    // 1. Apply user defaults
    data.addAll(_userPrefs.getTaskPrefill());

    // 2. Apply context (e.g., creating task from deal, contact, etc.)
    final contextPrefill = _entityContext.getPrefillFor(EntityType.task);
    data.addAll(contextPrefill);

    return data;
  }

  /// Get combined pre-fill data for an Activity form
  Map<String, dynamic> getActivityPrefill() {
    final Map<String, dynamic> data = {};

    // Apply context (e.g., logging activity for a contact or deal)
    final contextPrefill = _entityContext.getPrefillFor(EntityType.activity);
    data.addAll(contextPrefill);

    return data;
  }

  /// AI-powered smart fill from text
  Future<SmartFillResult> smartFillContact(String text) async {
    return _smartFill.extractContactInfo(text);
  }

  /// AI-powered smart fill for accounts
  Future<SmartFillResult> smartFillAccount(String text) async {
    return _smartFill.extractAccountInfo(text);
  }

  /// AI-powered smart fill for tasks
  Future<SmartFillResult> smartFillTask(String text) async {
    return _smartFill.extractTaskInfo(text);
  }

  /// Get text from clipboard for smart fill
  Future<String?> getClipboardText() async {
    return _smartFill.getClipboardText();
  }

  /// Suggest company info from email domain
  Future<SmartFillResult> suggestFromEmail(String email) async {
    return _smartFill.suggestFromEmailDomain(email);
  }

  /// Get recent accounts for quick selection
  List<RecentEntity> getRecentAccounts() {
    return _userPrefs.getRecentAccounts();
  }

  /// Get recent contacts for quick selection
  List<RecentEntity> getRecentContacts() {
    return _userPrefs.getRecentContacts();
  }

  /// Get recent lead sources for suggestions
  List<String> getRecentLeadSources() {
    return _userPrefs.getRecentLeadSources();
  }

  /// Get recent industries for suggestions
  List<String> getRecentIndustries() {
    return _userPrefs.getRecentIndustries();
  }

  /// Record a used account (for recent list)
  Future<void> recordAccountUsed(String id, String name) async {
    await _userPrefs.addRecentAccount(id, name);
  }

  /// Record a used contact (for recent list)
  Future<void> recordContactUsed(String id, String name) async {
    await _userPrefs.addRecentContact(id, name);
  }

  /// Record a used lead source (for recent list)
  Future<void> recordLeadSourceUsed(String source) async {
    await _userPrefs.addRecentLeadSource(source);
  }

  /// Record a used industry (for recent list)
  Future<void> recordIndustryUsed(String industry) async {
    await _userPrefs.addRecentIndustry(industry);
  }

  /// Set entity context for subsequent form pre-fills
  void setContext(EntityContext context) {
    _entityContext.setContext(context);
  }

  /// Clear the current context
  void clearContext() {
    _entityContext.clearContext();
  }
}

/// Provider for PrefillService
final prefillServiceProvider = Provider<PrefillService>((ref) {
  final entityContext = ref.watch(entityContextProvider.notifier);
  final userPrefs = ref.watch(userPrefsServiceProvider);
  final smartFill = ref.watch(smartFillServiceProvider);
  return PrefillService(entityContext, userPrefs, smartFill);
});
