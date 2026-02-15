import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/messages_service.dart';

/// Message bubble widget for chat display
/// Left-aligned for received messages, right-aligned for sent messages
class MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool isSent;
  final bool showSenderName;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isSent,
    this.showSenderName = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: EdgeInsets.only(
        left: isSent ? 60 : 0,
        right: isSent ? 0 : 60,
        bottom: 8,
      ),
      child: Align(
        alignment: isSent ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment:
              isSent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            // Sender name (for received messages)
            if (!isSent && showSenderName) ...[
              Padding(
                padding: const EdgeInsets.only(left: 12, bottom: 4),
                child: Text(
                  message.senderName,
                  style: IrisTheme.caption.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
            // Message bubble
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isSent
                    ? (isDark
                        ? LuxuryColors.rolexGreen
                        : LuxuryColors.rolexGreen)
                    : (isDark
                        ? IrisTheme.darkSurfaceElevated
                        : IrisTheme.lightSurfaceElevated),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isSent ? 16 : 4),
                  bottomRight: Radius.circular(isSent ? 4 : 16),
                ),
                border: isSent
                    ? null
                    : Border.all(
                        color: isDark
                            ? LuxuryColors.champagneGold.withValues(alpha: 0.1)
                            : LuxuryColors.champagneGold.withValues(alpha: 0.08),
                        width: 1,
                      ),
              ),
              child: Text(
                message.content,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isSent
                      ? Colors.white
                      : (isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary),
                  height: 1.4,
                ),
              ),
            ),
            // Timestamp
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 12, right: 12),
              child: Text(
                _formatTimestamp(message.timestamp),
                style: IrisTheme.caption.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inDays == 0) {
      return DateFormat('HH:mm').format(dt);
    } else if (diff.inDays == 1) {
      return 'Yesterday ${DateFormat('HH:mm').format(dt)}';
    } else if (diff.inDays < 7) {
      return DateFormat('E HH:mm').format(dt);
    } else {
      return DateFormat('MMM d, HH:mm').format(dt);
    }
  }
}
