import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';

/// Data model for DPA content
class DPAContent {
  final String version;
  final DateTime lastUpdated;
  final List<DPASection> sections;

  const DPAContent({
    required this.version,
    required this.lastUpdated,
    required this.sections,
  });
}

/// DPA section with title and content
class DPASection {
  final String id;
  final String title;
  final String content;
  final List<DPASection>? subsections;

  const DPASection({
    required this.id,
    required this.title,
    required this.content,
    this.subsections,
  });
}

/// Provider for DPA content - fetches from service or uses fallback
final dpaContentProvider = FutureProvider<DPAContent>((ref) async {
  // In production, this should fetch from AppContentService API
  // For now, use static content (legal text that doesn't change frequently)
  if (!kDebugMode) {
    // Production: fetch from API when available
    // Fallback to static content for legal compliance
  }
  await Future.delayed(const Duration(milliseconds: 800));

  // Static DPA content - legal text that requires manual updates
  return DPAContent(
    version: '2.1.0',
    lastUpdated: DateTime(2024, 12, 15),
    sections: [
      const DPASection(
        id: 'definitions',
        title: '1. Definitions',
        content: '''
**"Data Controller"** means the entity which determines the purposes and means of the Processing of Personal Data.

**"Data Processor"** means the entity which Processes Personal Data on behalf of the Data Controller.

**"Data Subject"** means an identified or identifiable natural person whose Personal Data is Processed.

**"Personal Data"** means any information relating to an identified or identifiable natural person.

**"Processing"** means any operation or set of operations which is performed on Personal Data or on sets of Personal Data.

**"Sub-processor"** means any Processor engaged by the Processor to carry out specific Processing activities on behalf of the Controller.

**"Supervisory Authority"** means an independent public authority established by a Member State pursuant to Article 51 of the GDPR.
''',
      ),
      const DPASection(
        id: 'scope',
        title: '2. Scope and Purpose',
        content: '''
This Data Processing Agreement ("DPA") forms part of the Agreement between SalesOS ("Processor") and the Customer ("Controller") and sets out the terms that apply when Personal Data is Processed by the Processor on behalf of the Controller.

### 2.1 Purpose of Processing

The Processor will Process Personal Data solely for the following purposes:
- Providing AI-powered CRM services
- Analyzing customer interactions and sales data
- Generating insights and recommendations
- Maintaining service quality and security

### 2.2 Types of Personal Data

The categories of Personal Data Processed under this Agreement include:
- Contact information (name, email, phone number)
- Professional information (company, job title)
- Communication records and interaction history
- Sales and transaction data
- Usage analytics and behavioral data
''',
      ),
      const DPASection(
        id: 'obligations',
        title: '3. Processor Obligations',
        content: '''
The Processor agrees to:

### 3.1 Confidentiality
- Process Personal Data only on documented instructions from the Controller
- Ensure that persons authorized to Process Personal Data have committed to confidentiality

### 3.2 Security Measures
- Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including:
  - Encryption of Personal Data
  - Regular security assessments
  - Access controls and authentication
  - Incident response procedures

### 3.3 Sub-processing
- Not engage another Processor without prior written authorization
- Impose the same data protection obligations on Sub-processors
- Remain fully liable for the performance of Sub-processors

### 3.4 Assistance
- Assist the Controller in responding to Data Subject requests
- Assist with data protection impact assessments
- Assist with supervisory authority consultations
''',
      ),
      const DPASection(
        id: 'rights',
        title: '4. Data Subject Rights',
        content: '''
The Processor shall assist the Controller in fulfilling its obligations to respond to Data Subject requests, including:

### 4.1 Right of Access
Data Subjects have the right to obtain confirmation as to whether Personal Data concerning them is being Processed and access to that data.

### 4.2 Right to Rectification
Data Subjects have the right to obtain rectification of inaccurate Personal Data and completion of incomplete data.

### 4.3 Right to Erasure
Data Subjects have the right to obtain erasure of Personal Data in certain circumstances ("right to be forgotten").

### 4.4 Right to Restriction
Data Subjects have the right to obtain restriction of Processing in certain circumstances.

### 4.5 Right to Data Portability
Data Subjects have the right to receive their Personal Data in a structured, commonly used, machine-readable format.

### 4.6 Right to Object
Data Subjects have the right to object to Processing based on legitimate interests or for direct marketing purposes.
''',
      ),
      const DPASection(
        id: 'security',
        title: '5. Security Measures',
        content: '''
The Processor implements the following technical and organizational security measures:

### 5.1 Technical Measures
- **Encryption**: All Personal Data is encrypted at rest (AES-256) and in transit (TLS 1.3)
- **Access Control**: Role-based access control with multi-factor authentication
- **Network Security**: Firewalls, intrusion detection, and DDoS protection
- **Monitoring**: 24/7 security monitoring and automated threat detection
- **Backup**: Regular encrypted backups with geographic redundancy

### 5.2 Organizational Measures
- Security awareness training for all personnel
- Background checks for employees with access to Personal Data
- Documented security policies and procedures
- Regular security audits and penetration testing
- Incident response and business continuity plans

### 5.3 Certifications
- SOC 2 Type II certified
- ISO 27001 certified
- GDPR compliant
''',
      ),
      const DPASection(
        id: 'breach',
        title: '6. Data Breach Notification',
        content: '''
### 6.1 Notification to Controller
The Processor shall notify the Controller without undue delay after becoming aware of a Personal Data breach, and in any event within **72 hours**.

### 6.2 Breach Information
The notification shall include:
- Description of the nature of the breach
- Categories and approximate number of Data Subjects affected
- Categories and approximate number of Personal Data records affected
- Name and contact details of the data protection officer
- Description of likely consequences
- Description of measures taken or proposed to address the breach

### 6.3 Documentation
The Processor shall document all Personal Data breaches, including:
- Facts relating to the breach
- Effects of the breach
- Remedial actions taken
''',
      ),
      const DPASection(
        id: 'subprocessors',
        title: '7. Sub-processors',
        content: '''
### 7.1 Authorized Sub-processors
The Controller authorizes the use of the following Sub-processors:

| Sub-processor | Purpose | Location |
|--------------|---------|----------|
| Microsoft Azure | Cloud Infrastructure | United States, EU |
| Anthropic | AI Processing | United States |
| Salesforce | CRM Integration | United States, EU |
| SendGrid | Email Services | United States |

### 7.2 Sub-processor Changes
The Processor shall provide the Controller with prior notice of any intended changes to Sub-processors, allowing the Controller to object to such changes.

### 7.3 Sub-processor Obligations
Each Sub-processor agreement shall impose data protection obligations equivalent to those in this DPA.
''',
      ),
      const DPASection(
        id: 'transfers',
        title: '8. International Data Transfers',
        content: '''
### 8.1 Transfer Mechanisms
Personal Data may be transferred to countries outside the EEA only where appropriate safeguards are in place:

- **Standard Contractual Clauses (SCCs)**: EU-approved model clauses
- **Binding Corporate Rules**: For intra-group transfers
- **Adequacy Decisions**: Transfers to countries with adequate protection
- **EU-US Data Privacy Framework**: For eligible US recipients

### 8.2 Transfer Impact Assessments
The Processor shall conduct transfer impact assessments where required and implement supplementary measures as necessary.

### 8.3 Transparency
The Processor shall maintain records of all international transfers and make these available to the Controller upon request.
''',
      ),
      const DPASection(
        id: 'audit',
        title: '9. Audit Rights',
        content: '''
### 9.1 Audit Access
The Processor shall make available to the Controller all information necessary to demonstrate compliance with this DPA and allow for audits and inspections.

### 9.2 Audit Procedures
- Audits shall be conducted with reasonable prior notice (minimum 30 days)
- Audits shall be conducted during normal business hours
- Audit costs shall be borne by the Controller
- The Processor may require execution of a confidentiality agreement

### 9.3 Third-Party Audits
The Controller may accept third-party audit reports (e.g., SOC 2, ISO 27001) in lieu of direct audits.
''',
      ),
      const DPASection(
        id: 'termination',
        title: '10. Term and Termination',
        content: '''
### 10.1 Duration
This DPA shall remain in effect for the duration of the Agreement and for so long as the Processor continues to Process Personal Data on behalf of the Controller.

### 10.2 Return or Deletion
Upon termination, the Processor shall, at the Controller's election:
- Return all Personal Data to the Controller in a commonly used format
- Delete all Personal Data and certify such deletion

### 10.3 Retention Period
Unless legally required to retain Personal Data, the Processor shall delete all Personal Data within **90 days** of termination.

### 10.4 Surviving Obligations
Obligations relating to confidentiality and data protection shall survive termination of this DPA.
''',
      ),
      const DPASection(
        id: 'liability',
        title: '11. Liability and Indemnification',
        content: '''
### 11.1 Liability
Each party shall be liable for damages caused by Processing that infringes applicable data protection laws.

### 11.2 Indemnification
The Processor shall indemnify the Controller against:
- Fines imposed by Supervisory Authorities
- Compensation claims from Data Subjects
- Costs arising from data breaches caused by the Processor

### 11.3 Limitation
The total liability under this DPA shall be subject to the limitations set forth in the Agreement.
''',
      ),
      const DPASection(
        id: 'contact',
        title: '12. Contact Information',
        content: '''
### Data Protection Officer

**SalesOS**
- Email: dpo@salesos.org
- Address: 123 Innovation Drive, San Francisco, CA 94102, USA

### EU Representative

**SalesOS EU Ltd.**
- Email: eu-representative@salesos.org
- Address: 45 Data Protection Lane, Dublin, Ireland

### Supervisory Authority

For complaints or inquiries, Data Subjects may contact the relevant Supervisory Authority in their jurisdiction.
''',
      ),
    ],
  );
});

class DataProcessingAgreementPage extends ConsumerStatefulWidget {
  const DataProcessingAgreementPage({super.key});

  @override
  ConsumerState<DataProcessingAgreementPage> createState() =>
      _DataProcessingAgreementPageState();
}

class _DataProcessingAgreementPageState
    extends ConsumerState<DataProcessingAgreementPage> {
  final ScrollController _scrollController = ScrollController();
  final Map<String, GlobalKey> _sectionKeys = {};
  String? _activeSectionId;
  bool _showTableOfContents = true;

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
    // Update active section based on scroll position
    for (final entry in _sectionKeys.entries) {
      final context = entry.value.currentContext;
      if (context != null) {
        final box = context.findRenderObject() as RenderBox?;
        if (box != null) {
          final position = box.localToGlobal(Offset.zero);
          if (position.dy >= 0 && position.dy < 200) {
            if (_activeSectionId != entry.key) {
              setState(() => _activeSectionId = entry.key);
            }
            break;
          }
        }
      }
    }
  }

  void _scrollToSection(String sectionId) {
    HapticFeedback.selectionClick();
    final key = _sectionKeys[sectionId];
    if (key?.currentContext != null) {
      Scrollable.ensureVisible(
        key!.currentContext!,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
        alignment: 0.1,
      );
    }
  }

  /// Generate PDF from DPA content
  Future<pw.Document> _generatePdf(DPAContent dpaContent) async {
    final pdf = pw.Document();
    final dateFormat = DateFormat('MMMM d, yyyy');

    // Add cover page
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.SizedBox(height: 100),
            pw.Center(
              child: pw.Text(
                'DATA PROCESSING AGREEMENT',
                style: pw.TextStyle(
                  fontSize: 28,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColor.fromHex('1A1A1A'), // SalesOS dark
                ),
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Center(
              child: pw.Text(
                'SalesOS',
                style: pw.TextStyle(
                  fontSize: 18,
                  color: PdfColors.grey700,
                ),
              ),
            ),
            pw.SizedBox(height: 40),
            pw.Divider(color: PdfColor.fromHex('1A1A1A')),
            pw.SizedBox(height: 40),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Version:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text(dpaContent.version),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Last Updated:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text(dateFormat.format(dpaContent.lastUpdated)),
                  ],
                ),
              ],
            ),
            pw.Spacer(),
            pw.Center(
              child: pw.Text(
                'This document is confidential and intended for the authorized recipient only.',
                style: pw.TextStyle(
                  fontSize: 10,
                  color: PdfColors.grey600,
                  fontStyle: pw.FontStyle.italic,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    // Add content pages
    for (final section in dpaContent.sections) {
      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(40),
          header: (context) => pw.Container(
            margin: const pw.EdgeInsets.only(bottom: 20),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'SalesOS - Data Processing Agreement',
                  style: pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey600,
                  ),
                ),
                pw.Text(
                  'Version ${dpaContent.version}',
                  style: pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey600,
                  ),
                ),
              ],
            ),
          ),
          footer: (context) => pw.Container(
            margin: const pw.EdgeInsets.only(top: 20),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'Confidential',
                  style: pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey500,
                  ),
                ),
                pw.Text(
                  'Page ${context.pageNumber} of ${context.pagesCount}',
                  style: pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey500,
                  ),
                ),
              ],
            ),
          ),
          build: (context) => [
            // Section title
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                color: PdfColor.fromHex('1A1A1A').shade(0.1),
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Text(
                section.title,
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColor.fromHex('1A1A1A'),
                ),
              ),
            ),
            pw.SizedBox(height: 16),
            // Section content - parse markdown-like content
            ..._parseContentToPdfWidgets(section.content),
          ],
        ),
      );
    }

    return pdf;
  }

  /// Parse content string to PDF widgets (simple markdown-like parsing)
  List<pw.Widget> _parseContentToPdfWidgets(String content) {
    final widgets = <pw.Widget>[];
    final lines = content.split('\n');

    for (final line in lines) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) {
        widgets.add(pw.SizedBox(height: 8));
        continue;
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        widgets.add(pw.SizedBox(height: 12));
        widgets.add(pw.Text(
          trimmed.substring(4),
          style: pw.TextStyle(
            fontSize: 13,
            fontWeight: pw.FontWeight.bold,
            color: PdfColors.grey800,
          ),
        ));
        widgets.add(pw.SizedBox(height: 8));
      } else if (trimmed.startsWith('## ')) {
        widgets.add(pw.SizedBox(height: 16));
        widgets.add(pw.Text(
          trimmed.substring(3),
          style: pw.TextStyle(
            fontSize: 14,
            fontWeight: pw.FontWeight.bold,
            color: PdfColors.grey900,
          ),
        ));
        widgets.add(pw.SizedBox(height: 10));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Bullet points
        widgets.add(pw.Padding(
          padding: const pw.EdgeInsets.only(left: 16, bottom: 4),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('• ', style: pw.TextStyle(color: PdfColor.fromHex('1A1A1A'))),
              pw.Expanded(
                child: pw.Text(
                  _cleanMarkdown(trimmed.substring(2)),
                  style: pw.TextStyle(fontSize: 11, color: PdfColors.grey700, lineSpacing: 1.5),
                ),
              ),
            ],
          ),
        ));
      } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Skip table rows for now - they're complex to render
        continue;
      } else {
        // Regular paragraph
        widgets.add(pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 8),
          child: pw.Text(
            _cleanMarkdown(trimmed),
            style: pw.TextStyle(fontSize: 11, color: PdfColors.grey700, lineSpacing: 1.5),
          ),
        ));
      }
    }
    return widgets;
  }

  /// Remove markdown formatting from text
  String _cleanMarkdown(String text) {
    return text
        .replaceAll(RegExp(r'\*\*([^*]+)\*\*'), r'$1') // Bold
        .replaceAll(RegExp(r'\*([^*]+)\*'), r'$1') // Italic
        .replaceAll(RegExp(r'`([^`]+)`'), r'$1'); // Code
  }

  /// Download PDF
  Future<void> _downloadPdf(DPAContent dpaContent) async {
    try {
      HapticFeedback.lightImpact();

      // Show loading indicator
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 12),
              Text('Generating PDF...'),
            ],
          ),
          duration: Duration(seconds: 30),
          backgroundColor: IrisTheme.info,
        ),
      );

      final pdf = await _generatePdf(dpaContent);
      final bytes = await pdf.save();

      // Get temp directory
      final tempDir = await getTemporaryDirectory();
      final fileName = 'SalesOS_DPA_v${dpaContent.version.replaceAll('.', '_')}.pdf';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(bytes);

      // Clear the loading snackbar
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
      }

      // Share the file
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          subject: 'SalesOS - Data Processing Agreement',
          text: 'Data Processing Agreement v${dpaContent.version}',
        ),
      );

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate PDF: ${e.toString()}'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  /// Print DPA (generates PDF and opens share sheet for printing)
  Future<void> _printDpa(DPAContent dpaContent) async {
    try {
      HapticFeedback.lightImpact();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 12),
              Text('Preparing document for print...'),
            ],
          ),
          duration: Duration(seconds: 30),
          backgroundColor: IrisTheme.info,
        ),
      );

      final pdf = await _generatePdf(dpaContent);
      final bytes = await pdf.save();

      final tempDir = await getTemporaryDirectory();
      final fileName = 'SalesOS_DPA_Print_${DateTime.now().millisecondsSinceEpoch}.pdf';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(bytes);

      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
      }

      // On iOS/Android, sharing a PDF will show print option in the share sheet
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/pdf')],
          subject: 'Print: SalesOS Data Processing Agreement',
        ),
      );

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to prepare document: ${e.toString()}'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dpaAsync = ref.watch(dpaContentProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isTablet = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              color:
                  isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Data Processing Agreement',
          style: IrisTheme.titleLarge.copyWith(
              color:
                  isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _showTableOfContents ? Iconsax.menu_15 : Iconsax.menu_1,
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
            onPressed: () {
              HapticFeedback.selectionClick();
              setState(() => _showTableOfContents = !_showTableOfContents);
            },
            tooltip: 'Toggle Table of Contents',
          ),
        ],
      ),
      body: dpaAsync.when(
        data: (dpaContent) => _buildContent(dpaContent, isDark, isTablet),
        loading: () => _buildLoadingState(isDark),
        error: (error, _) => _buildErrorState(error, isDark),
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor:
                const AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
          ),
          const SizedBox(height: 20),
          Text(
            'Loading Data Processing Agreement...',
            style: IrisTheme.bodyMedium.copyWith(
              color:
                  isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildErrorState(Object error, bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: IrisTheme.error.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Iconsax.warning_2,
                size: 40,
                color: IrisTheme.error,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Failed to Load DPA',
              style: IrisTheme.titleMedium.copyWith(
                color:
                    isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Unable to load the Data Processing Agreement. Please check your connection and try again.',
              textAlign: TextAlign.center,
              style: IrisTheme.bodySmall.copyWith(
                color:
                    isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 24),
            TextButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                ref.invalidate(dpaContentProvider);
              },
              icon: const Icon(Iconsax.refresh, size: 18),
              label: const Text('Retry'),
              style: TextButton.styleFrom(
                foregroundColor: LuxuryColors.jadePremium,
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn();
  }

  Widget _buildContent(DPAContent dpaContent, bool isDark, bool isTablet) {
    // Initialize section keys
    for (final section in dpaContent.sections) {
      _sectionKeys[section.id] = GlobalKey();
    }

    if (isTablet && _showTableOfContents) {
      // Side-by-side layout for tablets
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Table of Contents sidebar
          SizedBox(
            width: 280,
            child: _buildTableOfContents(dpaContent, isDark),
          ),
          // Divider
          Container(
            width: 1,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
          // Main content
          Expanded(
            child: _buildMainContent(dpaContent, isDark),
          ),
        ],
      );
    } else {
      // Stack layout for phones or when TOC is hidden
      return Column(
        children: [
          if (_showTableOfContents && !isTablet)
            _buildCollapsibleTOC(dpaContent, isDark),
          Expanded(
            child: _buildMainContent(dpaContent, isDark),
          ),
        ],
      );
    }
  }

  Widget _buildTableOfContents(DPAContent dpaContent, bool isDark) {
    return Container(
      color: isDark ? LuxuryColors.obsidian : Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TABLE OF CONTENTS',
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.rolexGreen,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Navigate to sections',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ),
          Divider(
            height: 1,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: dpaContent.sections.length,
              itemBuilder: (context, index) {
                final section = dpaContent.sections[index];
                final isActive = _activeSectionId == section.id;

                return _TOCItem(
                  title: section.title,
                  isActive: isActive,
                  onTap: () => _scrollToSection(section.id),
                  isDark: isDark,
                ).animate(delay: (50 * index).ms).fadeIn().slideX(begin: -0.1);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCollapsibleTOC(DPAContent dpaContent, bool isDark) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 200),
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: IrisCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Icon(
                    Iconsax.menu_board,
                    size: 16,
                    color: LuxuryColors.rolexGreen,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Quick Navigation',
                    style: IrisTheme.labelMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Divider(
              height: 1,
              color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 4),
                itemCount: dpaContent.sections.length,
                itemBuilder: (context, index) {
                  final section = dpaContent.sections[index];
                  return InkWell(
                    onTap: () => _scrollToSection(section.id),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      child: Text(
                        section.title,
                        style: IrisTheme.bodySmall.copyWith(
                          color: _activeSectionId == section.id
                              ? LuxuryColors.jadePremium
                              : (isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary),
                          fontWeight: _activeSectionId == section.id
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn().slideY(begin: -0.1);
  }

  Widget _buildMainContent(DPAContent dpaContent, bool isDark) {
    final dateFormat = DateFormat('MMMM d, yyyy');

    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Version and Date Card
          _buildVersionCard(dpaContent, dateFormat, isDark),
          const SizedBox(height: 24),

          // Sections
          ...dpaContent.sections.asMap().entries.map((entry) {
            final index = entry.key;
            final section = entry.value;
            return Padding(
              key: _sectionKeys[section.id],
              padding: const EdgeInsets.only(bottom: 24),
              child: _buildSection(section, isDark)
                  .animate(delay: (100 + index * 50).ms)
                  .fadeIn()
                  .slideY(begin: 0.05),
            );
          }),

          // Footer
          _buildFooter(isDark),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildVersionCard(
      DPAContent dpaContent, DateFormat dateFormat, bool isDark) {
    return IrisCard(
      variant: IrisCardVariant.premium,
      tier: LuxuryTier.gold,
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Iconsax.shield_tick,
              color: LuxuryColors.jadePremium,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Data Processing Agreement',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _InfoChip(
                      label: 'Version ${dpaContent.version}',
                      isDark: isDark,
                    ),
                    const SizedBox(width: 8),
                    _InfoChip(
                      label: dateFormat.format(dpaContent.lastUpdated),
                      icon: Iconsax.calendar,
                      isDark: isDark,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildSection(DPASection section, bool isDark) {
    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: isDark ? 0.1 : 0.05),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
            ),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 24,
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    section.title,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Section Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: MarkdownBody(
              data: section.content,
              styleSheet: _buildMarkdownStyleSheet(isDark),
              selectable: true,
            ),
          ),
        ],
      ),
    );
  }

  MarkdownStyleSheet _buildMarkdownStyleSheet(bool isDark) {
    final textColor =
        isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary;
    final secondaryColor =
        isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary;
    final accentColor = LuxuryColors.rolexGreen;

    return MarkdownStyleSheet(
      // Paragraphs
      p: IrisTheme.bodyMedium.copyWith(
        color: secondaryColor,
        height: 1.6,
      ),
      // Headers
      h1: IrisTheme.titleLarge.copyWith(color: textColor),
      h2: IrisTheme.titleMedium.copyWith(color: textColor),
      h3: IrisTheme.titleSmall.copyWith(
        color: textColor,
        fontWeight: FontWeight.w600,
      ),
      // Strong/Bold
      strong: IrisTheme.bodyMedium.copyWith(
        color: textColor,
        fontWeight: FontWeight.w600,
      ),
      // Emphasis/Italic
      em: IrisTheme.bodyMedium.copyWith(
        color: secondaryColor,
        fontStyle: FontStyle.italic,
      ),
      // Links
      a: IrisTheme.bodyMedium.copyWith(
        color: accentColor,
        decoration: TextDecoration.underline,
      ),
      // Lists
      listBullet: IrisTheme.bodyMedium.copyWith(
        color: accentColor,
      ),
      listIndent: 16,
      // Blockquote
      blockquote: IrisTheme.bodyMedium.copyWith(
        color: secondaryColor,
        fontStyle: FontStyle.italic,
      ),
      blockquoteDecoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: accentColor.withValues(alpha: 0.5),
            width: 3,
          ),
        ),
      ),
      blockquotePadding: const EdgeInsets.only(left: 16),
      // Code
      code: IrisTheme.bodySmall.copyWith(
        fontFamily: 'monospace',
        color: accentColor,
        backgroundColor: accentColor.withValues(alpha: 0.1),
      ),
      codeblockDecoration: BoxDecoration(
        color: isDark
            ? Colors.black.withValues(alpha: 0.3)
            : Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      codeblockPadding: const EdgeInsets.all(12),
      // Tables
      tableHead: IrisTheme.labelMedium.copyWith(
        color: textColor,
        fontWeight: FontWeight.w600,
      ),
      tableBody: IrisTheme.bodySmall.copyWith(
        color: secondaryColor,
      ),
      tableBorder: TableBorder.all(
        color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        width: 1,
      ),
      tableHeadAlign: TextAlign.left,
      tableCellsPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      // Horizontal Rule
      horizontalRuleDecoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            width: 1,
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(bool isDark) {
    return IrisCard(
      variant: IrisCardVariant.bordered,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.info_circle,
                size: 18,
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
              const SizedBox(width: 8),
              Text(
                'Legal Notice',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'This Data Processing Agreement is a legally binding document. By using SalesOS services, you acknowledge that you have read, understood, and agree to be bound by the terms of this DPA.',
            style: IrisTheme.bodySmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Consumer(
                  builder: (context, ref, _) {
                    final dpaAsync = ref.watch(dpaContentProvider);
                    return OutlinedButton.icon(
                      onPressed: dpaAsync.when(
                        data: (dpaContent) => () => _downloadPdf(dpaContent),
                        loading: () => null,
                        error: (e, s) => null,
                      ),
                      icon: const Icon(Iconsax.document_download, size: 18),
                      label: const Text('Download PDF'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: LuxuryColors.rolexGreen,
                        side: BorderSide(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
                        ),
                        padding:
                            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Consumer(
                  builder: (context, ref, _) {
                    final dpaAsync = ref.watch(dpaContentProvider);
                    return OutlinedButton.icon(
                      onPressed: dpaAsync.when(
                        data: (dpaContent) => () => _printDpa(dpaContent),
                        loading: () => null,
                        error: (e, s) => null,
                      ),
                      icon: const Icon(Iconsax.printer, size: 18),
                      label: const Text('Print'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                        side: BorderSide(
                          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                        ),
                        padding:
                            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.05);
  }
}

class _TOCItem extends StatelessWidget {
  final String title;
  final bool isActive;
  final VoidCallback onTap;
  final bool isDark;

  const _TOCItem({
    required this.title,
    required this.isActive,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isActive
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
              : Colors.transparent,
          border: Border(
            left: BorderSide(
              color: isActive ? LuxuryColors.rolexGreen : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Text(
          title,
          style: IrisTheme.bodySmall.copyWith(
            color: isActive
                ? LuxuryColors.jadePremium
                : (isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary),
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isDark;

  const _InfoChip({
    required this.label,
    this.icon,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.black.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 12,
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
