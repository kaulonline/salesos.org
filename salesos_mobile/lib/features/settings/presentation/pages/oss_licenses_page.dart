import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/app_content_service.dart';
import '../../../../shared/widgets/legal_text_viewer.dart';

/// Open Source Licenses page
/// Fetches content from API and displays in simple scrolling view
/// Similar to Google/Apple OSS license screens
class OssLicensesPage extends ConsumerWidget {
  const OssLicensesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contentAsync = ref.watch(ossLicensesProvider);

    return contentAsync.when(
      data: (content) => LegalTextViewer(
        title: content.title,
        content: content.content,
        version: content.version,
        lastUpdated: content.lastUpdated,
      ),
      loading: () => const LegalTextLoading(title: 'Open Source Licenses'),
      error: (error, _) => LegalTextError(
        title: 'Open Source Licenses',
        error: error.toString(),
        onRetry: () => ref.invalidate(ossLicensesProvider),
      ),
    );
  }
}
