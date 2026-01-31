import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/events_service.dart';
import '../widgets/menu_gallery_viewer.dart';

class OrderScreen extends StatefulWidget {
  final int eventId;

  const OrderScreen({super.key, required this.eventId});

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  final EventsService _eventsService = EventsService();

  EventDetail? _event;
  RsvpStatus? _rsvp;
  bool _isLoading = true;
  String? _loadError;
  bool _isSubmitting = false;

  late TextEditingController _orderController;
  late TextEditingController _notesController;

  @override
  void initState() {
    super.initState();
    _orderController = TextEditingController();
    _notesController = TextEditingController();
    _loadEvent();
  }

  @override
  void dispose() {
    _orderController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadEvent() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });

    final result = await _eventsService.getEvent(widget.eventId);

    if (mounted) {
      if (result.success && result.event != null) {
        setState(() {
          _isLoading = false;
          _event = result.event;
          _rsvp = result.rsvp;
          _orderController.text = result.rsvp?.foodOrder ?? '';
          _notesController.text = result.rsvp?.dietaryNotes ?? '';
        });
      } else {
        setState(() {
          _isLoading = false;
          _loadError = result.error ?? 'Failed to load event';
        });
      }
    }
  }

  bool get _isCutoffPassed {
    if (_event?.preorderCutoff == null) return false;
    return DateTime.now().isAfter(_event!.preorderCutoff!);
  }

  bool get _hasOrder =>
      _rsvp?.foodOrder != null && _rsvp!.foodOrder!.isNotEmpty;

  bool get _hasMenu => _event != null && _event!.hasMenu;

  Future<void> _handleSubmit() async {
    if (_event == null || _rsvp == null) return;

    setState(() => _isSubmitting = true);

    final foodOrder = _orderController.text.trim().isEmpty
        ? null
        : _orderController.text.trim();
    final dietaryNotes = _notesController.text.trim().isEmpty
        ? null
        : _notesController.text.trim();

    final result = await _eventsService.submitOrder(
      _event!.id,
      foodOrder: foodOrder,
      dietaryNotes: dietaryNotes,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);

      if (result.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order saved'),
            backgroundColor: Color(0xFF22C55E),
            duration: Duration(seconds: 2),
          ),
        );
        Navigator.of(context).pop(true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to save order'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    }
  }

  void _openMenu() async {
    if (_event == null) return;

    if (_event!.hasMenuImages) {
      MenuGalleryViewer.show(context, _event!.menuImages!);
    } else if (_event!.hasMenuLink) {
      final uri = Uri.parse(_event!.menuLink!);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back_rounded),
          color: const Color(0xFF1E293B),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _rsvp != null && _rsvp!.status != 'not_going' ? 'Your Order' : 'Menu',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
            ),
            if (_event != null && !_event!.isCancelled && !_event!.isPast && _event!.preordersEnabled && _event!.preorderCutoff != null && !_isCutoffPassed)
              Text(
                'Order by ${DateFormat('EEE d MMM, h:mm a').format(_event!.preorderCutoff!)}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: Color(0xFF94A3B8),
                ),
              ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: const Color(0xFFE2E8F0),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
            )
          : _loadError != null
              ? _buildErrorState()
              : _buildBody(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              _loadError ?? 'Something went wrong',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadEvent,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    final event = _event!;

    // Guard: event cancelled
    if (event.isCancelled) {
      return _buildGuardState(
        icon: Icons.cancel_outlined,
        title: 'Event cancelled',
        message: 'This event has been cancelled.',
      );
    }

    // Guard: event past
    if (event.isPast) {
      return _buildGuardState(
        icon: Icons.event_busy_outlined,
        title: 'Event has passed',
        message: 'This event has already taken place.',
      );
    }

    // Guard: preorders not enabled
    if (!event.preordersEnabled) {
      return _buildGuardState(
        icon: Icons.restaurant_menu_rounded,
        title: 'Pre-orders not available',
        message: 'The host has not enabled pre-orders for this event.',
      );
    }

    final canOrder = _rsvp != null && _rsvp!.status != 'not_going';

    // Non-editable states: scrollable
    if (!canOrder || _isCutoffPassed) {
      return SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_hasMenu) ...[
                  _buildMenuCard(),
                  const SizedBox(height: 20),
                ],
                if (!canOrder)
                  _buildRsvpPrompt()
                else
                  _buildReadOnlyOrder(),
              ],
            ),
          ),
        ),
      );
    }

    // Editable order: form fills available space
    return Column(
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_hasMenu) ...[
                      _buildMenuCard(),
                      const SizedBox(height: 20),
                    ],
                    Expanded(child: _buildOrderForm()),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Pinned save button
        Container(
          padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + MediaQuery.of(context).padding.bottom),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                    disabledBackgroundColor:
                        const Color(0xFF7C3AED).withAlpha(153),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Save Order',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRsvpPrompt() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 8),
          const Text(
            'RSVP to this event to place a pre-order.',
            style: TextStyle(
              fontSize: 15,
              color: Color(0xFF64748B),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
              child: const Text(
                'Go to event',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildGuardState({
    required IconData icon,
    required String title,
    required String message,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuCard() {
    final event = _event!;

    return GestureDetector(
      onTap: _openMenu,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFEEF2FF),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE0E7FF)),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFF7C3AED),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.menu_book_rounded,
                color: Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.hasMenuImages
                        ? 'View Menu${event.menuImages!.length > 1 ? ' (${event.menuImages!.length} pages)' : ''}'
                        : 'View the menu',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF7C3AED),
                    ),
                  ),
                  if (event.hasMenuImages)
                    const Text(
                      'Tap to view, pinch to zoom',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              event.hasMenuImages
                  ? Icons.photo_library_rounded
                  : Icons.open_in_new_rounded,
              color: const Color(0xFF7C3AED),
              size: 18,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Order field
        Expanded(
          child: TextField(
            controller: _orderController,
            maxLength: 500,
            expands: true,
            maxLines: null,
            minLines: null,
            textAlignVertical: TextAlignVertical.top,
            buildCounter: (context, {required currentLength, required isFocused, required maxLength}) => null,
            decoration: InputDecoration(
              hintText: 'What would you like to order?\ne.g., Chicken Caesar Salad, no croutons',
              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.all(16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: Color(0xFF7C3AED), width: 2),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Dietary notes field
        const Text(
          'Dietary notes (optional)',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: Color(0xFF94A3B8),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _notesController,
          maxLength: 200,
          maxLines: 1,
          style: const TextStyle(fontSize: 14),
          buildCounter: (context, {required currentLength, required isFocused, required maxLength}) => null,
          decoration: InputDecoration(
            hintText: 'e.g., Vegetarian, nut allergy',
            hintStyle: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 14,
            ),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide:
                  const BorderSide(color: Color(0xFF7C3AED), width: 2),
            ),
            counterStyle: const TextStyle(
              fontSize: 11,
              color: Color(0xFF94A3B8),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReadOnlyOrder() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Deadline passed banner
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

        // Show existing order if any
        if (_hasOrder) ...[
          const SizedBox(height: 16),
          const Text(
            'Your order',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Color(0xFF475569),
            ),
          ),
          const SizedBox(height: 8),
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
                  _rsvp!.foodOrder!,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF1E293B),
                    height: 1.4,
                  ),
                ),
                if (_rsvp!.dietaryNotes != null &&
                    _rsvp!.dietaryNotes!.isNotEmpty) ...[
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
                          _rsvp!.dietaryNotes!,
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
        ],
      ],
    );
  }
}
