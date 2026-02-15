import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/team_service.dart';
import '../widgets/team_member_card.dart';

class TeamPage extends ConsumerStatefulWidget {
  const TeamPage({super.key});

  @override
  ConsumerState<TeamPage> createState() => _TeamPageState();
}

class _TeamPageState extends ConsumerState<TeamPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text.toLowerCase());
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(teamMembersProvider);
  }

  List<TeamMember> _filter(List<TeamMember> items) {
    if (_searchQuery.isEmpty) return items;
    return items.where((item) =>
        item.name.toLowerCase().contains(_searchQuery) ||
        item.email.toLowerCase().contains(_searchQuery) ||
        item.roleLabel.toLowerCase().contains(_searchQuery)).toList();
  }

  void _showInviteDialog() {
    final emailController = TextEditingController();
    String selectedRole = 'USER';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(children: [
            Icon(Iconsax.user_add, size: 20, color: LuxuryColors.champagneGold),
            const SizedBox(width: 8),
            Text('Invite User', style: IrisTheme.titleMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary)),
          ]),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                decoration: InputDecoration(
                  labelText: 'Email',
                  labelStyle: TextStyle(color: LuxuryColors.textMuted),
                  filled: true,
                  fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: LuxuryColors.champagneGold)),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: selectedRole,
                decoration: InputDecoration(
                  labelText: 'Role',
                  labelStyle: TextStyle(color: LuxuryColors.textMuted),
                  filled: true,
                  fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
                ),
                dropdownColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                items: const [
                  DropdownMenuItem(value: 'ADMIN', child: Text('Admin')),
                  DropdownMenuItem(value: 'MANAGER', child: Text('Manager')),
                  DropdownMenuItem(value: 'USER', child: Text('User')),
                  DropdownMenuItem(value: 'VIEWER', child: Text('Viewer')),
                ],
                onChanged: (v) => setDialogState(() => selectedRole = v!),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text('Cancel', style: IrisTheme.labelMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary)),
            ),
            TextButton(
              onPressed: () async {
                if (emailController.text.trim().isEmpty) return;
                final service = ref.read(teamServiceProvider);
                await service.inviteMember(emailController.text.trim(), selectedRole);
                ref.invalidate(teamMembersProvider);
                if (ctx.mounted) Navigator.of(ctx).pop();
              },
              child: Text('Invite', style: IrisTheme.labelMedium.copyWith(
                  color: LuxuryColors.jadePremium, fontWeight: IrisTheme.weightSemiBold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(teamMembersProvider);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      floatingActionButton: FloatingActionButton(
        onPressed: _showInviteDialog,
        backgroundColor: LuxuryColors.champagneGold,
        child: const Icon(Iconsax.user_add, color: Colors.white),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(children: [
                IconButton(
                  onPressed: () { HapticFeedback.lightImpact(); context.pop(); },
                  icon: Icon(Iconsax.arrow_left,
                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                ),
                const SizedBox(width: 8),
                Expanded(child: Text('Team',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
              ]),
            ).animate().fadeIn(duration: 300.ms),

            // Summary
            asyncData.when(
              data: (members) {
                final active = members.where((m) => m.status == MemberStatus.ACTIVE).length;
                final pending = members.where((m) => m.status == MemberStatus.PENDING).length;
                return Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                  child: Row(children: [
                    _SummaryChip(label: 'Total', value: '${members.length}', color: LuxuryColors.champagneGold, isDark: isDark),
                    const SizedBox(width: 12),
                    _SummaryChip(label: 'Active', value: '$active', color: LuxuryColors.successGreen, isDark: isDark),
                    const SizedBox(width: 12),
                    _SummaryChip(label: 'Pending', value: '$pending', color: LuxuryColors.warningAmber, isDark: isDark),
                  ]),
                ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1);
              },
              loading: () => const SizedBox(height: 60),
              error: (e, s) => const SizedBox(height: 60),
            ),

            const SizedBox(height: 16),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                style: TextStyle(fontSize: 15, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                decoration: InputDecoration(
                  hintText: 'Search team members...',
                  hintStyle: TextStyle(color: LuxuryColors.textMuted),
                  prefixIcon: Icon(Iconsax.search_normal, size: 20, color: LuxuryColors.champagneGold),
                  filled: true,
                  fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: LuxuryColors.champagneGold)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ).animate(delay: 100.ms).fadeIn(),

            const SizedBox(height: 12),

            Expanded(
              child: asyncData.when(
                data: (items) {
                  final filtered = _filter(items);
                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.people,
                      title: _searchQuery.isNotEmpty ? 'No members found' : 'No team members yet',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search' : 'Invite people to join your team',
                      tier: LuxuryTier.gold,
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: LuxuryColors.champagneGold,
                    backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: TeamMemberCard(
                          member: filtered[index],
                          onTap: () => context.push('/settings/team/${filtered[index].id}'),
                          animationIndex: index,
                        ),
                      ),
                    ),
                  );
                },
                loading: () => const IrisListShimmer(itemCount: 6, itemHeight: 80, tier: LuxuryTier.gold),
                error: (error, _) => Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                    const SizedBox(height: 16),
                    Text('Failed to load team',
                        style: TextStyle(fontSize: 16, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                    const SizedBox(height: 16),
                    TextButton.icon(onPressed: _onRefresh, icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _SummaryChip({required this.label, required this.value, required this.color, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: color)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
          ],
        ),
      ),
    );
  }
}
