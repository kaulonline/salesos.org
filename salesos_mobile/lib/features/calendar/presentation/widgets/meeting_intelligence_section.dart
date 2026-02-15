import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../services/meeting_prep_service.dart';

/// Meeting Intelligence Section Widget
/// Displays AI-generated meeting prep and insights
class MeetingIntelligenceSection extends ConsumerStatefulWidget {
  final String? meetingId;
  final String? accountId;
  final String? leadId;
  final String? opportunityId;
  final String? contactId;

  const MeetingIntelligenceSection({
    super.key,
    this.meetingId,
    this.accountId,
    this.leadId,
    this.opportunityId,
    this.contactId,
  });

  @override
  ConsumerState<MeetingIntelligenceSection> createState() =>
      _MeetingIntelligenceSectionState();
}

class _MeetingIntelligenceSectionState
    extends ConsumerState<MeetingIntelligenceSection> {
  bool _isExpanded = false;
  bool _isLoading = false;
  MeetingIntelligence? _intelligence;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Auto-fetch if we have context
    if (_hasContext) {
      _fetchIntelligence();
    }
  }

  bool get _hasContext =>
      widget.meetingId != null ||
      widget.accountId != null ||
      widget.leadId != null ||
      widget.opportunityId != null ||
      widget.contactId != null;

  Future<void> _fetchIntelligence() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(meetingPrepServiceProvider);
      final data = await service.getMeetingPrep(
        meetingId: widget.meetingId,
        accountId: widget.accountId,
        leadId: widget.leadId,
        opportunityId: widget.opportunityId,
        contactId: widget.contactId,
      );
      setState(() {
        _intelligence = data;
        _isLoading = false;
        _isExpanded = true; // Auto-expand when data arrives
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load meeting intelligence';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!_hasContext) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            LuxuryColors.rolexGreen.withValues(alpha: 0.12),
            LuxuryColors.deepEmerald.withValues(alpha: 0.06),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.rolexGreen.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header (always visible)
          _buildHeader(isDark),

          // Content (expandable)
          if (_isExpanded) ...[
            Container(
              height: 1,
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            if (_isLoading)
              _buildLoadingState(isDark)
            else if (_error != null)
              _buildErrorState(isDark)
            else if (_intelligence != null)
              _buildContent(isDark),
          ],
        ],
      ),
    ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.05);
  }

  Widget _buildHeader(bool isDark) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        if (_intelligence == null && !_isLoading && _error == null) {
          _fetchIntelligence();
        } else {
          setState(() => _isExpanded = !_isExpanded);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: LuxuryColors.emeraldGradient,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(
                Iconsax.magic_star,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Meeting Intelligence',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _intelligence != null
                        ? 'AI-powered briefing ready'
                        : _isLoading
                            ? 'Generating insights...'
                            : 'Tap to generate AI briefing',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white54 : Colors.black45,
                    ),
                  ),
                ],
              ),
            ),
            if (_isLoading)
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: LuxuryColors.rolexGreen,
                ),
              )
            else
              Icon(
                _isExpanded ? Iconsax.arrow_up_2 : Iconsax.arrow_down_1,
                size: 20,
                color: isDark ? Colors.white54 : Colors.black45,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 8),
          CircularProgressIndicator(
            color: LuxuryColors.rolexGreen,
            strokeWidth: 2,
          ),
          const SizedBox(height: 16),
          Text(
            'Analyzing CRM data and generating insights...',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white54 : Colors.black45,
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildErrorState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Icon(
            Iconsax.warning_2,
            size: 32,
            color: IrisTheme.error,
          ),
          const SizedBox(height: 12),
          Text(
            _error ?? 'Something went wrong',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _fetchIntelligence,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Try Again',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: LuxuryColors.rolexGreen,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    final intel = _intelligence!;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Executive Summary
          if (intel.executiveSummary.isNotEmpty) ...[
            _buildSectionHeader('Executive Summary', Iconsax.document_text, isDark),
            const SizedBox(height: 8),
            Text(
              intel.executiveSummary,
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: isDark ? Colors.white.withValues(alpha: 0.85) : Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Relationship Strength Badge
          if (intel.relationshipStrength != null) ...[
            _buildRelationshipBadge(intel.relationshipStrength!, isDark),
            const SizedBox(height: 16),
          ],

          // Suggested Agenda
          if (intel.suggestedAgenda.isNotEmpty) ...[
            _buildExpandableList(
              'Suggested Agenda',
              Iconsax.calendar_tick,
              intel.suggestedAgenda,
              isDark,
              color: const Color(0xFF5B8DEF),
            ),
            const SizedBox(height: 12),
          ],

          // Talking Points
          if (intel.talkingPoints.isNotEmpty) ...[
            _buildExpandableList(
              'Talking Points',
              Iconsax.message_text_1,
              intel.talkingPoints,
              isDark,
              color: LuxuryColors.rolexGreen,
            ),
            const SizedBox(height: 12),
          ],

          // Questions to Ask
          if (intel.questionsToAsk.isNotEmpty) ...[
            _buildExpandableList(
              'Questions to Ask',
              Iconsax.message_question,
              intel.questionsToAsk,
              isDark,
              color: LuxuryColors.champagneGold,
            ),
            const SizedBox(height: 12),
          ],

          // Potential Objections
          if (intel.potentialObjections.isNotEmpty) ...[
            _buildExpandableList(
              'Potential Objections',
              Iconsax.warning_2,
              intel.potentialObjections,
              isDark,
              color: const Color(0xFFE5A623),
            ),
            const SizedBox(height: 12),
          ],

          // Deal Risks
          if (intel.dealRisks.isNotEmpty) ...[
            _buildExpandableList(
              'Deal Risks',
              Iconsax.danger,
              intel.dealRisks,
              isDark,
              color: IrisTheme.error,
            ),
            const SizedBox(height: 12),
          ],

          // Company News
          if (intel.companyNews.isNotEmpty) ...[
            _buildSectionHeader('Recent Company News', Iconsax.global, isDark),
            const SizedBox(height: 8),
            ...intel.companyNews.map((news) => _buildNewsItem(news, isDark)),
            const SizedBox(height: 12),
          ],

          // Past Meeting Insights
          if (intel.pastMeetingInsights.isNotEmpty) ...[
            _buildSectionHeader('Past Meeting Insights', Iconsax.video, isDark),
            const SizedBox(height: 8),
            ...intel.pastMeetingInsights.map((insight) =>
                _buildPastMeetingInsight(insight, isDark)),
            const SizedBox(height: 12),
          ],

          // Recommended Approach
          if (intel.recommendedApproach != null &&
              intel.recommendedApproach!.isNotEmpty) ...[
            _buildSectionHeader('Recommended Approach', Iconsax.lamp_on, isDark),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                ),
              ),
              child: Text(
                intel.recommendedApproach!,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: isDark ? Colors.white.withValues(alpha: 0.9) : Colors.black87,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, bool isDark) {
    return Row(
      children: [
        Icon(icon, size: 16, color: isDark ? Colors.white54 : Colors.black45),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
            color: isDark ? Colors.white38 : Colors.black38,
          ),
        ),
      ],
    );
  }

  Widget _buildRelationshipBadge(String strength, bool isDark) {
    Color color;
    String label;
    IconData icon;

    switch (strength.toLowerCase()) {
      case 'strong':
        color = IrisTheme.success;
        label = 'Strong Relationship';
        icon = Iconsax.heart;
        break;
      case 'moderate':
        color = const Color(0xFF5B8DEF);
        label = 'Moderate Relationship';
        icon = Iconsax.like_1;
        break;
      case 'weak':
        color = const Color(0xFFE5A623);
        label = 'Needs Attention';
        icon = Iconsax.notification;
        break;
      case 'new':
      default:
        color = LuxuryColors.champagneGold;
        label = 'New Relationship';
        icon = Iconsax.star;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpandableList(
    String title,
    IconData icon,
    List<String> items,
    bool isDark, {
    Color? color,
  }) {
    final displayColor = color ?? LuxuryColors.rolexGreen;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: displayColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 14, color: displayColor),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: displayColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${items.length}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: displayColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return Padding(
              padding: EdgeInsets.only(bottom: index < items.length - 1 ? 8 : 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    margin: const EdgeInsets.only(top: 6),
                    decoration: BoxDecoration(
                      color: displayColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      item,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: isDark ? Colors.white70 : Colors.black54,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildNewsItem(CompanyNews news, bool isDark) {
    return GestureDetector(
      onTap: news.url != null
          ? () async {
              final uri = Uri.parse(news.url!);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            }
          : null,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.04)
              : Colors.black.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    news.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (news.url != null)
                  Icon(
                    Iconsax.export_1,
                    size: 14,
                    color: isDark ? Colors.white38 : Colors.black26,
                  ),
              ],
            ),
            if (news.snippet.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                news.snippet,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white54 : Colors.black45,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPastMeetingInsight(PastMeetingInsight insight, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  insight.title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ),
              Text(
                insight.date,
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? Colors.white38 : Colors.black38,
                ),
              ),
            ],
          ),
          if (insight.keyPoints.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: insight.keyPoints.take(3).map((point) {
                return Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    point.length > 30 ? '${point.substring(0, 30)}...' : point,
                    style: TextStyle(
                      fontSize: 10,
                      color: LuxuryColors.rolexGreen,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
          if (insight.objections.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(
                  Iconsax.warning_2,
                  size: 12,
                  color: const Color(0xFFE5A623),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Objection: ${insight.objections.first}',
                    style: TextStyle(
                      fontSize: 11,
                      color: const Color(0xFFE5A623),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
