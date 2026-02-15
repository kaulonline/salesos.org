import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/providers/auth_mode_provider.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../ai_chat/data/chat_service.dart';
import 'activity_page.dart';

/// Provider for AI-generated next steps
final activityNextStepsProvider = FutureProvider.family<ActivityNextSteps, ActivityItem>((ref, activity) async {
  final chatService = ref.read(chatServiceProvider);
  final authMode = ref.read(authModeProvider);
  final crmMode = authMode == AuthMode.salesforce ? 'salesforce' : 'local';

  // Create a temporary conversation for AI analysis
  final conversation = await chatService.createConversation();

  try {
    // Ask AI for next steps based on activity
    final prompt = _buildNextStepsPrompt(activity);
    final response = await chatService.sendMessage(
      conversationId: conversation.id,
      message: prompt,
      mode: crmMode,
    );

    // Clean up temporary conversation to avoid polluting chat history
    await chatService.deleteConversation(conversation.id);

    if (response != null) {
      return ActivityNextSteps.fromAIResponse(activity, response.content);
    }
  } catch (e) {
    // Still try to delete the conversation on error
    await chatService.deleteConversation(conversation.id);
  }

  return ActivityNextSteps.placeholder(activity);
});

String _buildNextStepsPrompt(ActivityItem activity) {
  final typeStr = activity.type.toString().split('.').last;
  final metadataStr = activity.metadata?.entries.map((e) => '${e.key}: ${e.value}').join(', ') ?? '';

  return '''Based on this sales activity, provide 3-4 specific, immediately executable actions. Each action should be something the user can do RIGHT NOW with one tap.

Activity Type: $typeStr
Title: ${activity.title}
Description: ${activity.description}
Related Entity: ${activity.relatedEntity}
${metadataStr.isNotEmpty ? 'Additional Info: $metadataStr' : ''}
Timestamp: ${activity.timestamp.toIso8601String()}

IMPORTANT: Return a JSON object with this EXACT structure:
{
  "analysis": "Brief 1-2 sentence analysis of what happened and why it matters",
  "priority": "High" or "Medium" or "Low",
  "timeline": "e.g., Today, Within 24 hours, This week",
  "actions": [
    {"type": "email", "label": "Send follow-up email", "description": "Thank them for the call and confirm next steps", "to": "contact email if known", "subject": "suggested subject line"},
    {"type": "call", "label": "Schedule call", "description": "Why this call is important"},
    {"type": "task", "label": "Create task", "description": "What needs to be done", "dueDate": "suggested due date"},
    {"type": "meeting", "label": "Book meeting", "description": "Purpose of meeting"},
    {"type": "note", "label": "Log note", "description": "Key points to document"},
    {"type": "update_crm", "label": "Update deal stage", "description": "What to update in CRM"}
  ]
}

Action types: email, call, task, meeting, note, update_crm, research, share_doc
Provide 3-4 most relevant actions. Be specific with labels and descriptions.''';
}

/// Action item that can be executed with one tap
class ActionItem {
  final String type;
  final String label;
  final String description;
  final Map<String, String> params;

  ActionItem({
    required this.type,
    required this.label,
    required this.description,
    this.params = const {},
  });

  IconData get icon {
    switch (type) {
      case 'email':
        return Iconsax.sms;
      case 'call':
        return Iconsax.call;
      case 'task':
        return Iconsax.task_square;
      case 'meeting':
        return Iconsax.calendar;
      case 'note':
        return Iconsax.note;
      case 'update_crm':
        return Iconsax.refresh;
      case 'research':
        return Iconsax.search_normal;
      case 'share_doc':
        return Iconsax.document_upload;
      default:
        return Iconsax.flash;
    }
  }

  Color get color {
    switch (type) {
      case 'email':
        return IrisTheme.success;
      case 'call':
        return LuxuryColors.rolexGreen;
      case 'task':
        return IrisTheme.warning;
      case 'meeting':
        return IrisTheme.irisBrown;
      case 'note':
        return IrisTheme.darkTextSecondary;
      case 'update_crm':
        return LuxuryColors.rolexGreen;
      case 'research':
        return LuxuryColors.jadePremium;
      case 'share_doc':
        return LuxuryColors.deepEmerald;
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  LinearGradient get gradient => LinearGradient(
    colors: [color, color.withValues(alpha: 0.7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

/// Model for AI-generated next steps
class ActivityNextSteps {
  final String analysis;
  final List<ActionItem> actions;
  final String priority;
  final String timeline;
  final bool isAIGenerated;

  ActivityNextSteps({
    required this.analysis,
    required this.actions,
    required this.priority,
    required this.timeline,
    this.isAIGenerated = true,
  });

  factory ActivityNextSteps.fromAIResponse(ActivityItem activity, String response) {
    String analysis = '';
    List<ActionItem> actions = [];
    String priority = 'Medium';
    String timeline = 'Within 24 hours';

    try {
      // Try to parse as JSON first
      final jsonMatch = RegExp(r'\{[\s\S]*\}').firstMatch(response);
      if (jsonMatch != null) {
        final jsonStr = jsonMatch.group(0)!;
        final Map<String, dynamic> data = _parseJson(jsonStr);

        analysis = data['analysis'] as String? ?? '';
        priority = data['priority'] as String? ?? 'Medium';
        timeline = data['timeline'] as String? ?? 'Within 24 hours';

        final actionsList = data['actions'] as List<dynamic>? ?? [];
        for (final action in actionsList) {
          if (action is Map<String, dynamic>) {
            actions.add(ActionItem(
              type: action['type'] as String? ?? 'task',
              label: action['label'] as String? ?? 'Action',
              description: action['description'] as String? ?? '',
              params: {
                if (action['to'] != null) 'to': action['to'] as String,
                if (action['subject'] != null) 'subject': action['subject'] as String,
                if (action['dueDate'] != null) 'dueDate': action['dueDate'] as String,
              },
            ));
          }
        }
      }
    } catch (e) {
      // Silently ignore
    }

    // Fallback if parsing failed
    if (actions.isEmpty) {
      actions = _getDefaultActions(activity);
    }
    if (analysis.isEmpty) {
      analysis = 'This ${activity.type.toString().split('.').last} with ${activity.relatedEntity} represents an important touchpoint in your sales process.';
    }

    return ActivityNextSteps(
      analysis: analysis,
      actions: actions,
      priority: priority,
      timeline: timeline,
    );
  }

  static Map<String, dynamic> _parseJson(String jsonStr) {
    // Simple JSON parser for our structured response
    try {
      return Map<String, dynamic>.from(
        (jsonStr.contains('{') ? _decodeJson(jsonStr) : {}) as Map,
      );
    } catch (e) {
      return {};
    }
  }

  static dynamic _decodeJson(String jsonStr) {
    // Use Dart's built-in JSON decoder
    try {
      return const JsonDecoder().convert(jsonStr);
    } catch (e) {
      return {};
    }
  }

  factory ActivityNextSteps.placeholder(ActivityItem activity) {
    return ActivityNextSteps(
      analysis: 'This ${activity.type.toString().split('.').last} with ${activity.relatedEntity} is an important milestone in your sales engagement.',
      actions: _getDefaultActions(activity),
      priority: 'Medium',
      timeline: 'Within 24 hours',
      isAIGenerated: false,
    );
  }

  static List<ActionItem> _getDefaultActions(ActivityItem activity) {
    switch (activity.type) {
      case ActivityType.call:
        return [
          ActionItem(type: 'email', label: 'Send follow-up email', description: 'Summarize key discussion points and next steps'),
          ActionItem(type: 'note', label: 'Log call notes', description: 'Document action items and commitments'),
          ActionItem(type: 'task', label: 'Create follow-up task', description: 'Schedule next touchpoint within 48 hours'),
        ];
      case ActivityType.email:
        return [
          ActionItem(type: 'task', label: 'Set follow-up reminder', description: 'Follow up if no response in 2 days'),
          ActionItem(type: 'research', label: 'Research questions', description: 'Address any concerns raised'),
          ActionItem(type: 'call', label: 'Schedule call', description: 'Discuss next steps directly'),
        ];
      case ActivityType.meeting:
        return [
          ActionItem(type: 'email', label: 'Send meeting recap', description: 'Share notes and action items with attendees'),
          ActionItem(type: 'task', label: 'Create action items', description: 'Assign owners and deadlines'),
          ActionItem(type: 'update_crm', label: 'Update opportunity', description: 'Reflect any stage changes'),
        ];
      case ActivityType.dealWon:
        return [
          ActionItem(type: 'email', label: 'Send thank you note', description: 'Express gratitude to the customer'),
          ActionItem(type: 'task', label: 'Initiate handoff', description: 'Coordinate with customer success'),
          ActionItem(type: 'note', label: 'Document lessons', description: 'Record what worked for future deals'),
        ];
      case ActivityType.dealLost:
        return [
          ActionItem(type: 'note', label: 'Document loss reason', description: 'Record why the deal was lost'),
          ActionItem(type: 'email', label: 'Send follow-up', description: 'Keep door open for future opportunities'),
          ActionItem(type: 'task', label: 'Set reconnect reminder', description: 'Follow up in 6 months'),
        ];
      case ActivityType.stageChange:
        return [
          ActionItem(type: 'update_crm', label: 'Review timeline', description: 'Update deal close date if needed'),
          ActionItem(type: 'task', label: 'Stage requirements', description: 'Ensure all requirements are met'),
          ActionItem(type: 'email', label: 'Update stakeholders', description: 'Communicate progress internally'),
        ];
      default:
        return [
          ActionItem(type: 'note', label: 'Log update', description: 'Document key insights'),
          ActionItem(type: 'task', label: 'Plan next step', description: 'Schedule next customer touchpoint'),
          ActionItem(type: 'email', label: 'Share with team', description: 'Keep stakeholders informed'),
        ];
    }
  }
}

class ActivityDetailPage extends ConsumerStatefulWidget {
  final ActivityItem activity;

  const ActivityDetailPage({super.key, required this.activity});

  @override
  ConsumerState<ActivityDetailPage> createState() => _ActivityDetailPageState();
}

class _ActivityDetailPageState extends ConsumerState<ActivityDetailPage> {
  Future<void> _handleDelete() async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Activity',
      message: 'Are you sure you want to delete this activity? This action cannot be undone.',
    );
    if (confirmed == true) {
      try {
        final crmService = ref.read(crmDataServiceProvider);
        await crmService.deleteActivity(widget.activity.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Activity deleted successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete activity: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nextStepsAsync = ref.watch(activityNextStepsProvider(widget.activity));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.arrow_back,
                  color: isDark ? Colors.white : Colors.black,
                  size: 20,
                ),
              ),
              onPressed: () => Navigator.of(context).pop(),
            ),
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Iconsax.trash,
                    color: IrisTheme.error,
                    size: 18,
                  ),
                ),
                onPressed: _handleDelete,
                tooltip: 'Delete',
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      _getActivityColor(widget.activity.type),
                      _getActivityColor(widget.activity.type).withValues(alpha: 0.7),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                _getActivityIcon(widget.activity.type),
                                color: Colors.white,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      _getActivityTypeName(widget.activity.type),
                                      style: IrisTheme.labelSmall.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    widget.activity.title,
                                    style: IrisTheme.titleLarge.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Activity Details Card
                  _buildDetailsCard(context, isDark).animate().fadeIn(duration: 300.ms).slideY(begin: 0.05),

                  const SizedBox(height: 16),

                  // AI Next Steps Card
                  nextStepsAsync.when(
                    data: (nextSteps) => _buildNextStepsCard(context, isDark, nextSteps)
                        .animate().fadeIn(delay: 150.ms, duration: 300.ms).slideY(begin: 0.05),
                    loading: () => _buildLoadingCard(context, isDark),
                    error: (error, stackTrace) => _buildNextStepsCard(
                      context,
                      isDark,
                      ActivityNextSteps.placeholder(widget.activity),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Call to Action Buttons
                  _buildCallToActionSection(context, isDark)
                      .animate().fadeIn(delay: 300.ms, duration: 300.ms).slideY(begin: 0.05),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsCard(BuildContext context, bool isDark) {
    return IrisCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.document_text,
                size: 18,
                color: LuxuryColors.jadePremium,
              ),
              const SizedBox(width: 8),
              Text(
                'Activity Details',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Description
          Text(
            widget.activity.description,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),

          // Info Grid
          _buildInfoRow(
            context,
            isDark,
            Iconsax.calendar,
            'Date & Time',
            _formatDateTime(widget.activity.timestamp),
          ),
          const SizedBox(height: 12),
          _buildInfoRow(
            context,
            isDark,
            Iconsax.link,
            'Related To',
            widget.activity.relatedEntity,
            isLink: true,
          ),
          if (widget.activity.metadata != null && widget.activity.metadata!.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...widget.activity.metadata!.entries.map((entry) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildInfoRow(
                  context,
                  isDark,
                  _getMetadataIcon(entry.key),
                  _formatMetadataKey(entry.key),
                  entry.value,
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, bool isDark, IconData icon, String label, String value, {bool isLink = false}) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: LuxuryColors.jadePremium),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isLink ? LuxuryColors.rolexGreen : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                  fontWeight: isLink ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingCard(BuildContext context, bool isDark) {
    return IrisCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Iconsax.magic_star, size: 18, color: LuxuryColors.jadePremium),
              ),
              const SizedBox(width: 12),
              Text(
                'Generating recommendations...',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _buildNextStepsCard(BuildContext context, bool isDark, ActivityNextSteps nextSteps) {
    return IrisCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header - minimal style
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Iconsax.magic_star, size: 18, color: LuxuryColors.jadePremium),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Recommended Actions',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getPriorityColor(nextSteps.priority).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  nextSteps.priority,
                  style: IrisTheme.labelSmall.copyWith(
                    color: _getPriorityColor(nextSteps.priority),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Analysis - subtle
          Text(
            nextSteps.analysis,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 16),

          // Actionable Steps
          ...nextSteps.actions.asMap().entries.map((entry) {
            final index = entry.key;
            final action = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _ActionButton(
                index: index,
                action: action,
                isDark: isDark,
                onExecute: () => _executeAction(context, action),
              ),
            );
          }),

          // Timeline - simple inline
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Iconsax.clock, size: 14, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
              const SizedBox(width: 6),
              Text(
                nextSteps.timeline,
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCallToActionSection(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildCTAButton(
                context,
                isDark,
                icon: Iconsax.call,
                label: 'Call',
                color: IrisTheme.info,
                onTap: () => _makeCall(context),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildCTAButton(
                context,
                isDark,
                icon: Iconsax.sms,
                label: 'Email',
                color: IrisTheme.success,
                onTap: () => _sendEmail(context),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildCTAButton(
                context,
                isDark,
                icon: Iconsax.calendar_add,
                label: 'Schedule',
                color: IrisTheme.warning,
                onTap: () => _scheduleFollowUp(context),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildCTAButton(
                context,
                isDark,
                icon: Iconsax.message_text,
                label: 'Ask SalesOS',
                color: LuxuryColors.jadePremium,
                isPrimary: true,
                onTap: () => _askIRIS(context),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Full-width Log Activity button
        _buildCTAButton(
          context,
          isDark,
          icon: Iconsax.add_circle,
          label: 'Log Follow-up Activity',
          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          fullWidth: true,
          outlined: true,
          onTap: () => _logActivity(context),
        ),
      ],
    );
  }

  Widget _buildCTAButton(
    BuildContext context,
    bool isDark, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    bool isPrimary = false,
    bool fullWidth = false,
    bool outlined = false,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          gradient: isPrimary ? IrisTheme.primaryGradient : null,
          color: isPrimary ? null : (outlined ? Colors.transparent : color.withValues(alpha: 0.15)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: outlined
                ? (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder)
                : (isPrimary ? Colors.transparent : color.withValues(alpha: 0.3)),
          ),
          boxShadow: isPrimary
              ? [BoxShadow(color: LuxuryColors.rolexGreen.withValues(alpha: 0.3), blurRadius: 8)]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: isPrimary
                  ? (isDark ? Colors.black : Colors.black87)
                  : (outlined
                      ? (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary)
                      : color),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: IrisTheme.labelLarge.copyWith(
                color: isPrimary
                    ? (isDark ? Colors.black : Colors.black87)
                    : (outlined
                        ? (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary)
                        : color),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Helper methods
  Color _getActivityColor(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return IrisTheme.info;
      case ActivityType.email:
        return IrisTheme.success;
      case ActivityType.meeting:
        return IrisTheme.warning;
      case ActivityType.note:
        return IrisTheme.darkTextSecondary;
      case ActivityType.dealWon:
        return LuxuryColors.rolexGreen;
      case ActivityType.dealLost:
        return IrisTheme.error;
      case ActivityType.stageChange:
        return IrisTheme.stageNegotiation;
      case ActivityType.taskComplete:
        return IrisTheme.success;
      case ActivityType.aiInsight:
        return LuxuryColors.rolexGreen;
    }
  }

  IconData _getActivityIcon(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return Iconsax.call;
      case ActivityType.email:
        return Iconsax.sms;
      case ActivityType.meeting:
        return Iconsax.people;
      case ActivityType.note:
        return Iconsax.note;
      case ActivityType.dealWon:
        return Iconsax.medal_star;
      case ActivityType.dealLost:
        return Iconsax.close_circle;
      case ActivityType.stageChange:
        return Iconsax.arrow_right_3;
      case ActivityType.taskComplete:
        return Iconsax.tick_circle;
      case ActivityType.aiInsight:
        return Iconsax.magic_star;
    }
  }

  String _getActivityTypeName(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return 'Phone Call';
      case ActivityType.email:
        return 'Email';
      case ActivityType.meeting:
        return 'Meeting';
      case ActivityType.note:
        return 'Note';
      case ActivityType.dealWon:
        return 'Deal Won';
      case ActivityType.dealLost:
        return 'Deal Lost';
      case ActivityType.stageChange:
        return 'Stage Change';
      case ActivityType.taskComplete:
        return 'Task Completed';
      case ActivityType.aiInsight:
        return 'AI Insight';
    }
  }

  IconData _getMetadataIcon(String key) {
    switch (key.toLowerCase()) {
      case 'duration':
        return Iconsax.timer_1;
      case 'amount':
        return Iconsax.dollar_circle;
      case 'attendees':
        return Iconsax.people;
      case 'attachments':
        return Iconsax.attach_circle;
      case 'from':
      case 'to':
        return Iconsax.arrow_right_3;
      case 'reason':
        return Iconsax.info_circle;
      default:
        return Iconsax.document;
    }
  }

  String _formatMetadataKey(String key) {
    return key.substring(0, 1).toUpperCase() + key.substring(1);
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dateOnly = DateTime(dateTime.year, dateTime.month, dateTime.day);

    String datePart;
    if (dateOnly == today) {
      datePart = 'Today';
    } else if (dateOnly == today.subtract(const Duration(days: 1))) {
      datePart = 'Yesterday';
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      datePart = '${months[dateTime.month - 1]} ${dateTime.day}, ${dateTime.year}';
    }

    final hour = dateTime.hour > 12 ? dateTime.hour - 12 : (dateTime.hour == 0 ? 12 : dateTime.hour);
    final period = dateTime.hour >= 12 ? 'PM' : 'AM';
    final timePart = '$hour:${dateTime.minute.toString().padLeft(2, '0')} $period';

    return '$datePart at $timePart';
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return IrisTheme.error;
      case 'low':
        return IrisTheme.success;
      default:
        return IrisTheme.warning;
    }
  }

  // CTA Actions
  void _makeCall(BuildContext context) async {
    // In a real app, would get contact phone from widget.activity.relatedEntity
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Initiating call to ${widget.activity.relatedEntity}...'),
        backgroundColor: IrisTheme.info,
      ),
    );
  }

  void _sendEmail(BuildContext context) async {
    // In a real app, would compose email to contact
    final subject = Uri.encodeComponent('Follow-up: ${widget.activity.title}');
    final uri = Uri.parse('mailto:?subject=$subject');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _scheduleFollowUp(BuildContext context) {
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: _ScheduleBottomSheet(activity: widget.activity),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  void _askIRIS(BuildContext context) {
    // Navigate to AI Chat with context about this activity
    Navigator.of(context).pushNamed('/iris');
  }

  void _logActivity(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Log activity feature coming soon',
          style: TextStyle(color: isDark ? Colors.black : Colors.black87),
        ),
        backgroundColor: LuxuryColors.rolexGreen,
        action: SnackBarAction(
          label: 'OK',
          textColor: isDark ? Colors.black : Colors.black87,
          onPressed: () {},
        ),
      ),
    );
  }

  /// Execute an AI-recommended action
  void _executeAction(BuildContext context, ActionItem action) async {
    HapticFeedback.mediumImpact();

    switch (action.type) {
      case 'email':
        await _executeEmailAction(context, action);
        break;
      case 'call':
        await _executeCallAction(context, action);
        break;
      case 'task':
        _executeTaskAction(context, action);
        break;
      case 'meeting':
        _executeMeetingAction(context, action);
        break;
      case 'note':
        _executeNoteAction(context, action);
        break;
      case 'update_crm':
        _executeUpdateCRMAction(context, action);
        break;
      case 'research':
        _executeResearchAction(context, action);
        break;
      case 'share_doc':
        _executeShareDocAction(context, action);
        break;
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Action: ${action.label}'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
    }
  }

  Future<void> _executeEmailAction(BuildContext context, ActionItem action) async {
    final to = action.params['to'] ?? '';
    final subject = Uri.encodeComponent(action.params['subject'] ?? 'Follow-up: ${widget.activity.title}');
    final body = Uri.encodeComponent(action.description);

    final uri = Uri.parse('mailto:$to?subject=$subject&body=$body');

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Opening email composer...'),
            backgroundColor: IrisTheme.success,
          ),
        );
      }
    }
  }

  Future<void> _executeCallAction(BuildContext context, ActionItem action) async {
    // Show confirmation and initiate call
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Iconsax.call, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text('Scheduling: ${action.label}')),
          ],
        ),
        backgroundColor: IrisTheme.info,
        action: SnackBarAction(
          label: 'Schedule',
          textColor: Colors.white,
          onPressed: () => _scheduleFollowUp(context),
        ),
      ),
    );
  }

  void _executeTaskAction(BuildContext context, ActionItem action) {
    // Navigate to task creation with pre-filled data
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Iconsax.task_square, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            const Expanded(child: Text('Creating task...')),
          ],
        ),
        backgroundColor: IrisTheme.warning,
        duration: const Duration(seconds: 2),
      ),
    );

    // Navigate to tasks page
    Future.delayed(const Duration(milliseconds: 500), () {
      if (context.mounted) {
        context.push(AppRoutes.tasks);
      }
    });
  }

  void _executeMeetingAction(BuildContext context, ActionItem action) {
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: _MeetingScheduleSheet(
              activity: widget.activity,
              action: action,
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  void _executeNoteAction(BuildContext context, ActionItem action) {
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: _NoteCreationSheet(
              activity: widget.activity,
              action: action,
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  void _executeUpdateCRMAction(BuildContext context, ActionItem action) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final snackTextColor = isDark ? Colors.black : Colors.black87;
    // Navigate to entity detail or show update options
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Iconsax.refresh, color: snackTextColor, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(action.description, style: TextStyle(color: snackTextColor))),
          ],
        ),
        backgroundColor: LuxuryColors.rolexGreen,
        action: SnackBarAction(
          label: 'Update',
          textColor: snackTextColor,
          onPressed: () {
            // Navigate to relevant CRM entity
            if (widget.activity.relatedEntity.contains('Deal') || widget.activity.relatedEntity.contains('Opportunity')) {
              context.push(AppRoutes.deals);
            } else if (widget.activity.relatedEntity.contains('Lead')) {
              context.push(AppRoutes.leads);
            } else if (widget.activity.relatedEntity.contains('Contact')) {
              context.push(AppRoutes.contacts);
            } else {
              context.push(AppRoutes.accounts);
            }
          },
        ),
      ),
    );
  }

  void _executeResearchAction(BuildContext context, ActionItem action) {
    // Navigate to IRIS chat with research context
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Iconsax.search_normal, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            const Expanded(child: Text('Opening SalesOS for research...')),
          ],
        ),
        backgroundColor: LuxuryColors.rolexGreen,
        duration: const Duration(seconds: 1),
      ),
    );

    Future.delayed(const Duration(milliseconds: 500), () {
      if (context.mounted) {
        context.push(AppRoutes.aiChat);
      }
    });
  }

  void _executeShareDocAction(BuildContext context, ActionItem action) {
    // Show share options
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Iconsax.document_upload, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text('Preparing to share: ${action.label}')),
          ],
        ),
        backgroundColor: LuxuryColors.jadePremium,
        action: SnackBarAction(
          label: 'Share',
          textColor: Colors.white,
          onPressed: () {
            // Open share sheet
          },
        ),
      ),
    );
  }
}

/// Centered dialog for scheduling follow-up
class _ScheduleBottomSheet extends StatelessWidget {
  final ActivityItem activity;

  const _ScheduleBottomSheet({required this.activity});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Iconsax.calendar_add, color: LuxuryColors.jadePremium),
                  const SizedBox(width: 12),
                  Text(
                    'Schedule Follow-up',
                    style: IrisTheme.titleMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'For: ${activity.relatedEntity}',
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 20),

              // Quick schedule options
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _QuickScheduleChip(label: 'Tomorrow', onTap: () => Navigator.pop(context)),
                  _QuickScheduleChip(label: 'In 2 days', onTap: () => Navigator.pop(context)),
                  _QuickScheduleChip(label: 'Next week', onTap: () => Navigator.pop(context)),
                  _QuickScheduleChip(label: 'In 2 weeks', onTap: () => Navigator.pop(context)),
                  _QuickScheduleChip(label: 'Custom...', outlined: true, onTap: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickScheduleChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool outlined;

  const _QuickScheduleChip({
    required this.label,
    required this.onTap,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: outlined ? Colors.transparent : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: outlined
                ? (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder)
                : LuxuryColors.rolexGreen.withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          label,
          style: IrisTheme.labelMedium.copyWith(
            color: outlined
                ? (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary)
                : LuxuryColors.rolexGreen,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

/// Actionable button for AI-recommended steps - Apple-style minimal design
class _ActionButton extends StatelessWidget {
  final int index;
  final ActionItem action;
  final bool isDark;
  final VoidCallback onExecute;

  const _ActionButton({
    required this.index,
    required this.action,
    required this.isDark,
    required this.onExecute,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onExecute();
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
        ),
        child: Row(
          children: [
            // Simple solid color icon background
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: action.color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                action.icon,
                color: action.color,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            // Action content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    action.label,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    action.description,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // Simple chevron
            Icon(
              Icons.chevron_right,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              size: 20,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: Duration(milliseconds: 30 * index));
  }
}

/// Centered dialog for scheduling a meeting
class _MeetingScheduleSheet extends StatefulWidget {
  final ActivityItem activity;
  final ActionItem action;

  const _MeetingScheduleSheet({required this.activity, required this.action});

  @override
  State<_MeetingScheduleSheet> createState() => _MeetingScheduleSheetState();
}

class _MeetingScheduleSheetState extends State<_MeetingScheduleSheet> {
  DateTime selectedDate = DateTime.now().add(const Duration(days: 1));
  String selectedDuration = '30 min';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Text(
                'Schedule Meeting',
                style: IrisTheme.titleLarge.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.action.description,
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 20),

              // Date options
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _DateChip(
                    label: 'Tomorrow',
                    isSelected: _isDateSame(selectedDate, DateTime.now().add(const Duration(days: 1))),
                    onTap: () => setState(() => selectedDate = DateTime.now().add(const Duration(days: 1))),
                  ),
                  _DateChip(
                    label: 'In 2 days',
                    isSelected: _isDateSame(selectedDate, DateTime.now().add(const Duration(days: 2))),
                    onTap: () => setState(() => selectedDate = DateTime.now().add(const Duration(days: 2))),
                  ),
                  _DateChip(
                    label: 'Next week',
                    isSelected: _isDateSame(selectedDate, DateTime.now().add(const Duration(days: 7))),
                    onTap: () => setState(() => selectedDate = DateTime.now().add(const Duration(days: 7))),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Duration options
              Wrap(
                spacing: 8,
                children: ['15 min', '30 min', '45 min', '1 hour'].map((duration) {
                  return _DateChip(
                    label: duration,
                    isSelected: selectedDuration == duration,
                    onTap: () => setState(() => selectedDuration = duration),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Schedule button - solid color
              SizedBox(
                width: double.infinity,
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Meeting scheduled',
                          style: TextStyle(color: isDark ? Colors.black : Colors.black87),
                        ),
                        backgroundColor: IrisTheme.success,
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: LuxuryColors.jadePremium,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Schedule',
                      textAlign: TextAlign.center,
                      style: IrisTheme.labelLarge.copyWith(
                        color: isDark ? Colors.black : Colors.black87,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool _isDateSame(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

class _DateChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _DateChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen
              : (isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated),
          borderRadius: BorderRadius.circular(8),
          border: isSelected
              ? null
              : Border.all(color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
        ),
        child: Text(
          label,
          style: IrisTheme.labelMedium.copyWith(
            color: isSelected
                ? (isDark ? Colors.black : Colors.black87)
                : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

/// Centered dialog for creating notes
class _NoteCreationSheet extends StatefulWidget {
  final ActivityItem activity;
  final ActionItem action;

  const _NoteCreationSheet({required this.activity, required this.action});

  @override
  State<_NoteCreationSheet> createState() => _NoteCreationSheetState();
}

class _NoteCreationSheetState extends State<_NoteCreationSheet> {
  final _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _noteController.text = widget.action.description;
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Add Note',
                    style: IrisTheme.titleLarge.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(
                      Icons.close,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      size: 24,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Note text area
              Container(
                decoration: BoxDecoration(
                  color: isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  ),
                ),
                child: TextField(
                  controller: _noteController,
                  maxLines: 4,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Add your notes here...',
                    hintStyle: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Save button - solid color
              SizedBox(
                width: double.infinity,
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Note saved',
                          style: TextStyle(color: isDark ? Colors.black : Colors.black87),
                        ),
                        backgroundColor: IrisTheme.success,
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: LuxuryColors.jadePremium,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Save',
                      textAlign: TextAlign.center,
                      style: IrisTheme.labelLarge.copyWith(
                        color: isDark ? Colors.black : Colors.black87,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
