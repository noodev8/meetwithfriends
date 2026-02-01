import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:convert';
import '../services/events_service.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../widgets/menu_gallery_viewer.dart';
import '../widgets/pre_order_bottom_sheet.dart';

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
  List<EventHost> _hosts = [];
  bool _isGroupMember = false;
  bool _canEdit = false;
  List<Attendee> _attending = [];
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

    final results = await Future.wait([
      _eventsService.getEvent(widget.eventId),
      _eventsService.getAttendees(widget.eventId),
    ]);

    final eventResult = results[0] as EventDetailResult;
    final attendeesResult = results[1] as AttendeesResult;

    if (mounted) {
      if (eventResult.success && eventResult.event != null) {
        setState(() {
          _isLoading = false;
          _event = eventResult.event;
          _rsvp = eventResult.rsvp;
          _hosts = eventResult.hosts ?? [];
          _isGroupMember = eventResult.isGroupMember;
          _canEdit = eventResult.canEdit;
          _orderController.text = eventResult.rsvp?.foodOrder ?? '';
          _notesController.text = eventResult.rsvp?.dietaryNotes ?? '';
          if (attendeesResult.success) {
            _attending = attendeesResult.attending;
          }
        });
      } else {
        setState(() {
          _isLoading = false;
          _loadError = eventResult.error ?? 'Failed to load event';
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

  void _showOrdersSummary() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _OrdersSummarySheet(
        eventId: widget.eventId,
        eventTitle: _event!.title,
        groupName: _event!.groupName,
        hostName: _hosts.isNotEmpty ? _hosts[0].name : null,
        eventDate: DateFormat('EEE d MMM, HH:mm').format(_event!.dateTime),
        eventLocation: _event!.location,
        attendees: _attending,
        canEditOrders: _canEdit,
        menuLink: _event!.menuLink,
        menuImages: _event!.menuImages,
        onEditOrder: _showEditOrderSheet,
        onOrderUpdated: _updateAttendeeOrder,
      ),
    );
  }

  void _showEditOrderSheet(Attendee attendee) {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PreOrderBottomSheet(
        currentOrder: attendee.foodOrder,
        currentNotes: attendee.dietaryNotes,
        menuLink: _event?.menuLink,
        menuImages: _event?.menuImages,
        preorderCutoff: null,
        onSubmit: (foodOrder, dietaryNotes) async {
          final result = await _eventsService.updateOrder(
            widget.eventId,
            attendee.userId,
            foodOrder: foodOrder,
            dietaryNotes: dietaryNotes,
          );

          if (result.success) {
            _updateAttendeeOrder(
              attendee.userId,
              result.foodOrder,
              result.dietaryNotes,
            );

            if (mounted) {
              scaffoldMessenger.showSnackBar(
                SnackBar(
                  content: Text('Updated order for ${attendee.name}'),
                  backgroundColor: const Color(0xFF22C55E),
                ),
              );
            }
            return true;
          } else {
            if (mounted) {
              scaffoldMessenger.showSnackBar(
                SnackBar(
                  content: Text(result.error ?? 'Failed to update order'),
                  backgroundColor: Colors.red.shade600,
                ),
              );
            }
            return false;
          }
        },
      ),
    );
  }

  void _updateAttendeeOrder(int userId, String? foodOrder, String? dietaryNotes) {
    setState(() {
      final index = _attending.indexWhere((a) => a.userId == userId);
      if (index != -1) {
        final old = _attending[index];
        _attending[index] = Attendee(
          userId: old.userId,
          name: old.name,
          avatarUrl: old.avatarUrl,
          guestCount: old.guestCount,
          foodOrder: foodOrder,
          dietaryNotes: dietaryNotes,
          waitlistPosition: old.waitlistPosition,
          rsvpAt: old.rsvpAt,
        );
      }
    });
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
        actions: [
          if (_isGroupMember && _event != null && _event!.preordersEnabled)
            IconButton(
              onPressed: _showOrdersSummary,
              icon: const Icon(Icons.list_alt_rounded),
              color: const Color(0xFF7C3AED),
              tooltip: 'View all orders',
            ),
        ],
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

class _OrdersSummarySheet extends StatefulWidget {
  final int eventId;
  final String eventTitle;
  final String? groupName;
  final String? hostName;
  final String? eventDate;
  final String? eventLocation;
  final List<Attendee> attendees;
  final bool canEditOrders;
  final String? menuLink;
  final List<String>? menuImages;
  final void Function(Attendee attendee) onEditOrder;
  final void Function(int userId, String? foodOrder, String? dietaryNotes) onOrderUpdated;

  const _OrdersSummarySheet({
    required this.eventId,
    required this.eventTitle,
    this.groupName,
    this.hostName,
    this.eventDate,
    this.eventLocation,
    required this.attendees,
    this.canEditOrders = false,
    this.menuLink,
    this.menuImages,
    required this.onEditOrder,
    required this.onOrderUpdated,
  });

  @override
  State<_OrdersSummarySheet> createState() => _OrdersSummarySheetState();
}

class _OrdersSummarySheetState extends State<_OrdersSummarySheet> {
  bool _copied = false;
  bool _downloading = false;

  Future<void> _downloadPDF() async {
    setState(() => _downloading = true);

    try {
      final token = await AuthService().getToken();
      if (token == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please log in to download PDF'),
              backgroundColor: Colors.red,
            ),
          );
        }
        setState(() => _downloading = false);
        return;
      }

      final response = await http.get(
        Uri.parse('${ApiService.baseUrl}/events/${widget.eventId}/preorders/pdf'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (!mounted) return;
      setState(() => _downloading = false);

      final contentType = response.headers['content-type'] ?? '';
      if (contentType.contains('application/json')) {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data['message'] ?? 'Failed to generate PDF'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      final tempDir = await getTemporaryDirectory();
      final fileName = 'preorders-${widget.eventTitle.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')}.pdf';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done) {
        await SharePlus.instance.share(
          ShareParams(
            files: [XFile(file.path)],
            subject: '${widget.eventTitle} - Pre-Orders',
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _downloading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download PDF: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _generateOrderText() {
    final lines = <String>[];

    // Header with group name, host, and event details
    if (widget.groupName != null) {
      lines.add(widget.groupName!);
    }
    if (widget.hostName != null) {
      lines.add('Host: ${widget.hostName}');
    }
    lines.add(widget.eventTitle);
    if (widget.eventDate != null) {
      lines.add(widget.eventDate!);
    }
    if (widget.eventLocation != null) {
      lines.add(widget.eventLocation!);
    }
    lines.add('');
    lines.add('--- Orders (${widget.attendees.length} guests) ---');
    lines.add('');

    for (final person in widget.attendees) {
      lines.add('— ${person.name}');
      if (person.foodOrder != null && person.foodOrder!.isNotEmpty) {
        lines.add(person.foodOrder!);
        if (person.dietaryNotes != null && person.dietaryNotes!.isNotEmpty) {
          lines.add('Notes: ${person.dietaryNotes}');
        }
      } else {
        lines.add('No order submitted');
      }
      lines.add('');
    }

    lines.add('---');
    lines.add('Powered by meetwithfriends.net');

    return lines.join('\n').trim();
  }

  Future<void> _copyToClipboard() async {
    final text = _generateOrderText();
    await Clipboard.setData(ClipboardData(text: text));
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _copied = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
            child: Row(
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
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Orders',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: const Color(0xFF64748B),
                ),
              ],
            ),
          ),

          // Orders list
          Flexible(
            child: widget.attendees.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'No attendees yet',
                      style: TextStyle(
                        fontSize: 15,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.all(20),
                    itemCount: widget.attendees.length,
                    separatorBuilder: (context, index) => const Divider(height: 24),
                    itemBuilder: (context, index) {
                      final person = widget.attendees[index];
                      final hasOrder = person.foodOrder != null && person.foodOrder!.isNotEmpty;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  person.name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1E293B),
                                  ),
                                ),
                              ),
                              if (widget.canEditOrders)
                                GestureDetector(
                                  onTap: () {
                                    Navigator.of(context).pop();
                                    widget.onEditOrder(person);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF5F3FF),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'Edit',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF7C3AED),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          if (hasOrder) ...[
                            Text(
                              person.foodOrder!,
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF475569),
                                height: 1.4,
                              ),
                            ),
                            if (person.dietaryNotes != null && person.dietaryNotes!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Notes: ${person.dietaryNotes}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF7C3AED),
                                    height: 1.4,
                                  ),
                                ),
                              ),
                          ] else
                            const Text(
                              'No order submitted',
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF94A3B8),
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                        ],
                      );
                    },
                  ),
          ),

          // Footer with action buttons
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  // Copy button
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _copyToClipboard,
                      icon: Icon(
                        _copied ? Icons.check_rounded : Icons.copy_rounded,
                        size: 18,
                      ),
                      label: Text(_copied ? 'Copied!' : 'Copy'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _copied ? const Color(0xFF22C55E) : const Color(0xFF7C3AED),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                  if (widget.canEditOrders) ...[
                    const SizedBox(width: 12),
                    // Download PDF button (hosts only)
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _downloading ? null : _downloadPDF,
                        icon: _downloading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.picture_as_pdf_rounded, size: 18),
                        label: Text(_downloading ? 'Loading...' : 'PDF'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF64748B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
