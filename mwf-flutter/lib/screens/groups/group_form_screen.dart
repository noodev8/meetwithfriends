import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/group.dart';
import 'package:meetwithfriends/providers/groups_provider.dart';
import 'package:meetwithfriends/services/groups_service.dart';

class GroupFormScreen extends ConsumerStatefulWidget {
  const GroupFormScreen({this.group, super.key});

  final Group? group;

  bool get isEditing => group != null;

  @override
  ConsumerState<GroupFormScreen> createState() => _GroupFormScreenState();
}

class _GroupFormScreenState extends ConsumerState<GroupFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late String _visibility;

  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.group?.name);
    _descriptionController = TextEditingController(
      text: widget.group?.description,
    );
    _visibility = widget.group?.visibility ?? 'public';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final groupsService = ref.read(groupsServiceProvider);

    final response = widget.isEditing
        ? await groupsService.updateGroup(
            id: widget.group!.id,
            name: _nameController.text,
            description: _descriptionController.text,
            visibility: _visibility,
          )
        : await groupsService.createGroup(
            name: _nameController.text,
            description: _descriptionController.text.isNotEmpty
                ? _descriptionController.text
                : null,
            visibility: _visibility,
          );

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (response.isSuccess) {
      ref.invalidate(myGroupsProvider);
      if (widget.isEditing) {
        ref.invalidate(groupDetailProvider(widget.group!.id));
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.isEditing
                  ? 'Group updated successfully'
                  : 'Group created successfully',
            ),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      }
    } else {
      setState(() {
        _error = response.message ?? 'Failed to save group';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.isEditing ? 'Edit Group' : 'Create Group',
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
              // Name field
              TextFormField(
                controller: _nameController,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Group Name *',
                  hintText: 'Enter a name for your group',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a group name';
                  }
                  if (value.length < 3) {
                    return 'Group name must be at least 3 characters';
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
                  hintText: 'Tell people what your group is about',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              // Visibility selector
              const Text('Visibility', style: AppTypography.labelLarge),
              const SizedBox(height: AppSpacing.sm),
              _buildVisibilityOption(
                value: 'public',
                title: 'Public',
                description: 'Anyone can find and join this group',
                icon: Icons.public,
              ),
              const SizedBox(height: AppSpacing.sm),
              _buildVisibilityOption(
                value: 'unlisted',
                title: 'Unlisted',
                description: 'Only people with the invite link can join',
                icon: Icons.link,
              ),
              const SizedBox(height: AppSpacing.xl),
              // Submit button (for larger screens / accessibility)
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
                          widget.isEditing ? 'Save Changes' : 'Create Group',
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVisibilityOption({
    required String value,
    required String title,
    required String description,
    required IconData icon,
  }) {
    final isSelected = _visibility == value;
    return InkWell(
      onTap: () => setState(() => _visibility = value),
      borderRadius: AppSpacing.borderRadiusMd,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: AppSpacing.borderRadiusMd,
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.05)
              : Colors.transparent,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.labelLarge.copyWith(
                      color: isSelected
                          ? AppColors.primary
                          : AppColors.textPrimary,
                    ),
                  ),
                  Text(description, style: AppTypography.bodySmall),
                ],
              ),
            ),
            Icon(
              isSelected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              color: isSelected ? AppColors.primary : AppColors.textTertiary,
            ),
          ],
        ),
      ),
    );
  }
}
