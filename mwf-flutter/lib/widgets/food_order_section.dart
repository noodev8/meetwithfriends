import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/services/events_service.dart';

class FoodOrderSection extends ConsumerStatefulWidget {
  const FoodOrderSection({
    required this.eventId,
    required this.canOrder,
    this.initialFoodOrder,
    this.initialDietaryNotes,
    super.key,
  });

  final int eventId;
  final bool canOrder;
  final String? initialFoodOrder;
  final String? initialDietaryNotes;

  @override
  ConsumerState<FoodOrderSection> createState() => _FoodOrderSectionState();
}

class _FoodOrderSectionState extends ConsumerState<FoodOrderSection> {
  late final TextEditingController _foodOrderController;
  late final TextEditingController _dietaryNotesController;
  bool _isSubmitting = false;
  bool _hasSubmitted = false;

  @override
  void initState() {
    super.initState();
    _foodOrderController = TextEditingController(
      text: widget.initialFoodOrder,
    );
    _dietaryNotesController = TextEditingController(
      text: widget.initialDietaryNotes,
    );
    _hasSubmitted = widget.initialFoodOrder != null ||
        widget.initialDietaryNotes != null;
  }

  @override
  void dispose() {
    _foodOrderController.dispose();
    _dietaryNotesController.dispose();
    super.dispose();
  }

  Future<void> _submitOrder() async {
    setState(() => _isSubmitting = true);

    final eventsService = ref.read(eventsServiceProvider);
    final response = await eventsService.submitOrder(
      eventId: widget.eventId,
      foodOrder: _foodOrderController.text.trim().isEmpty
          ? null
          : _foodOrderController.text.trim(),
      dietaryNotes: _dietaryNotesController.text.trim().isEmpty
          ? null
          : _dietaryNotesController.text.trim(),
    );

    setState(() => _isSubmitting = false);

    if (response.isSuccess) {
      setState(() => _hasSubmitted = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order submitted successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response.message ?? 'Failed to submit order'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.canOrder) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.1),
                    borderRadius: AppSpacing.borderRadiusSm,
                  ),
                  child: const Icon(
                    Icons.restaurant_menu,
                    color: AppColors.secondary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Pre-order Your Meal', style: AppTypography.h4),
                      Text(
                        'Submit your food preferences',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_hasSubmitted)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.1),
                      borderRadius: AppSpacing.borderRadiusSm,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.check,
                          color: AppColors.success,
                          size: 14,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Submitted',
                          style: AppTypography.labelSmall.copyWith(
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // Food order input
            TextField(
              controller: _foodOrderController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Your Order',
                hintText: 'e.g., Roast beef, medium rare',
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: AppSpacing.md),

            // Dietary notes input
            TextField(
              controller: _dietaryNotesController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Dietary Requirements (Optional)',
                hintText: 'e.g., Gluten free, vegetarian',
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: AppSpacing.lg),

            // Submit button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitOrder,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(_hasSubmitted ? 'Update Order' : 'Submit Order'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
