import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../services/events_service.dart';
import '../services/groups_service.dart';

/// Displays and manages magic invite links for events and groups.
/// Shows link status, allows copying, regenerating, and disabling/enabling.
class InviteLinkSection extends StatefulWidget {
  final String type; // 'event' or 'group'
  final int id;

  const InviteLinkSection({
    super.key,
    required this.type,
    required this.id,
  });

  @override
  State<InviteLinkSection> createState() => _InviteLinkSectionState();
}

class _InviteLinkSectionState extends State<InviteLinkSection> {
  final EventsService _eventsService = EventsService();
  final GroupsService _groupsService = GroupsService();

  MagicLink? _magicLink;
  bool _loading = true;
  bool _actionLoading = false;
  String? _error;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _loadMagicLink();
  }

  Future<void> _loadMagicLink() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final result = widget.type == 'event'
        ? await _eventsService.getOrCreateMagicLink(widget.id)
        : await _groupsService.getOrCreateMagicLink(widget.id);

    if (mounted) {
      setState(() {
        _loading = false;
        if (result.success && result.magicLink != null) {
          _magicLink = result.magicLink;
        } else {
          _error = result.error ?? 'Failed to load invite link';
        }
      });
    }
  }

  Future<void> _handleCopy() async {
    if (_magicLink == null) return;

    await Clipboard.setData(ClipboardData(text: _magicLink!.url));
    setState(() => _copied = true);

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _copied = false);
      }
    });
  }

  Future<void> _handleRegenerate() async {
    final confirmed = await _showConfirmDialog(
      title: 'Regenerate invite link?',
      message: 'The current link will stop working. Anyone with the old link will see "This link is no longer valid".',
      confirmText: 'Regenerate',
      isDestructive: false,
    );

    if (confirmed != true) return;

    setState(() => _actionLoading = true);

    final result = widget.type == 'event'
        ? await _eventsService.regenerateMagicLink(widget.id)
        : await _groupsService.regenerateMagicLink(widget.id);

    if (mounted) {
      setState(() {
        _actionLoading = false;
        if (result.success && result.magicLink != null) {
          _magicLink = result.magicLink;
        } else {
          _error = result.error;
        }
      });
    }
  }

  Future<void> _handleDisable() async {
    final confirmed = await _showConfirmDialog(
      title: 'Disable invite link?',
      message: 'Anyone who clicks this link will see "This link is no longer active". You can re-enable it later.',
      confirmText: 'Disable',
      isDestructive: true,
    );

    if (confirmed != true) return;

    setState(() => _actionLoading = true);

    final result = widget.type == 'event'
        ? await _eventsService.disableMagicLink(widget.id)
        : await _groupsService.disableMagicLink(widget.id);

    if (mounted) {
      setState(() {
        _actionLoading = false;
        if (result.success && _magicLink != null) {
          _magicLink = MagicLink(
            token: _magicLink!.token,
            url: _magicLink!.url,
            expiresAt: _magicLink!.expiresAt,
            isActive: false,
            useCount: _magicLink!.useCount,
            maxUses: _magicLink!.maxUses,
          );
        } else {
          _error = result.error;
        }
      });
    }
  }

  Future<void> _handleEnable() async {
    setState(() => _actionLoading = true);

    final result = widget.type == 'event'
        ? await _eventsService.enableMagicLink(widget.id)
        : await _groupsService.enableMagicLink(widget.id);

    if (mounted) {
      setState(() {
        _actionLoading = false;
        if (result.success && _magicLink != null) {
          _magicLink = MagicLink(
            token: _magicLink!.token,
            url: _magicLink!.url,
            expiresAt: result.expiresAt ?? _magicLink!.expiresAt,
            isActive: true,
            useCount: _magicLink!.useCount,
            maxUses: _magicLink!.maxUses,
          );
        } else {
          _error = result.error;
        }
      });
    }
  }

  Future<bool?> _showConfirmDialog({
    required String title,
    required String message,
    required String confirmText,
    required bool isDestructive,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        content: Text(message, style: const TextStyle(color: Color(0xFF64748B))),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              confirmText,
              style: TextStyle(
                color: isDestructive ? Colors.red : const Color(0xFF7C3AED),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatExpiry(DateTime date) {
    return DateFormat('d MMM yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          const Text(
            'Invite People',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 16),

          // Content
          if (_loading)
            _buildLoadingState()
          else if (_error != null && _magicLink == null)
            _buildErrorState()
          else if (_magicLink != null)
            _buildLinkContent(),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Row(
      children: [
        SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation(Colors.grey.shade400),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          'Loading invite link...',
          style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildErrorState() {
    return Text(
      _error!,
      style: const TextStyle(color: Colors.red, fontSize: 14),
    );
  }

  Widget _buildLinkContent() {
    final link = _magicLink!;
    final isExpired = link.isExpired;

    if (link.isActive && !isExpired) {
      return _buildActiveLinkState(link);
    } else if (!link.isActive) {
      return _buildDisabledLinkState();
    } else if (isExpired) {
      return _buildExpiredLinkState();
    }

    return const SizedBox.shrink();
  }

  Widget _buildActiveLinkState(MagicLink link) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Share this link to invite people:',
          style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
        ),
        const SizedBox(height: 12),

        // Link box
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Text(
            link.url,
            style: const TextStyle(
              fontSize: 13,
              fontFamily: 'monospace',
              color: Color(0xFF475569),
            ),
          ),
        ),

        const SizedBox(height: 8),

        // Expiry info
        Text(
          'Expires: ${_formatExpiry(link.expiresAt)}',
          style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
        ),

        const SizedBox(height: 16),

        // Action buttons
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildActionButton(
              onPressed: _actionLoading ? null : _handleCopy,
              icon: _copied ? Icons.check : Icons.copy_rounded,
              label: _copied ? 'Copied' : 'Copy',
              isPrimary: true,
            ),
            _buildActionButton(
              onPressed: _actionLoading ? null : _handleRegenerate,
              icon: Icons.refresh_rounded,
              label: 'Regenerate',
              isPrimary: false,
            ),
            _buildActionButton(
              onPressed: _actionLoading ? null : _handleDisable,
              icon: Icons.block_rounded,
              label: 'Disable',
              isPrimary: false,
            ),
          ],
        ),

        // Error message
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
        ],
      ],
    );
  }

  Widget _buildDisabledLinkState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Text(
            'Invite link is disabled',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
          ),
        ),
        const SizedBox(height: 16),
        _buildActionButton(
          onPressed: _actionLoading ? null : _handleEnable,
          icon: _actionLoading ? null : Icons.check_circle_outline_rounded,
          label: _actionLoading ? 'Enabling...' : 'Enable',
          isPrimary: true,
          showLoading: _actionLoading,
        ),
      ],
    );
  }

  Widget _buildExpiredLinkState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Text(
            'Invite link has expired',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
          ),
        ),
        const SizedBox(height: 16),
        _buildActionButton(
          onPressed: _actionLoading ? null : _handleRegenerate,
          icon: _actionLoading ? null : Icons.refresh_rounded,
          label: _actionLoading ? 'Regenerating...' : 'Regenerate',
          isPrimary: true,
          showLoading: _actionLoading,
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required VoidCallback? onPressed,
    IconData? icon,
    required String label,
    required bool isPrimary,
    bool showLoading = false,
  }) {
    if (isPrimary) {
      return ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF7C3AED),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          elevation: 0,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (showLoading)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(Colors.white),
                ),
              )
            else if (icon != null)
              Icon(icon, size: 18),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
      );
    }

    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF475569),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) Icon(icon, size: 18),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
