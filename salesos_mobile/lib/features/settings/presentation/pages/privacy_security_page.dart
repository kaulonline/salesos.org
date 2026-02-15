import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/app_content_service.dart';
import '../../../../shared/widgets/legal_text_viewer.dart';

/// Privacy & Security page
/// Fetches content from API and displays in simple scrolling view
class PrivacySecurityPage extends ConsumerWidget {
  const PrivacySecurityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contentAsync = ref.watch(privacyPolicyProvider);

    return contentAsync.when(
      data: (content) => LegalTextViewer(
        title: content.title,
        content: content.content,
        version: content.version,
        lastUpdated: content.lastUpdated,
      ),
      loading: () => const LegalTextLoading(title: 'Privacy Policy'),
      error: (error, _) => LegalTextError(
        title: 'Privacy Policy',
        error: error.toString(),
        onRetry: () => ref.invalidate(privacyPolicyProvider),
      ),
    );
  }
}
