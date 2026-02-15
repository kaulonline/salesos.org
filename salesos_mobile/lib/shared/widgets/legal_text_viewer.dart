import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'luxury_card.dart';

/// Simple scrolling legal text viewer with top fade effect
/// Similar to Google/Apple legal text screens
class LegalTextViewer extends StatefulWidget {
  final String title;
  final String content;
  final String? version;
  final DateTime? lastUpdated;
  final bool showHeader;
  final VoidCallback? onBack;

  const LegalTextViewer({
    super.key,
    required this.title,
    required this.content,
    this.version,
    this.lastUpdated,
    this.showHeader = true,
    this.onBack,
  });

  @override
  State<LegalTextViewer> createState() => _LegalTextViewerState();
}

class _LegalTextViewerState extends State<LegalTextViewer> {
  final ScrollController _scrollController = ScrollController();
  double _scrollOffset = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    setState(() {
      _scrollOffset = _scrollController.offset;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? LuxuryColors.richBlack : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black87;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Simple header
            if (widget.showHeader) _buildHeader(isDark, textColor),

            // Content with fade
            Expanded(
              child: Stack(
                children: [
                  // Scrollable content
                  _buildContent(isDark, textColor),

                  // Top fade gradient
                  _buildTopFade(bgColor),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark, Color textColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              Icons.arrow_back_ios,
              color: textColor.withValues(alpha: 0.7),
              size: 20,
            ),
            onPressed: () {
              HapticFeedback.lightImpact();
              if (widget.onBack != null) {
                widget.onBack!();
              } else {
                Navigator.of(context).pop();
              }
            },
          ),
          Expanded(
            child: Text(
              widget.title,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: textColor,
                letterSpacing: -0.3,
              ),
            ),
          ),
          if (widget.version != null)
            Text(
              'v${widget.version}',
              style: TextStyle(
                fontSize: 12,
                color: textColor.withValues(alpha: 0.5),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContent(bool isDark, Color textColor) {
    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Last updated info
          if (widget.lastUpdated != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                'Last updated: ${_formatDate(widget.lastUpdated!)}',
                style: TextStyle(
                  fontSize: 12,
                  color: textColor.withValues(alpha: 0.5),
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),

          // Markdown content
          MarkdownBody(
            data: widget.content,
            selectable: true,
            styleSheet: _buildMarkdownStyle(isDark, textColor),
            onTapLink: (text, href, title) {
              if (href != null) {
                launchUrl(Uri.parse(href));
              }
            },
          ),

          // Bottom padding
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildTopFade(Color bgColor) {
    // Only show fade when scrolled
    final fadeOpacity = (_scrollOffset / 50).clamp(0.0, 1.0);

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: IgnorePointer(
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 150),
          opacity: fadeOpacity,
          child: Container(
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  bgColor,
                  bgColor.withValues(alpha: 0.8),
                  bgColor.withValues(alpha: 0),
                ],
                stops: const [0.0, 0.5, 1.0],
              ),
            ),
          ),
        ),
      ),
    );
  }

  MarkdownStyleSheet _buildMarkdownStyle(bool isDark, Color textColor) {
    final linkColor = isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen;

    return MarkdownStyleSheet(
      // Body text
      p: TextStyle(
        fontSize: 14,
        height: 1.6,
        color: textColor.withValues(alpha: 0.85),
        letterSpacing: 0.1,
      ),

      // Headers
      h1: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: textColor,
        height: 1.4,
        letterSpacing: -0.5,
      ),
      h2: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: textColor,
        height: 1.4,
        letterSpacing: -0.3,
      ),
      h3: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: textColor,
        height: 1.4,
      ),
      h4: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: textColor,
        height: 1.4,
      ),

      // Lists
      listBullet: TextStyle(
        fontSize: 14,
        color: textColor.withValues(alpha: 0.7),
      ),

      // Links
      a: TextStyle(
        color: linkColor,
        decoration: TextDecoration.underline,
        decorationColor: linkColor.withValues(alpha: 0.5),
      ),

      // Code
      code: TextStyle(
        fontSize: 13,
        fontFamily: 'monospace',
        backgroundColor: isDark
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.black.withValues(alpha: 0.05),
        color: textColor.withValues(alpha: 0.9),
      ),

      // Blockquote
      blockquote: TextStyle(
        fontSize: 14,
        fontStyle: FontStyle.italic,
        color: textColor.withValues(alpha: 0.7),
      ),
      blockquoteDecoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: linkColor.withValues(alpha: 0.5),
            width: 3,
          ),
        ),
      ),
      blockquotePadding: const EdgeInsets.only(left: 16),

      // Table
      tableHead: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: textColor,
      ),
      tableBody: TextStyle(
        fontSize: 13,
        color: textColor.withValues(alpha: 0.85),
      ),
      tableBorder: TableBorder.all(
        color: textColor.withValues(alpha: 0.2),
        width: 0.5,
      ),

      // Horizontal rule
      horizontalRuleDecoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: textColor.withValues(alpha: 0.15),
            width: 1,
          ),
        ),
      ),

      // Spacing
      h1Padding: const EdgeInsets.only(top: 24, bottom: 12),
      h2Padding: const EdgeInsets.only(top: 20, bottom: 10),
      h3Padding: const EdgeInsets.only(top: 16, bottom: 8),
      pPadding: const EdgeInsets.only(bottom: 12),
      listIndent: 24,
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Simplified legal text page that wraps LegalTextViewer in a full page
class LegalTextPage extends StatelessWidget {
  final String title;
  final String content;
  final String? version;
  final DateTime? lastUpdated;

  const LegalTextPage({
    super.key,
    required this.title,
    required this.content,
    this.version,
    this.lastUpdated,
  });

  @override
  Widget build(BuildContext context) {
    return LegalTextViewer(
      title: title,
      content: content,
      version: version,
      lastUpdated: lastUpdated,
    );
  }
}

/// Loading state for legal text
class LegalTextLoading extends StatelessWidget {
  final String title;

  const LegalTextLoading({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? LuxuryColors.richBlack : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black87;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: textColor, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
        ),
      ),
      body: Center(
        child: CircularProgressIndicator(
          color: LuxuryColors.rolexGreen,
          strokeWidth: 2,
        ),
      ),
    );
  }
}

/// Error state for legal text
class LegalTextError extends StatelessWidget {
  final String title;
  final String error;
  final VoidCallback? onRetry;

  const LegalTextError({
    super.key,
    required this.title,
    required this.error,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? LuxuryColors.richBlack : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black87;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: textColor, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: textColor.withValues(alpha: 0.3),
              ),
              const SizedBox(height: 16),
              Text(
                'Unable to load content',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                error,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: textColor.withValues(alpha: 0.6),
                ),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 24),
                TextButton(
                  onPressed: onRetry,
                  child: Text(
                    'Try Again',
                    style: TextStyle(color: LuxuryColors.rolexGreen),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
