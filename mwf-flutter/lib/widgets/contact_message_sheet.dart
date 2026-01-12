import 'package:flutter/material.dart';
import 'package:meetwithfriends/core/theme/theme.dart';

class ContactMessageSheet extends StatefulWidget {
  const ContactMessageSheet({
    required this.recipientType,
    required this.recipientName,
    required this.onSend,
    super.key,
  });

  final String recipientType; // 'Host' or 'Organiser'
  final String recipientName;
  final Future<bool> Function(String message) onSend;

  static Future<void> show({
    required BuildContext context,
    required String recipientType,
    required String recipientName,
    required Future<bool> Function(String message) onSend,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.lg),
        ),
      ),
      builder: (context) => ContactMessageSheet(
        recipientType: recipientType,
        recipientName: recipientName,
        onSend: onSend,
      ),
    );
  }

  @override
  State<ContactMessageSheet> createState() => _ContactMessageSheetState();
}

class _ContactMessageSheetState extends State<ContactMessageSheet> {
  final _messageController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = _messageController.text.trim();

    // Validate message length
    if (message.length < 10) {
      setState(() {
        _errorText = 'Message must be at least 10 characters';
      });
      return;
    }

    if (message.length > 1000) {
      setState(() {
        _errorText = 'Message cannot exceed 1000 characters';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    final success = await widget.onSend(message);

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    if (success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Message sent to ${widget.recipientType.toLowerCase()}',
          ),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: AppSpacing.lg + bottomPadding,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Header
          Text(
            'Contact ${widget.recipientType}',
            style: AppTypography.h3,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Send a message to ${widget.recipientName}',
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Message input
          TextField(
            controller: _messageController,
            maxLines: 5,
            minLines: 3,
            maxLength: 1000,
            decoration: InputDecoration(
              hintText: 'Write your message...',
              errorText: _errorText,
            ),
            textCapitalization: TextCapitalization.sentences,
            onChanged: (value) {
              if (_errorText != null) {
                setState(() => _errorText = null);
              }
            },
          ),
          const SizedBox(height: AppSpacing.md),

          // Info text
          Row(
            children: [
              const Icon(
                Icons.info_outline,
                size: 16,
                color: AppColors.textTertiary,
              ),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  'Your email will be included so they can reply',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isSubmitting
                      ? null
                      : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Send Message'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
