import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/team_service.dart';

class TeamMemberCard extends StatelessWidget {
  final TeamMember member;
  final VoidCallback? onTap;
  final int animationIndex;

  const TeamMemberCard({
    super.key,
    required this.member,
    this.onTap,
    this.animationIndex = 0,
  });

  Color _roleColor() {
    switch (member.role) {
      case MemberRole.OWNER: return LuxuryColors.champagneGold;
      case MemberRole.ADMIN: return LuxuryColors.errorRuby;
      case MemberRole.MANAGER: return LuxuryColors.infoCobalt;
      case MemberRole.USER: return LuxuryColors.rolexGreen;
      case MemberRole.VIEWER: return LuxuryColors.warmGray;
    }
  }

  Color _statusColor() {
    switch (member.status) {
      case MemberStatus.ACTIVE: return LuxuryColors.successGreen;
      case MemberStatus.PENDING: return LuxuryColors.warningAmber;
      case MemberStatus.SUSPENDED: return LuxuryColors.errorRuby;
      case MemberStatus.INACTIVE: return LuxuryColors.warmGray;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        variant: LuxuryCardVariant.standard,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Avatar
            CircleAvatar(
              radius: 24,
              backgroundColor: _roleColor().withValues(alpha: 0.15),
              child: Text(
                member.initials,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _roleColor(),
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          member.name,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _roleColor().withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          member.roleLabel,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _roleColor()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    member.email,
                    style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // Status dot
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _statusColor().withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6, height: 6,
                    decoration: BoxDecoration(color: _statusColor(), shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 5),
                  Text(member.statusLabel,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _statusColor())),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}
