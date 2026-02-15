import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/meetings_service.dart';

class MeetingDetailPage extends ConsumerStatefulWidget {
  final String meetingId;

  const MeetingDetailPage({super.key, required this.meetingId});

  @override
  ConsumerState<MeetingDetailPage> createState() => _MeetingDetailPageState();
}

class _MeetingDetailPageState extends ConsumerState<MeetingDetailPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isAnalyzing = false;
  bool _isGeneratingSummary = false;
  bool _isApprovingActions = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _statusColor(MeetingStatus status) {
    switch (status) {
      case MeetingStatus.SCHEDULED:
        return LuxuryColors.infoCobalt;
      case MeetingStatus.IN_PROGRESS:
        return LuxuryColors.jadePremium;
      case MeetingStatus.COMPLETED:
        return LuxuryColors.rolexGreen;
      case MeetingStatus.CANCELLED:
        return LuxuryColors.errorRuby;
      case MeetingStatus.NO_SHOW:
        return LuxuryColors.warningAmber;
    }
  }

  Color _botStatusColor(BotStatus status) {
    switch (status) {
      case BotStatus.notJoined:
        return LuxuryColors.textMuted;
      case BotStatus.joining:
        return LuxuryColors.warningAmber;
      case BotStatus.recording:
        return LuxuryColors.errorRuby;
      case BotStatus.processing:
        return LuxuryColors.infoCobalt;
      case BotStatus.complete:
        return LuxuryColors.rolexGreen;
      case BotStatus.error:
        return LuxuryColors.errorRuby;
    }
  }

  IconData _meetingTypeIcon(MeetingType type) {
    switch (type) {
      case MeetingType.CALL:
        return Iconsax.call;
      case MeetingType.VIDEO:
        return Iconsax.video;
      case MeetingType.IN_PERSON:
        return Iconsax.people;
      case MeetingType.WEBINAR:
        return Iconsax.monitor;
    }
  }

  Future<void> _onAnalyze() async {
    setState(() => _isAnalyzing = true);
    final service = ref.read(meetingsServiceProvider);
    final success = await service.analyze(widget.meetingId);
    setState(() => _isAnalyzing = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Analysis started successfully'
              : 'Failed to start analysis'),
        ),
      );
      if (success) {
        ref.invalidate(meetingDetailProvider(widget.meetingId));
      }
    }
  }

  Future<void> _onGenerateSummary() async {
    setState(() => _isGeneratingSummary = true);
    final service = ref.read(meetingsServiceProvider);
    final summary = await service.generateSummary(widget.meetingId);
    setState(() => _isGeneratingSummary = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(summary != null
              ? 'Summary generated successfully'
              : 'Failed to generate summary'),
        ),
      );
      if (summary != null) {
        ref.invalidate(meetingDetailProvider(widget.meetingId));
      }
    }
  }

  Future<void> _onApproveActions(List<MeetingActionItem> items) async {
    setState(() => _isApprovingActions = true);
    final service = ref.read(meetingsServiceProvider);
    final ids = items.map((i) => i.id).toList();
    final success = await service.approveActions(widget.meetingId, ids);
    setState(() => _isApprovingActions = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Action items approved'
              : 'Failed to approve action items'),
        ),
      );
      if (success) {
        ref.invalidate(meetingDetailProvider(widget.meetingId));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final meetingAsync = ref.watch(meetingDetailProvider(widget.meetingId));

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: meetingAsync.when(
          data: (meeting) {
            if (meeting == null) {
              return Center(
                child: IrisEmptyState(
                  icon: Iconsax.calendar_1,
                  title: 'Meeting not found',
                  subtitle: 'This meeting may have been deleted',
                ),
              );
            }
            return _buildContent(context, meeting, isDark);
          },
          loading: () => const Center(
            child: IrisShimmer(width: double.infinity, height: 400),
          ),
          error: (error, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
                const SizedBox(height: 16),
                Text(
                  'Failed to load meeting',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => ref
                      .invalidate(meetingDetailProvider(widget.meetingId)),
                  child: Text(
                    'Retry',
                    style: TextStyle(
                      color: isDark
                          ? LuxuryColors.jadePremium
                          : LuxuryColors.rolexGreen,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(
      BuildContext context, MeetingModel meeting, bool isDark) {
    final statusCol = _statusColor(meeting.status);
    final botCol = _botStatusColor(meeting.botStatus);

    return Column(
      children: [
        // Header with back button
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Row(
            children: [
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  context.pop();
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark
                        ? IrisTheme.darkSurfaceElevated
                        : IrisTheme.lightSurfaceElevated,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Iconsax.arrow_left,
                    size: 20,
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      meeting.title,
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      DateFormat('EEEE, MMM d, yyyy  HH:mm')
                          .format(meeting.startTime),
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 300.ms),

        // Meeting info card
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: IrisCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    // Meeting type
                    Icon(_meetingTypeIcon(meeting.type), size: 16, color: LuxuryColors.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      meeting.type.label,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Participants
                    Icon(Iconsax.people, size: 16, color: LuxuryColors.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      '${meeting.participants.length} participants',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Duration
                    Icon(Iconsax.clock, size: 16, color: LuxuryColors.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      '${meeting.endTime.difference(meeting.startTime).inMinutes} min',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const Spacer(),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusCol.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        meeting.status.label,
                        style: IrisTheme.labelSmall.copyWith(
                          color: statusCol,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                // Description
                if (meeting.description != null && meeting.description!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      meeting.description!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                // Location / meeting link
                if (meeting.location != null || meeting.meetingLink != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        meeting.meetingLink != null ? Iconsax.link : Iconsax.location,
                        size: 14,
                        color: LuxuryColors.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          meeting.meetingLink ?? meeting.location ?? '',
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                // Bot status row
                Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: botCol.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        meeting.botStatus == BotStatus.recording
                            ? Iconsax.record
                            : Iconsax.microphone,
                        size: 14,
                        color: botCol,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Bot: ${meeting.botStatus.label}',
                      style: IrisTheme.bodySmall.copyWith(
                        color: botCol,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                // Participants list
                if (meeting.participants.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: meeting.participants.map((participant) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark
                              ? IrisTheme.darkSurfaceElevated
                              : IrisTheme.lightSurfaceElevated,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          participant.name,
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
        ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

        const SizedBox(height: 12),

        // Action buttons
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              Expanded(
                child: IrisButton(
                  label: 'Analyze',
                  icon: Iconsax.cpu,
                  variant: IrisButtonVariant.outline,
                  size: IrisButtonSize.small,
                  isLoading: _isAnalyzing,
                  onPressed: _onAnalyze,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: IrisButton(
                  label: 'Summary',
                  icon: Iconsax.document_text,
                  variant: IrisButtonVariant.outline,
                  size: IrisButtonSize.small,
                  isLoading: _isGeneratingSummary,
                  onPressed: _onGenerateSummary,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: IrisButton(
                  label: 'Approve',
                  icon: Iconsax.tick_circle,
                  variant: IrisButtonVariant.emerald,
                  size: IrisButtonSize.small,
                  isLoading: _isApprovingActions,
                  onPressed: meeting.actionItems.isNotEmpty
                      ? () => _onApproveActions(meeting.actionItems)
                      : null,
                ),
              ),
            ],
          ),
        ).animate(delay: 150.ms).fadeIn(),

        const SizedBox(height: 12),

        // Detail tabs
        TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor:
              isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
          unselectedLabelColor: isDark
              ? IrisTheme.darkTextSecondary
              : IrisTheme.lightTextSecondary,
          indicatorColor:
              isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
          indicatorWeight: 3,
          labelStyle:
              IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Summary'),
            Tab(text: 'Transcript'),
            Tab(text: 'Action Items'),
            Tab(text: 'Insights'),
          ],
        ),

        const SizedBox(height: 8),

        // Tab content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _SummaryTab(meeting: meeting),
              _TranscriptTab(meeting: meeting),
              _ActionItemsTab(meeting: meeting),
              _InsightsTab(meeting: meeting),
            ],
          ),
        ),
      ],
    );
  }
}

/// Summary tab
class _SummaryTab extends StatelessWidget {
  final MeetingModel meeting;
  const _SummaryTab({required this.meeting});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (meeting.summary == null || meeting.summary!.isEmpty) {
      return IrisEmptyState(
        icon: Iconsax.document_text,
        title: 'No summary available',
        subtitle: 'Generate a summary using the button above',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: IrisCard(
        padding: const EdgeInsets.all(16),
        child: Text(
          meeting.summary!,
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
            height: 1.6,
          ),
        ),
      ),
    );
  }
}

/// Transcript tab
class _TranscriptTab extends StatelessWidget {
  final MeetingModel meeting;
  const _TranscriptTab({required this.meeting});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (meeting.transcript == null || meeting.transcript!.isEmpty) {
      return IrisEmptyState(
        icon: Iconsax.microphone,
        title: 'No transcript available',
        subtitle: 'Transcript will be available after recording is processed',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: IrisCard(
        padding: const EdgeInsets.all(16),
        child: SelectableText(
          meeting.transcript!,
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
            height: 1.6,
            fontFamily: 'monospace',
          ),
        ),
      ),
    );
  }
}

/// Action Items tab
class _ActionItemsTab extends StatelessWidget {
  final MeetingModel meeting;
  const _ActionItemsTab({required this.meeting});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (meeting.actionItems.isEmpty) {
      return IrisEmptyState(
        icon: Iconsax.task_square,
        title: 'No action items',
        subtitle: 'Action items will appear after meeting analysis',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: meeting.actionItems.length,
      itemBuilder: (context, index) {
        final item = meeting.actionItems[index];
        final isComplete = item.status == 'completed' || item.status == 'approved';

        return IrisCard(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isComplete
                      ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                      : LuxuryColors.warningAmber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isComplete ? Iconsax.tick_circle : Iconsax.clock,
                  size: 16,
                  color: isComplete
                      ? LuxuryColors.rolexGreen
                      : LuxuryColors.warningAmber,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        decoration:
                            isComplete ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    if (item.assignee != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Assigned to ${item.assignee}',
                        style: IrisTheme.caption.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
      },
    );
  }
}

/// Insights tab - now uses keyTopics and sentimentScore from web model
class _InsightsTab extends StatelessWidget {
  final MeetingModel meeting;
  const _InsightsTab({required this.meeting});

  Color _sentimentColor(double? score) {
    if (score == null) return LuxuryColors.infoCobalt;
    if (score > 0.3) return LuxuryColors.rolexGreen;
    if (score < -0.3) return LuxuryColors.errorRuby;
    return LuxuryColors.infoCobalt;
  }

  String _sentimentLabel(double? score) {
    if (score == null) return 'Unknown';
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (meeting.keyTopics.isEmpty && meeting.sentimentScore == null) {
      return IrisEmptyState(
        icon: Iconsax.chart_2,
        title: 'No insights yet',
        subtitle: 'Run analysis to extract meeting insights',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sentiment score card
          if (meeting.sentimentScore != null)
            IrisCard(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _sentimentColor(meeting.sentimentScore).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Iconsax.emoji_happy,
                      size: 20,
                      color: _sentimentColor(meeting.sentimentScore),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Sentiment Score',
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${meeting.sentimentScore!.toStringAsFixed(2)} - ${_sentimentLabel(meeting.sentimentScore)}',
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _sentimentColor(meeting.sentimentScore).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _sentimentLabel(meeting.sentimentScore),
                      style: IrisTheme.labelSmall.copyWith(
                        color: _sentimentColor(meeting.sentimentScore),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn().slideX(begin: 0.05),

          // Key topics
          if (meeting.keyTopics.isNotEmpty) ...[
            IrisCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Key Topics',
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: meeting.keyTopics.map((topic) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: isDark
                              ? IrisTheme.darkSurfaceElevated
                              : IrisTheme.lightSurfaceElevated,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          topic,
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ).animate(delay: 50.ms).fadeIn().slideX(begin: 0.05),
          ],
        ],
      ),
    );
  }
}
