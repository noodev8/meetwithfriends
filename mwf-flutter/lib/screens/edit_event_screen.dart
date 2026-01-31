import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/events_service.dart';
import '../config/event_categories.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/menu_image_picker.dart';

class EditEventScreen extends StatefulWidget {
  final int eventId;
  final VoidCallback? onEventUpdated;

  const EditEventScreen({
    super.key,
    required this.eventId,
    this.onEventUpdated,
  });

  @override
  State<EditEventScreen> createState() => _EditEventScreenState();
}

class _EditEventScreenState extends State<EditEventScreen> {
  final EventsService _eventsService = EventsService();
  final _formKey = GlobalKey<FormState>();

  // Loading state
  bool _isLoadingEvent = true;
  String? _loadError;

  // Event data
  EventDetail? _event;
  String? _groupName;

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

  @override
  void initState() {
    super.initState();
    _loadEvent();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _locationController.dispose();
    _descriptionController.dispose();
    _menuLinkController.dispose();
    _customCapacityController.dispose();
    super.dispose();
  }

  Future<void> _loadEvent() async {
    setState(() {
      _isLoadingEvent = true;
      _loadError = null;
    });

    final result = await _eventsService.getEvent(widget.eventId);

    if (!mounted) return;

    if (result.success && result.event != null) {
      final event = result.event!;
      _event = event;
      _groupName = event.groupName;

      // Pre-populate form fields
      _titleController.text = event.title;
      _locationController.text = event.location ?? '';
      _descriptionController.text = _stripHtmlTags(event.description ?? '');
      _menuLinkController.text = event.menuLink ?? '';
      _menuImages = event.menuImages ?? [];

      _selectedDate = event.dateTime;
      _selectedTime = '${event.dateTime.hour.toString().padLeft(2, '0')}:${event.dateTime.minute.toString().padLeft(2, '0')}';

      // Set category
      _selectedCategory = EventCategory.values.firstWhere(
        (c) => c.name == event.category,
        orElse: () => EventCategory.food,
      );

      _capacity = event.capacity;
      _waitlistEnabled = event.waitlistEnabled;
      if (_capacity != null && ![6, 10, 12].contains(_capacity)) {
        _customCapacityController.text = _capacity.toString();
      }

      _preordersEnabled = event.preordersEnabled;

      // Calculate cutoff days from preorder cutoff date
      if (event.preorderCutoff != null) {
        final diff = event.dateTime.difference(event.preorderCutoff!).inDays;
        // Check if it matches a preset (7, 3, or 1 days before)
        if (diff == 7 || diff == 3 || diff == 1) {
          _preorderCutoffDays = diff;
        } else if (diff > 0) {
          // Custom date
          _preorderCutoffDays = -1;
          _customCutoffDate = event.preorderCutoff;
          _customCutoffTime = TimeOfDay(
            hour: event.preorderCutoff!.hour,
            minute: event.preorderCutoff!.minute,
          );
        }
      }

      setState(() {
        _isLoadingEvent = false;
      });
    } else {
      setState(() {
        _isLoadingEvent = false;
        _loadError = result.error ?? 'Failed to load event';
      });
    }
  }

  String _stripHtmlTags(String htmlString) {
    return htmlString
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .trim();
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
    bool preorderCutoffCleared = false;
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
      } else if (_preorderCutoffDays == 0) {
        preorderCutoffCleared = true;
      }
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    final result = await _eventsService.updateEvent(
      eventId: widget.eventId,
      title: _titleController.text.trim(),
      dateTime: dateTime,
      category: _selectedCategory.name,
      description: _descriptionController.text.trim(),
      location: _locationController.text.trim(),
      capacity: _capacity,
      capacityUnlimited: _capacity == null,
      waitlistEnabled: _capacity != null ? _waitlistEnabled : null,
      preordersEnabled: _preordersEnabled,
      menuImages: _menuImages,
      menuLink: _menuLinkController.text.trim(),
      preorderCutoff: preorderCutoff,
      preorderCutoffCleared: preorderCutoffCleared,
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    if (result.success) {
      widget.onEventUpdated?.call();
      Navigator.of(context).pop(true); // Return true to indicate success
    } else {
      setState(() => _error = result.error ?? 'Failed to update event');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingEvent) {
      return Scaffold(
        backgroundColor: const Color(0xFFFAFAFC),
        appBar: AppBar(
          backgroundColor: const Color(0xFFFAFAFC),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF1E293B)),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
        ),
        bottomNavigationBar: BottomNavBar(
          currentIndex: 1,
          onTap: (index) {
            navigateToMainTab(context, index);
          },
        ),
      );
    }

    if (_loadError != null) {
      return _buildErrorState();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFAFAFC),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF1E293B)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Back to ${_groupName ?? 'Event'}',
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
                    'Edit Event',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E293B),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'for ${_groupName ?? 'your group'}',
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF64748B),
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
                        Expanded(flex: 2, child: _buildInfoSidebar()),
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
        currentIndex: 1, // Events tab
        onTap: (index) {
          navigateToMainTab(context, index);
        },
      ),
    );
  }

  Widget _buildErrorState() {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFAFAFC),
        elevation: 0,
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
                Icons.error_outline_rounded,
                size: 64,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                _loadError ?? 'Failed to load event',
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
                ),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavBar(
        currentIndex: 1,
        onTap: (index) {
          navigateToMainTab(context, index);
        },
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Main card with essentials
          _buildEssentialsCard(),
          const SizedBox(height: 24),

          // Options section
          const Text(
            'OPTIONS',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 12),
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

  Widget _buildEssentialsCard() {
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
          _buildLabel('Event Title', required: true),
          const SizedBox(height: 8),
          TextFormField(
            controller: _titleController,
            decoration: _inputDecoration('e.g., Friday Evening Dinner'),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('Date', required: true),
                    const SizedBox(height: 8),
                    GestureDetector(
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
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('Time', required: true),
                    const SizedBox(height: 8),
                    _buildTimeDropdown(),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Event Type
          _buildLabel('Event Type', required: true),
          const SizedBox(height: 12),
          _buildCategorySelector(),
          const SizedBox(height: 20),

          // Location
          _buildLabel('Location'),
          const SizedBox(height: 8),
          TextFormField(
            controller: _locationController,
            decoration: _inputDecoration('e.g., The Beacon Hotel, Copthorne'),
          ),
          const SizedBox(height: 20),

          // Description
          _buildLabel('Description'),
          const SizedBox(height: 8),
          TextFormField(
            controller: _descriptionController,
            decoration: _inputDecoration('Tell people what to expect...'),
            maxLines: 4,
          ),
        ],
      ),
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

  Widget _buildTimeDropdown() {
    final times = <String>[];
    for (var h = 0; h < 24; h++) {
      for (var m = 0; m < 60; m += 30) {
        times.add('${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}');
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFCBD5E1)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedTime,
          hint: const Text(
            'Select time...',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 15),
          ),
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
          items: times.map((time) {
            final parts = time.split(':');
            final hour = int.parse(parts[0]);
            final minute = parts[1];
            final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
            final ampm = hour < 12 ? 'AM' : 'PM';
            return DropdownMenuItem(
              value: time,
              child: Text(
                '$displayHour:$minute $ampm',
                style: const TextStyle(fontSize: 15, color: Color(0xFF1E293B)),
              ),
            );
          }).toList(),
          onChanged: (value) => setState(() => _selectedTime = value),
        ),
      ),
    );
  }

  Widget _buildCategorySelector() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 2.2,
      ),
      itemCount: categoryOptions.length,
      itemBuilder: (context, index) {
        final cat = categoryOptions[index];
        final isSelected = _selectedCategory == cat.key;

        return GestureDetector(
          onTap: () => setState(() => _selectedCategory = cat.key),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFFEEF2FF) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0),
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: cat.gradient,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(cat.icon, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    cat.label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFF475569),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCapacityCard() {
    final capacityText = _capacity == null ? 'Unlimited' : '$_capacity spots';

    // Show warning if capacity is being reduced below current attendee count
    final hasCapacityWarning = _event != null &&
        _capacity != null &&
        _capacity! < _event!.attendeeCount + _event!.totalGuestCount;

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
          if (_event != null) ...[
            const SizedBox(height: 12),
            Text(
              'Currently ${_event!.attendeeCount} attending${_event!.totalGuestCount > 0 ? ' (+${_event!.totalGuestCount} guests)' : ''}',
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF64748B),
              ),
            ),
          ],
          if (hasCapacityWarning) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded, size: 18, color: Colors.amber.shade700),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Cannot reduce capacity below current attendees',
                      style: TextStyle(fontSize: 12, color: Colors.amber.shade800),
                    ),
                  ),
                ],
              ),
            ),
          ],
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
                  activeTrackColor: const Color(0xFF7C3AED),
                ),
              ],
            ),
            if (!_waitlistEnabled && _event != null && _event!.waitlistCount > 0) ...[
              const SizedBox(height: 8),
              Text(
                'This will remove ${_event!.waitlistCount} ${_event!.waitlistCount == 1 ? 'person' : 'people'} currently on the waitlist',
                style: TextStyle(fontSize: 13, color: Colors.amber.shade800),
              ),
            ],
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
    return Row(
      children: [
        Expanded(
          child: Container(
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
                      'Save Changes',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            side: const BorderSide(color: Color(0xFFCBD5E1)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: const Text(
            'Cancel',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFF475569),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoSidebar() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
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
                  color: const Color(0xFFE0E7FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF6366F1)),
              ),
              const SizedBox(width: 12),
              const Text(
                'Event Info',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (_event != null) ...[
            _buildInfoItem(
              Icons.groups_outlined,
              'Group',
              _event!.groupName,
            ),
            const SizedBox(height: 16),
            _buildInfoItem(
              Icons.people_outline,
              'Attendees',
              '${_event!.attendeeCount} going${_event!.waitlistCount > 0 ? ' (${_event!.waitlistCount} waitlisted)' : ''}',
            ),
            const SizedBox(height: 16),
            _buildInfoItem(
              Icons.circle,
              'Status',
              _event!.status == 'cancelled' ? 'Cancelled' : 'Active',
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: const Color(0xFF64748B)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF94A3B8),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
