import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_mode_provider.dart';

/// Defines which features are supported in each data source mode.
///
/// When in Salesforce mode, some features are NOT available because:
/// 1. The Salesforce API doesn't support them (e.g., custom quote actions)
/// 2. They are IRIS-specific features (e.g., AI Insights, Morning Brief)
/// 3. They require local processing (e.g., Smart Capture OCR)
class SalesforceFeatureSupport {
  /// Features fully supported in both Local and Salesforce modes
  static const Set<CrmFeature> universalFeatures = {
    // Core CRM entities - read/write
    CrmFeature.leads,
    CrmFeature.contacts,
    CrmFeature.accounts,
    CrmFeature.opportunities,
    CrmFeature.tasks,
    CrmFeature.activities,
    CrmFeature.campaigns,
    // Basic quotes and contracts (read/create/update)
    CrmFeature.quotesBasic,
    CrmFeature.contractsBasic,
  };

  /// Features only available in Local (IRIS) mode
  static const Set<CrmFeature> localOnlyFeatures = {
    // Quote advanced features
    CrmFeature.quoteLineItems,
    CrmFeature.quoteSend,
    CrmFeature.quoteAccept,
    CrmFeature.quoteReject,
    CrmFeature.quoteStats,
    // Contract lifecycle operations
    CrmFeature.contractSubmit,
    CrmFeature.contractApprove,
    CrmFeature.contractActivate,
    CrmFeature.contractTerminate,
    CrmFeature.contractRenew,
    CrmFeature.contractStats,
    // AI & Intelligence features
    CrmFeature.aiInsights,
    CrmFeature.morningBrief,
    CrmFeature.irisRank,
    CrmFeature.aiAgents,
    // Smart capture & notes
    CrmFeature.smartCapture,
    CrmFeature.ocrProcessing,
    CrmFeature.canvasNotepad,
    // Voice features
    CrmFeature.realtimeVoice,
    CrmFeature.voiceTranscription,
  };

  /// Check if a feature is available in the current mode
  static bool isFeatureAvailable(CrmFeature feature, AuthMode mode) {
    if (mode == AuthMode.local) {
      return true; // All features available in local mode
    }
    // In Salesforce mode, only universal features are available
    return universalFeatures.contains(feature);
  }

  /// Check if a feature is local-only
  static bool isLocalOnly(CrmFeature feature) {
    return localOnlyFeatures.contains(feature);
  }

  /// Get a user-friendly message for unavailable features
  static String getUnavailableMessage(CrmFeature feature) {
    switch (feature) {
      case CrmFeature.quoteLineItems:
        return 'Line items management is not available in Salesforce mode';
      case CrmFeature.quoteSend:
      case CrmFeature.quoteAccept:
      case CrmFeature.quoteReject:
        return 'Quote actions are not available in Salesforce mode. Use Salesforce to manage quote status.';
      case CrmFeature.quoteStats:
      case CrmFeature.contractStats:
        return 'Statistics are not available in Salesforce mode';
      case CrmFeature.contractSubmit:
      case CrmFeature.contractApprove:
      case CrmFeature.contractActivate:
      case CrmFeature.contractTerminate:
      case CrmFeature.contractRenew:
        return 'Contract lifecycle actions are not available in Salesforce mode. Use Salesforce to manage contract status.';
      case CrmFeature.aiInsights:
      case CrmFeature.morningBrief:
      case CrmFeature.irisRank:
        return 'AI features are only available in SalesOS Local mode';
      case CrmFeature.aiAgents:
        return 'AI Agents are only available in SalesOS Local mode';
      case CrmFeature.smartCapture:
      case CrmFeature.ocrProcessing:
      case CrmFeature.canvasNotepad:
        return 'Smart Capture features are only available in SalesOS Local mode';
      case CrmFeature.realtimeVoice:
      case CrmFeature.voiceTranscription:
        return 'Voice features are only available in SalesOS Local mode';
      default:
        return 'This feature is not available in Salesforce mode';
    }
  }

  /// Get the icon for unavailable feature indicator
  static IconData get unavailableIcon => Icons.cloud_off;
}

/// Enum of all CRM features that can be checked for availability
enum CrmFeature {
  // Core CRM entities
  leads,
  contacts,
  accounts,
  opportunities,
  tasks,
  activities,
  campaigns,

  // Quotes features
  quotesBasic,
  quoteLineItems,
  quoteSend,
  quoteAccept,
  quoteReject,
  quoteStats,

  // Contracts features
  contractsBasic,
  contractSubmit,
  contractApprove,
  contractActivate,
  contractTerminate,
  contractRenew,
  contractStats,

  // AI & Intelligence
  aiInsights,
  morningBrief,
  irisRank,
  aiAgents,

  // Smart capture
  smartCapture,
  ocrProcessing,
  canvasNotepad,

  // Voice
  realtimeVoice,
  voiceTranscription,
}

/// Exception thrown when trying to use a feature not available in current mode
class FeatureNotAvailableException implements Exception {
  final CrmFeature feature;
  final AuthMode currentMode;
  final String message;

  FeatureNotAvailableException(this.feature, this.currentMode)
      : message = SalesforceFeatureSupport.getUnavailableMessage(feature);

  @override
  String toString() => message;
}

/// Provider to check feature availability
final featureAvailabilityProvider = Provider.family<bool, CrmFeature>((ref, feature) {
  final authMode = ref.watch(authModeProvider);
  return SalesforceFeatureSupport.isFeatureAvailable(feature, authMode);
});

/// Provider to get unavailable message
final featureUnavailableMessageProvider = Provider.family<String, CrmFeature>((ref, feature) {
  return SalesforceFeatureSupport.getUnavailableMessage(feature);
});
