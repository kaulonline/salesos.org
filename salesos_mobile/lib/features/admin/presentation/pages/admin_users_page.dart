import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../data/admin_service.dart';
import '../widgets/user_edit_sheet.dart';

class AdminUsersPage extends ConsumerStatefulWidget {
  const AdminUsersPage({super.key});

  @override
  ConsumerState<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends ConsumerState<AdminUsersPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _roleFilter = 'ALL';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<AdminUserModel> _filterUsers(List<AdminUserModel> users) {
    var filtered = users;

    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((u) {
        final query = _searchQuery.toLowerCase();
        return u.displayName.toLowerCase().contains(query) ||
            u.email.toLowerCase().contains(query);
      }).toList();
    }

    if (_roleFilter != 'ALL') {
      filtered = filtered
          .where((u) => u.role.toUpperCase() == _roleFilter)
          .toList();
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(adminUsersProvider);

    return Column(
      children: [
        // Search and filter bar
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Column(
            children: [
              IrisSearchField(
                controller: _searchController,
                hint: 'Search users...',
                tier: LuxuryTier.gold,
                onChanged: (value) {
                  setState(() => _searchQuery = value);
                },
                onClear: () {
                  setState(() => _searchQuery = '');
                },
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final role in ['ALL', 'ADMIN', 'MANAGER', 'USER', 'VIEWER'])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: LuxuryChip(
                          label: role,
                          selected: _roleFilter == role,
                          tier: LuxuryTier.gold,
                          onTap: () {
                            setState(() => _roleFilter = role);
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        // User list
        Expanded(
          child: usersAsync.when(
            loading: () => const IrisListShimmer(),
            error: (err, _) => IrisEmptyState.error(
              message: 'Failed to load users',
              onRetry: () => ref.invalidate(adminUsersProvider),
            ),
            data: (users) {
              final filtered = _filterUsers(users);

              if (filtered.isEmpty) {
                return IrisEmptyState.search(
                  query: _searchQuery.isNotEmpty ? _searchQuery : null,
                );
              }

              return RefreshIndicator(
                color: LuxuryColors.champagneGold,
                onRefresh: () async => ref.invalidate(adminUsersProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final user = filtered[index];
                    return _UserCard(
                      user: user,
                      onTap: () => _showEditSheet(user),
                    ).animate().fadeIn(delay: Duration(milliseconds: 30 * index));
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _showEditSheet(AdminUserModel user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => UserEditSheet(
        user: user,
        onSaved: () {
          ref.invalidate(adminUsersProvider);
        },
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  final AdminUserModel user;
  final VoidCallback? onTap;

  const _UserCard({required this.user, this.onTap});

  Color _roleColor(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return LuxuryColors.champagneGold;
      case 'MANAGER':
        return LuxuryColors.infoCobalt;
      case 'USER':
        return LuxuryColors.rolexGreen;
      case 'VIEWER':
        return LuxuryColors.textMuted;
      default:
        return LuxuryColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final roleColor = _roleColor(user.role);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        padding: const EdgeInsets.all(16),
        onTap: onTap,
        child: Row(
          children: [
            // Avatar
            LuxuryAvatar(
              initials: _initials(user.displayName),
              tier: user.isAdmin ? LuxuryTier.gold : LuxuryTier.gold,
              size: 44,
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          user.displayName,
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!user.isActive)
                        LuxuryBadge(
                          text: 'Suspended',
                          color: LuxuryColors.errorRuby,
                          tier: LuxuryTier.gold,
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.email,
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      // System role
                      LuxuryBadge(
                        text: user.role,
                        color: roleColor,
                        tier: LuxuryTier.gold,
                      ),
                      if (user.orgRole != null) ...[
                        const SizedBox(width: 8),
                        LuxuryBadge(
                          text: user.orgRole!,
                          color: LuxuryColors.rolexGreen,
                          outlined: true,
                          tier: LuxuryTier.gold,
                        ),
                      ],
                      if (user.organizationName != null) ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            user.organizationName!,
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: LuxuryColors.champagneGold.withValues(alpha: 0.6),
            ),
          ],
        ),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}
