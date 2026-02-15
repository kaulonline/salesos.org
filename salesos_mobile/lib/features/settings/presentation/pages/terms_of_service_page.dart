import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/app_content_service.dart';
import '../../../../shared/widgets/legal_text_viewer.dart';

/// Terms of Service page
/// Fetches content from API and displays in simple scrolling view
class TermsOfServicePage extends ConsumerWidget {
  const TermsOfServicePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contentAsync = ref.watch(termsOfServiceProvider);

    return contentAsync.when(
      data: (content) => LegalTextViewer(
        title: content.title,
        content: content.content,
        version: content.version,
        lastUpdated: content.lastUpdated,
      ),
      loading: () => const LegalTextLoading(title: 'Terms of Service'),
      error: (error, _) => LegalTextError(
        title: 'Terms of Service',
        error: error.toString(),
        onRetry: () => ref.invalidate(termsOfServiceProvider),
      ),
    );
  }
}
