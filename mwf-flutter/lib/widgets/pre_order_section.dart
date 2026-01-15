import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'pre_order_bottom_sheet.dart';

class PreOrderSection extends StatelessWidget {
  final String? foodOrder;
  final String? dietaryNotes;
  final String? menuLink;
  final DateTime? preorderCutoff;
  final Future<bool> Function(String? foodOrder, String? dietaryNotes) onSubmit;
  final double padding;

  const PreOrderSection({
    super.key,
    this.foodOrder,
    this.dietaryNotes,
    this.menuLink,
    this.preorderCutoff,
    required this.onSubmit,
    this.padding = 20.0,
  });

  bool get _isCutoffPassed {
    if (preorderCutoff == null) return false;
    return DateTime.now().isAfter(preorderCutoff!);
  }

  bool get _hasOrder => foodOrder != null && foodOrder!.isNotEmpty;

  Future<void> _openMenu(BuildContext context) async {
    if (menuLink == null) return;
    final uri = Uri.parse(menuLink!);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showOrderSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PreOrderBottomSheet(
        currentOrder: foodOrder,
        currentNotes: dietaryNotes,
        menuLink: menuLink,
        preorderCutoff: preorderCutoff,
        onSubmit: onSubmit,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.restaurant_menu_rounded,
                  color: Colors.white,
                  size: 16,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Your Order',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              if (_hasOrder) ...[
                const SizedBox(width: 8),
                Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    color: Color(0xFF22C55E),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    color: Colors.white,
                    size: 14,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),

          // Content based on state
          if (_isCutoffPassed)
            _buildCutoffPassedState(context)
          else if (_hasOrder)
            _buildOrderSubmittedState(context)
          else
            _buildNoOrderState(context),
        ],
      ),
    );
  }

  Widget _buildNoOrderState(BuildContext context) {
    final cutoffText = preorderCutoff != null
        ? 'Order by ${DateFormat('EEE d MMM').format(preorderCutoff!)}, ${DateFormat('h:mm a').format(preorderCutoff!)}'
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Let the host know what you\'d like',
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 16),

        // Buttons row
        Row(
          children: [
            if (menuLink != null) ...[
              OutlinedButton.icon(
                onPressed: () => _openMenu(context),
                icon: const Icon(Icons.menu_book_rounded, size: 18),
                label: const Text('View Menu'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF64748B),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: ElevatedButton(
                onPressed: () => _showOrderSheet(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Add Your Order',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),

        // Cutoff reminder
        if (cutoffText != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 14,
                color: Color(0xFF92400E),
              ),
              const SizedBox(width: 6),
              Text(
                cutoffText,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF92400E),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildOrderSubmittedState(BuildContext context) {
    final cutoffText = preorderCutoff != null
        ? 'Order by ${DateFormat('EEE d MMM').format(preorderCutoff!)}, ${DateFormat('h:mm a').format(preorderCutoff!)}'
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Order text
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                foodOrder!,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF1E293B),
                  height: 1.4,
                ),
              ),
              if (dietaryNotes != null && dietaryNotes!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.info_outline_rounded,
                      size: 14,
                      color: Color(0xFF7C3AED),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        dietaryNotes!,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF7C3AED),
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Buttons row
        Row(
          children: [
            OutlinedButton.icon(
              onPressed: () => _showOrderSheet(context),
              icon: const Icon(Icons.edit_rounded, size: 16),
              label: const Text('Edit'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF64748B),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            if (menuLink != null) ...[
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: () => _openMenu(context),
                icon: const Icon(Icons.menu_book_rounded, size: 16),
                label: const Text('View Menu'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF64748B),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ],
        ),

        // Cutoff reminder
        if (cutoffText != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 14,
                color: Color(0xFF92400E),
              ),
              const SizedBox(width: 6),
              Text(
                cutoffText,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF92400E),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildCutoffPassedState(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_hasOrder) ...[
          // Order text
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  foodOrder!,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF1E293B),
                    height: 1.4,
                  ),
                ),
                if (dietaryNotes != null && dietaryNotes!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        size: 14,
                        color: Color(0xFF7C3AED),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          dietaryNotes!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF7C3AED),
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Deadline passed message
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 16,
                color: Color(0xFF64748B),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _hasOrder
                      ? 'Order deadline has passed. Contact a host to make changes.'
                      : 'Order deadline has passed. You didn\'t submit an order.',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
