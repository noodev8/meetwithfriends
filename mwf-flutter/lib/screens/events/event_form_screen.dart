import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/event.dart';
import 'package:meetwithfriends/providers/events_provider.dart';
import 'package:meetwithfriends/services/events_service.dart';

class EventFormScreen extends ConsumerStatefulWidget {
  const EventFormScreen({required this.groupId, this.event, super.key});

  final int groupId;
  final Event? event;

  bool get isEditing => event != null;

  @override
  ConsumerState<EventFormScreen> createState() => _EventFormScreenState();
}

class _EventFormScreenState extends ConsumerState<EventFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _locationController;
  late final TextEditingController _capacityController;

  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.event?.title);
    _descriptionController = TextEditingController(
      text: widget.event?.description,
    );
    _locationController = TextEditingController(text: widget.event?.location);
    _capacityController = TextEditingController(
      text: widget.event?.capacity?.toString() ?? '',
    );
    _selectedDate = widget.event?.eventDate;

    if (widget.event?.eventTime != null) {
      final parts = widget.event!.eventTime!.split(':');
      if (parts.length >= 2) {
        _selectedTime = TimeOfDay(
          hour: int.tryParse(parts[0]) ?? 0,
          minute: int.tryParse(parts[1]) ?? 0,
        );
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final eventsService = ref.read(eventsServiceProvider);

    final timeStr = _selectedTime != null
        ? '${_selectedTime!.hour.toString().padLeft(2, '0')}:'
            '${_selectedTime!.minute.toString().padLeft(2, '0')}'
        : null;

    final capacity = _capacityController.text.isNotEmpty
        ? int.tryParse(_capacityController.text)
        : null;

    final response = widget.isEditing
        ? await eventsService.updateEvent(
            id: widget.event!.id,
            title: _titleController.text,
            description: _descriptionController.text.isNotEmpty
                ? _descriptionController.text
                : null,
            location: _locationController.text.isNotEmpty
                ? _locationController.text
                : null,
            eventDate: _selectedDate,
            eventTime: timeStr,
            capacity: capacity,
          )
        : await eventsService.createEvent(
            groupId: widget.groupId,
            title: _titleController.text,
            description: _descriptionController.text.isNotEmpty
                ? _descriptionController.text
                : null,
            location: _locationController.text.isNotEmpty
                ? _locationController.text
                : null,
            eventDate: _selectedDate,
            eventTime: timeStr,
            capacity: capacity,
          );

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (response.isSuccess) {
      ref
        ..invalidate(myEventsProvider)
        ..invalidate(groupEventsProvider(widget.groupId));
      if (widget.isEditing) {
        ref.invalidate(eventDetailProvider(widget.event!.id));
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.isEditing
                  ? 'Event updated successfully'
                  : 'Event created successfully',
            ),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      }
    } else {
      setState(() {
        _error = response.message ?? 'Failed to save event';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.isEditing ? 'Edit Event' : 'Create Event',
          style: AppTypography.h4,
        ),
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _handleSubmit,
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.isEditing ? 'Save' : 'Create'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: AppSpacing.screenPadding,
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Error message
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: AppSpacing.borderRadiusMd,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          _error!,
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],
              // Title field
              TextFormField(
                controller: _titleController,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Event Title *',
                  hintText: 'What is this event about?',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter an event title';
                  }
                  if (value.length < 3) {
                    return 'Title must be at least 3 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.lg),
              // Description field
              TextFormField(
                controller: _descriptionController,
                maxLines: 4,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Tell people what to expect',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              // Date and Time
              const Text('Date & Time', style: AppTypography.labelLarge),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: _buildDateTimeButton(
                      label: _selectedDate != null
                          ? DateFormat('MMM d, yyyy').format(_selectedDate!)
                          : 'Select Date',
                      icon: Icons.calendar_today_outlined,
                      onTap: _selectDate,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _buildDateTimeButton(
                      label: _selectedTime != null
                          ? _selectedTime!.format(context)
                          : 'Select Time',
                      icon: Icons.access_time_outlined,
                      onTap: _selectTime,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              // Location field
              TextFormField(
                controller: _locationController,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Location',
                  hintText: 'Where will this event take place?',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              // Capacity field
              TextFormField(
                controller: _capacityController,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Capacity (optional)',
                  hintText: 'Maximum number of attendees',
                  prefixIcon: Icon(Icons.people_outline),
                ),
                validator: (value) {
                  if (value != null && value.isNotEmpty) {
                    final capacity = int.tryParse(value);
                    if (capacity == null || capacity < 1) {
                      return 'Please enter a valid number';
                    }
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.xl),
              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          widget.isEditing ? 'Save Changes' : 'Create Event',
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDateTimeButton({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: AppSpacing.borderRadiusMd,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: AppSpacing.borderRadiusMd,
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.textSecondary, size: 20),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                label,
                style: AppTypography.bodyMedium,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
