import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../services/events_service.dart';
import '../config/event_categories.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/menu_image_picker.dart';

class CreateEventScreen extends StatefulWidget {
  final int groupId;
  final String groupName;
  final bool canCreateEvents;
  final VoidCallback? onEventCreated;

  const CreateEventScreen({
    super.key,
    required this.groupId,
    required this.groupName,
    required this.canCreateEvents,
    this.onEventCreated,
  });

  @override
  State<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends State<CreateEventScreen> {
  final EventsService _eventsService = EventsService();
  final _formKey = GlobalKey<FormState>();

  // Form state
  final _titleController = TextEditingController();
  final _locationController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _menuLinkController = TextEditingController();
  final _customCapacityController = TextEditingController();

  DateTime? _selectedDate;
  String? _selectedTime;
  EventCategory _selectedCategory = EventCategory.food;
  int? _capacity;
  bool _waitlistEnabled = true;
  bool _capacityExpanded = false;
  bool _preordersExpanded = false;
  bool _preordersEnabled = false;
  int _preorderCutoffDays = 0; // 0 = no cutoff, -1 = custom
  DateTime? _customCutoffDate;
  TimeOfDay _customCutoffTime = const TimeOfDay(hour: 17, minute: 0);
  List<String> _menuImages = [];

  bool _isSubmitting = false;
  String? _error;

  // Check if user can create events
  bool get _canCreateEvents => widget.canCreateEvents;

  @override
  void dispose() {
    _titleController.dispose();
    _locationController.dispose();
    _descriptionController.dispose();
    _menuLinkController.dispose();
    _customCapacityController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF7C3AED),
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Color(0xFF1E293B),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedDate == null) {
      setState(() => _error = 'Please select a date');
      return;
    }

    if (_selectedTime == null) {
      setState(() => _error = 'Please select a time');
      return;
    }

    // Parse time
    final timeParts = _selectedTime!.split(':');
    final hour = int.parse(timeParts[0]);
    final minute = int.parse(timeParts[1]);

    final dateTime = DateTime(
      _selectedDate!.year,
      _selectedDate!.month,
      _selectedDate!.day,
      hour,
      minute,
    );

    if (dateTime.isBefore(DateTime.now())) {
      setState(() => _error = 'Event must be in the future');
      return;
    }

    // Calculate preorder cutoff if enabled
    DateTime? preorderCutoff;
    if (_preordersEnabled) {
      if (_preorderCutoffDays == -1 && _customCutoffDate != null) {
        // Custom date
        preorderCutoff = DateTime(
          _customCutoffDate!.year,
          _customCutoffDate!.month,
          _customCutoffDate!.day,
          _customCutoffTime.hour,
          _customCutoffTime.minute,
        );
      } else if (_preorderCutoffDays > 0) {
        // Preset days before event
        preorderCutoff = dateTime.subtract(Duration(days: _preorderCutoffDays));
        preorderCutoff = DateTime(
          preorderCutoff.year,
          preorderCutoff.month,
          preorderCutoff.day,
          17, // 5 PM
          0,
        );
      }
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    final result = await _eventsService.createEvent(
      groupId: widget.groupId,
      title: _titleController.text.trim(),
      dateTime: dateTime,
      category: _selectedCategory.name,
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      location: _locationController.text.trim().isEmpty
          ? null
          : _locationController.text.trim(),
      capacity: _capacity,
      waitlistEnabled: _capacity != null ? _waitlistEnabled : null,
      preordersEnabled: _preordersEnabled,
      menuImages: _menuImages.isNotEmpty ? _menuImages : null,
      menuLink: _menuLinkController.text.trim().isEmpty
          ? null
          : _menuLinkController.text.trim(),
      preorderCutoff: preorderCutoff,
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    if (result.success && result.eventId != null) {
      widget.onEventCreated?.call();
      Navigator.of(context).pop(result.eventId);
    } else {
      setState(() => _error = result.error ?? 'Failed to create event');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_canCreateEvents) {
      return _buildNoPermissionState();
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFFAFAFC),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
            statusBarColor: Colors.transparent,
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF1E293B)),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(
            widget.groupName,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: Color(0xFF1E293B),
            ),
          ),
          titleSpacing: 0,
        ),
        body: LayoutBuilder(
          builder: (context, constraints) {
            final isWideScreen = constraints.maxWidth >= 900;

            return SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    const Text(
                      'Create Event',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E293B),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Two column layout for wide screens
                    if (isWideScreen)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(flex: 3, child: _buildForm()),
                          const SizedBox(width: 32),
                          Expanded(flex: 2, child: _buildTipsSidebar()),
                        ],
                      )
                    else
                      _buildForm(),
                  ],
                ),
              ),
            );
          },
        ),
        bottomNavigationBar: BottomNavBar(
          currentIndex: 2, // Groups tab
          onTap: (index) {
            navigateToMainTab(context, index);
          },
        ),
      ),
    );
  }

  Widget _buildNoPermissionState() {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFFAFAFC),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
            statusBarColor: Colors.transparent,
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF1E293B)),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.lock_outline_rounded,
                  size: 64,
                  color: Colors.grey.shade400,
                ),
                const SizedBox(height: 16),
                const Text(
                  'You do not have permission to create events in this group',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 24),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text(
                    'Go back',
                    style: TextStyle(
                      color: Color(0xFF7C3AED),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: BottomNavBar(
          currentIndex: 2, // Groups tab
          onTap: (index) {
            navigateToMainTab(context, index);
          },
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title, date, time
          _buildEssentialsCard(),
          const SizedBox(height: 16),

          // Event type
          _buildEventTypeCard(),
          const SizedBox(height: 16),

          // Location, description
          _buildDetailsCard(),
          const SizedBox(height: 16),
          _buildCapacityCard(),
          const SizedBox(height: 12),
          _buildPreordersCard(),
          const SizedBox(height: 32),

          // Submit buttons
          _buildSubmitButtons(),
        ],
      ),
    );
  }

  Widget _buildSectionCard({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E293B).withAlpha(10),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildEssentialsCard() {
    return _buildSectionCard(
      children: [
        // Error message
        if (_error != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _error!,
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // Title field
        TextFormField(
          controller: _titleController,
          decoration: _inputDecoration('e.g., Friday Evening Dinner'),
          textCapitalization: TextCapitalization.words,
          maxLength: 200,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Title is required';
            }
            return null;
          },
        ),
        const SizedBox(height: 20),

        // Date and Time row
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                    onTap: _selectDate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _selectedDate != null
                                  ? DateFormat('dd/MM/yyyy').format(_selectedDate!)
                                  : 'dd/mm/yyyy',
                              style: TextStyle(
                                fontSize: 15,
                                color: _selectedDate != null
                                    ? const Color(0xFF1E293B)
                                    : const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.calendar_today_rounded,
                            size: 20,
                            color: Color(0xFF64748B),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTimeDropdown(),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDetailsCard() {
    return _buildSectionCard(
      children: [
        // Location
        _buildLabel('Location'),
        const SizedBox(height: 8),
        TextFormField(
          controller: _locationController,
          decoration: _inputDecoration('e.g., The Beacon Hotel, Copthorne'),
          textCapitalization: TextCapitalization.words,
        ),
        const SizedBox(height: 20),

        // Description
        _buildLabel('Description'),
        const SizedBox(height: 8),
        TextFormField(
          controller: _descriptionController,
          decoration: _inputDecoration('Tell people what to expect...'),
          textCapitalization: TextCapitalization.sentences,
          maxLines: 4,
        ),
      ],
    );
  }

  Widget _buildLabel(String text, {bool required = false}) {
    return Text(
      required ? '$text *' : text,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: Color(0xFF475569),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.red.shade400),
      ),
      counterText: '',
    );
  }

  String _formatTimeDisplay(String time) {
    final parts = time.split(':');
    final hour = int.parse(parts[0]);
    final minute = parts[1];
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    final ampm = hour < 12 ? 'AM' : 'PM';
    return '$displayHour:$minute $ampm';
  }

  void _showTimePicker() {
    final times = <String>[];
    for (var h = 0; h < 24; h++) {
      for (var m = 0; m < 60; m += 30) {
        times.add('${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}');
      }
    }

    // Scroll to selected time, or 6pm if none
    final targetTime = _selectedTime ?? '18:00';
    final targetIndex = times.indexOf(targetTime).clamp(0, times.length - 1);
    const itemHeight = 48.0;
    // Center the target in the sheet (sheet is ~40% of screen)
    final sheetHeight = MediaQuery.of(context).size.height * 0.4;
    final initialOffset = (targetIndex * itemHeight - sheetHeight / 2 + itemHeight / 2)
        .clamp(0.0, (times.length * itemHeight - sheetHeight).clamp(0.0, double.infinity));
    final scrollController = ScrollController(initialScrollOffset: initialOffset);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: SizedBox(
            height: sheetHeight,
            child: Column(
              children: [
                // Handle bar
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // List
                Expanded(
                  child: ListView.builder(
                    controller: scrollController,
                    itemCount: times.length,
                    itemExtent: itemHeight,
                    itemBuilder: (context, index) {
                      final time = times[index];
                      final isSelected = time == _selectedTime;
                      return GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          setState(() => _selectedTime = time);
                          Navigator.of(context).pop();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          color: isSelected
                              ? const Color(0xFFF5F3FF)
                              : Colors.transparent,
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              _formatTimeDisplay(time),
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                color: isSelected
                                    ? const Color(0xFF7C3AED)
                                    : const Color(0xFF1E293B),
                              ),
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
        );
      },
    );
  }

  Widget _buildTimeDropdown() {
    return GestureDetector(
      onTap: _showTimePicker,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFCBD5E1)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                _selectedTime != null
                    ? _formatTimeDisplay(_selectedTime!)
                    : 'Time',
                style: TextStyle(
                  fontSize: 15,
                  color: _selectedTime != null
                      ? const Color(0xFF1E293B)
                      : const Color(0xFF94A3B8),
                ),
              ),
            ),
            const Icon(
              Icons.schedule_rounded,
              size: 20,
              color: Color(0xFF64748B),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventTypeCard() {
    return _buildSectionCard(
      children: [
        _buildLabel('Event Type'),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.75,
          ),
          itemCount: categoryOptions.length,
          itemBuilder: (context, index) {
            final cat = categoryOptions[index];
            final isSelected = _selectedCategory == cat.key;
            return GestureDetector(
              onTap: () => setState(() => _selectedCategory = cat.key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFEEF2FF) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: cat.gradient,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(cat.icon, color: Colors.white, size: 16),
                    ),
                    const SizedBox(height: 4),
                    Flexible(
                      child: Text(
                        cat.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFF475569),
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildCapacityCard() {
    final capacityText = _capacity == null ? 'Unlimited' : '$_capacity spots';

    return _buildExpandableCard(
      icon: Icons.people_rounded,
      title: 'Capacity',
      summary: capacityText,
      isExpanded: _capacityExpanded,
      onTap: () => setState(() => _capacityExpanded = !_capacityExpanded),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildCapacityChip(null, 'Unlimited'),
              _buildCapacityChip(6, '6'),
              _buildCapacityChip(10, '10'),
              _buildCapacityChip(12, '12'),
              SizedBox(
                width: 80,
                child: TextField(
                  controller: _customCapacityController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  decoration: InputDecoration(
                    hintText: 'Other',
                    hintStyle: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 2),
                    ),
                  ),
                  onChanged: (value) {
                    final parsed = int.tryParse(value);
                    if (parsed != null && parsed > 0) {
                      setState(() => _capacity = parsed);
                    }
                  },
                ),
              ),
            ],
          ),
          // Waitlist toggle - only visible when capacity is set
          if (_capacity != null) ...[
            const SizedBox(height: 16),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Waitlist',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Allow members to join a waitlist when full',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: _waitlistEnabled,
                  onChanged: (val) => setState(() => _waitlistEnabled = val),
                  activeColor: const Color(0xFF7C3AED),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCapacityChip(int? value, String label) {
    final isSelected = _capacity == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _capacity = value;
          if (value == null || [6, 10, 12].contains(value)) {
            _customCapacityController.clear();
          }
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildPreordersCard() {
    final summaryText = _preordersEnabled ? 'On' : 'Off';

    return _buildExpandableCard(
      icon: Icons.receipt_long_rounded,
      title: 'Pre-Orders',
      summary: summaryText,
      isExpanded: _preordersExpanded,
      onTap: () => setState(() => _preordersExpanded = !_preordersExpanded),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Toggle row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Collect orders or preferences',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Request details from attendees before the event',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: _preordersEnabled,
                onChanged: (value) => setState(() => _preordersEnabled = value),
                activeTrackColor: const Color(0xFF7C3AED),
                activeThumbColor: Colors.white,
              ),
            ],
          ),

          if (_preordersEnabled) ...[
            const SizedBox(height: 20),

            // Menu images
            _buildLabel('Menu Photos'),
            const SizedBox(height: 8),
            MenuImagePicker(
              images: _menuImages,
              onImagesChanged: (images) => setState(() => _menuImages = images),
            ),
            const SizedBox(height: 20),

            // Or divider
            Row(
              children: [
                Expanded(child: Container(height: 1, color: const Color(0xFFE2E8F0))),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('or', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                ),
                Expanded(child: Container(height: 1, color: const Color(0xFFE2E8F0))),
              ],
            ),
            const SizedBox(height: 20),

            // Menu link
            _buildLabel('External Link'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _menuLinkController,
              decoration: _inputDecoration('https://restaurant.com/menu'),
              keyboardType: TextInputType.url,
            ),
            const SizedBox(height: 4),
            const Text(
              'Link to a menu or form (used if no photos uploaded)',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 20),

            // Cutoff
            _buildLabel('Cutoff'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildCutoffChip(7, '1 week before'),
                _buildCutoffChip(3, '3 days before'),
                _buildCutoffChip(1, '1 day before'),
                _buildCutoffChip(0, 'No cutoff'),
                _buildCutoffChip(-1, 'Custom'),
              ],
            ),
            // Custom date/time pickers
            if (_preorderCutoffDays == -1) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _customCutoffDate ?? DateTime.now(),
                          firstDate: DateTime.now().subtract(const Duration(days: 1)),
                          lastDate: _selectedDate ?? DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          setState(() => _customCutoffDate = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Text(
                              _customCutoffDate != null
                                  ? DateFormat('EEE d MMM').format(_customCutoffDate!)
                                  : 'Select date',
                              style: TextStyle(
                                fontSize: 14,
                                color: _customCutoffDate != null ? const Color(0xFF1E293B) : const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: _customCutoffTime,
                      );
                      if (picked != null) {
                        setState(() => _customCutoffTime = picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.schedule_rounded, size: 16, color: Color(0xFF64748B)),
                          const SizedBox(width: 8),
                          Text(
                            _customCutoffTime.format(context),
                            style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
            // Show selected date for presets
            if (_preorderCutoffDays > 0 && _selectedDate != null) ...[
              const SizedBox(height: 8),
              Text(
                'Orders due by ${DateFormat('EEE d MMM').format(_selectedDate!.subtract(Duration(days: _preorderCutoffDays)))} at 5pm',
                style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
              ),
            ],
            if (_preorderCutoffDays > 0 && _selectedDate == null) ...[
              const SizedBox(height: 8),
              const Text(
                'Set event date first',
                style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildCutoffChip(int days, String label) {
    final isSelected = _preorderCutoffDays == days;
    // Presets need event date; custom and no cutoff always enabled
    final isDisabled = days > 0 && _selectedDate == null;

    return GestureDetector(
      onTap: isDisabled ? null : () => setState(() {
        _preorderCutoffDays = days;
        // Initialize custom date to 2 days before event if switching to custom
        if (days == -1 && _customCutoffDate == null && _selectedDate != null) {
          _customCutoffDate = _selectedDate!.subtract(const Duration(days: 2));
        }
      }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isDisabled
              ? const Color(0xFFF8FAFC)
              : (isSelected ? const Color(0xFF7C3AED) : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDisabled
                ? const Color(0xFFCBD5E1)
                : (isSelected ? Colors.white : const Color(0xFF475569)),
          ),
        ),
      ),
    );
  }

  Widget _buildExpandableCard({
    required IconData icon,
    required String title,
    required String summary,
    required bool isExpanded,
    required VoidCallback onTap,
    required Widget content,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          // Header
          GestureDetector(
            onTap: onTap,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, size: 18, color: const Color(0xFF64748B)),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '·',
                    style: TextStyle(
                      fontSize: 15,
                      color: Colors.grey.shade400,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    summary,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const Spacer(),
                  AnimatedRotation(
                    turns: isExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Content
          if (isExpanded)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: Color(0xFFF1F5F9)),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.only(top: 16),
                child: content,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSubmitButtons() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF7C3AED)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF7C3AED).withAlpha(60),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _handleSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: _isSubmitting
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Text(
                'Create Event',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }

  Widget _buildTipsSidebar() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEEF2FF), Color(0xFFF5F3FF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE0E7FF).withAlpha(128)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6366F1), Color(0xFF7C3AED)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Icons.lightbulb_outline_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              const Text(
                'Tips',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildTipItem(
            Icons.access_time_rounded,
            'Date & time',
            'Pick a time that works for most people. Evening events often get better attendance.',
          ),
          const SizedBox(height: 16),
          _buildTipItem(
            Icons.location_on_rounded,
            'Location',
            'Be specific so people can find it. Include the full address or directions.',
          ),
          const SizedBox(height: 16),
          _buildTipItem(
            Icons.people_rounded,
            'Capacity',
            "If there's a limit, set it here. Members who can't get in will be waitlisted.",
          ),
          const SizedBox(height: 16),
          _buildTipItem(
            Icons.receipt_long_rounded,
            'Pre-orders',
            'Great for restaurant events. Link to the menu so people can order ahead.',
          ),
        ],
      ),
    );
  }

  Widget _buildTipItem(IconData icon, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Colors.white.withAlpha(200),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: const Color(0xFF6366F1)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF475569),
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
