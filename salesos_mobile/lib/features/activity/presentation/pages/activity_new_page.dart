import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../widgets/activity_form.dart';

/// Page for creating a new activity
/// Supports query parameters:
/// - type: call, meeting, email (defaults to showing type selector)
/// - contactId: ID of the related contact
/// - relatedToId: ID of the related account or opportunity
class ActivityNewPage extends ConsumerStatefulWidget {
  final String? type;
  final String? contactId;
  final String? relatedToId;

  const ActivityNewPage({
    super.key,
    this.type,
    this.contactId,
    this.relatedToId,
  });

  @override
  ConsumerState<ActivityNewPage> createState() => _ActivityNewPageState();
}

class _ActivityNewPageState extends ConsumerState<ActivityNewPage> {
  bool _formShown = false;

  @override
  void initState() {
    super.initState();
    // Show the form after the widget is built
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _showActivityForm();
    });
  }

  ActivityType? _parseActivityType(String? type) {
    if (type == null) return null;
    switch (type.toLowerCase()) {
      case 'call':
        return ActivityType.call;
      case 'meeting':
        return ActivityType.meeting;
      case 'email':
        return ActivityType.email;
      default:
        return null;
    }
  }

  Future<void> _showActivityForm() async {
    if (_formShown || !mounted) return;
    _formShown = true;

    final activityType = _parseActivityType(widget.type);

    void onSuccess() {
      if (mounted) {
        // Navigate back after successful creation
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/activity');
        }
      }
    }

    if (activityType != null) {
      // Show specific form directly
      switch (activityType) {
        case ActivityType.call:
          await ActivityForm.logCall(
            context: context,
            onSuccess: onSuccess,
            contactId: widget.contactId,
            relatedToId: widget.relatedToId,
          );
          break;
        case ActivityType.meeting:
          await ActivityForm.logMeeting(
            context: context,
            onSuccess: onSuccess,
            contactId: widget.contactId,
            relatedToId: widget.relatedToId,
          );
          break;
        case ActivityType.email:
          await ActivityForm.logEmail(
            context: context,
            onSuccess: onSuccess,
            contactId: widget.contactId,
            relatedToId: widget.relatedToId,
          );
          break;
      }
    } else {
      // Show type selector first
      await ActivityForm.show(
        context: context,
        onSuccess: onSuccess,
        contactId: widget.contactId,
        relatedToId: widget.relatedToId,
      );
    }

    // Navigate back if form was dismissed without saving
    if (mounted) {
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/activity');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Show a loading/placeholder screen while the form is being displayed
    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.rolexGreen),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Loading activity form...',
              style: TextStyle(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
