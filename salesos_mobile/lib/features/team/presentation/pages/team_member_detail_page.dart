import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../data/team_service.dart';

class TeamMemberDetailPage extends ConsumerWidget {
  final String memberId;

  const TeamMemberDetailPage({super.key, required this.memberId});

  String _formatDate(DateTime date) => DateFormat('MMM dd, yyyy').format(date);

  Color _roleColor(MemberRole role) {
    switch (role) {
      case MemberRole.OWNER: return LuxuryColors.champagneGold;
      case MemberRole.ADMIN: return LuxuryColors.errorRuby;
      case MemberRole.MANAGER: return LuxuryColors.infoCobalt;
      case MemberRole.USER: return LuxuryColors.rolexGreen;
      case MemberRole.VIEWER: return LuxuryColors.warmGray;
    }
  }

  Color _statusColor(MemberStatus status) {
    switch (status) {
      case MemberStatus.ACTIVE: return LuxuryColors.successGreen;
      case MemberStatus.PENDING: return LuxuryColors.warningAmber;
      case MemberStatus.SUSPENDED: return LuxuryColors.errorRuby;
      case MemberStatus.INACTIVE: return LuxuryColors.warmGray;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(teamMemberDetailProvider(memberId));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: asyncData.when(
          data: (member) {
            if (member == null) return _buildNotFound(context, isDark);
            return _buildContent(context, ref, member, isDark);
          },
          loading: () => _buildLoading(context, isDark),
          error: (error, _) => _buildError(context, ref, isDark),
        ),
      ),
    );
  }

  Widget _header(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(children: [
        IconButton(onPressed: () { HapticFeedback.lightImpact(); context.pop(); },
            icon: Icon(Iconsax.arrow_left, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
        const SizedBox(width: 8),
        Expanded(child: Text('Member Details', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
      ]),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildNotFound(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.user, size: 64, color: LuxuryColors.textMuted.withValues(alpha: 0.4)),
        const SizedBox(height: 16),
        Text('Member not found', style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
      ])))]);
  }

  Widget _buildLoading(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
        IrisShimmer(width: double.infinity, height: 200, borderRadius: 20, tier: LuxuryTier.gold),
        const SizedBox(height: 16),
        IrisShimmer(width: double.infinity, height: 100, borderRadius: 16, tier: LuxuryTier.gold),
      ])))]);
  }

  Widget _buildError(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
        const SizedBox(height: 16),
        Text('Failed to load member', style: TextStyle(fontSize: 16,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
        const SizedBox(height: 16),
        TextButton.icon(onPressed: () => ref.invalidate(teamMemberDetailProvider(memberId)),
            icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
      ])))]);
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, TeamMember member, bool isDark) {
    final rColor = _roleColor(member.role);
    final sColor = _statusColor(member.status);

    return Column(children: [
      _header(context, isDark),
      Expanded(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(teamMemberDetailProvider(memberId)),
          color: LuxuryColors.champagneGold,
          backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Profile card
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: rColor.withValues(alpha: 0.15),
                    child: Text(member.initials,
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.w600, color: rColor)),
                  ),
                  const SizedBox(height: 16),
                  Text(member.name, style: IrisTheme.headlineSmall.copyWith(
                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                  const SizedBox(height: 4),
                  Text(member.email, style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
                  const SizedBox(height: 16),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: rColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20)),
                      child: Text(member.roleLabel, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: rColor)),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: sColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Container(width: 6, height: 6, decoration: BoxDecoration(color: sColor, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Text(member.statusLabel, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: sColor)),
                      ]),
                    ),
                  ]),
                ]),
              ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Details
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(Iconsax.info_circle, size: 18, color: LuxuryColors.champagneGold),
                    const SizedBox(width: 8),
                    Text('Details', style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 16),
                  _row('Joined', _formatDate(member.joinedAt), isDark),
                  if (member.lastActive != null) ...[
                    const SizedBox(height: 10),
                    _row('Last Active', _formatDate(member.lastActive!), isDark),
                  ],
                  const SizedBox(height: 10),
                  _row('Member ID', member.id, isDark),
                ]),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),
            ]),
          ),
        ),
      ),
    ]);
  }

  Widget _row(String label, String value, bool isDark) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
      Flexible(child: Text(value, style: IrisTheme.bodyMedium.copyWith(
          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          fontWeight: FontWeight.w500), textAlign: TextAlign.right, maxLines: 1, overflow: TextOverflow.ellipsis)),
    ]);
  }
}
