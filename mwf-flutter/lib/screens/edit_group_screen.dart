import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:html/parser.dart' as html_parser;
import '../services/groups_service.dart';
import '../widgets/bottom_nav_bar.dart';

class EditGroupScreen extends StatefulWidget {
  final int groupId;
  final String initialName;
  final String? initialDescription;
  final String initialThemeColor;
  final String initialJoinPolicy;
  final String initialVisibility;
  final bool initialRequireProfileImage;
  final VoidCallback? onGroupUpdated;

  const EditGroupScreen({
    super.key,
    required this.groupId,
    required this.initialName,
    this.initialDescription,
    required this.initialThemeColor,
    required this.initialJoinPolicy,
    required this.initialVisibility,
    this.initialRequireProfileImage = false,
    this.onGroupUpdated,
  });

  @override
  State<EditGroupScreen> createState() => _EditGroupScreenState();
}

class _EditGroupScreenState extends State<EditGroupScreen> {
  final GroupsService _groupsService = GroupsService();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _descriptionController;

  late String _selectedTheme;
  late String _joinPolicy;
  late String _visibility;
  late bool _requireProfileImage;

  bool _isSubmitting = false;
  String? _error;

  static const List<Map<String, dynamic>> _themeOptions = [
    {'key': 'indigo', 'color': Color(0xFF6366F1), 'label': 'Indigo'},
    {'key': 'emerald', 'color': Color(0xFF10B981), 'label': 'Emerald'},
    {'key': 'rose', 'color': Color(0xFFF43F5E), 'label': 'Rose'},
    {'key': 'amber', 'color': Color(0xFFF59E0B), 'label': 'Amber'},
    {'key': 'cyan', 'color': Color(0xFF06B6D4), 'label': 'Cyan'},
    {'key': 'violet', 'color': Color(0xFF8B5CF6), 'label': 'Violet'},
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _descriptionController = TextEditingController(text: _stripHtml(widget.initialDescription ?? ''));
    _selectedTheme = widget.initialThemeColor;
    _joinPolicy = widget.initialJoinPolicy;
    _visibility = widget.initialVisibility;
    _requireProfileImage = widget.initialRequireProfileImage;
  }

  /// Strip HTML tags from description using proper HTML parser
  String _stripHtml(String htmlString) {
    if (htmlString.isEmpty) return '';
    final document = html_parser.parse(htmlString);
    return document.body?.text ?? '';
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
      _isSubmitting = true;
      _error = null;
    });

    final result = await _groupsService.updateGroup(
      groupId: widget.groupId,
      name: _nameController.text.trim(),
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      themeColor: _selectedTheme,
      joinPolicy: _joinPolicy,
      visibility: _visibility,
      requireProfileImage: _requireProfileImage,
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    if (result.success) {
      widget.onGroupUpdated?.call();
      Navigator.of(context).pop();
    } else {
      setState(() => _error = result.error ?? 'Failed to update group');
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFFAFAFC),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Back button
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: GestureDetector(
                          onTap: () => Navigator.of(context).pop(),
                          behavior: HitTestBehavior.opaque,
                          child: Row(
                            children: [
                              const Icon(Icons.arrow_back_rounded, color: Color(0xFF1E293B)),
                              const SizedBox(width: 8),
                              Text(
                                widget.initialName,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
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

                    // Main form card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Group Name
                          _buildLabel('Group Name', required: true),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _nameController,
                            decoration: _inputDecoration('e.g., Brookfield Socials'),
                            maxLength: 100,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Group name is required';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Description
                          _buildLabel('Description'),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _descriptionController,
                            decoration: _inputDecoration('Tell people what your group is about...'),
                            maxLines: 4,
                          ),
                          const SizedBox(height: 24),

                          // Theme Color
                          _buildLabel('Theme Color'),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: _themeOptions.map((theme) {
                              final isSelected = _selectedTheme == theme['key'];
                              return GestureDetector(
                                onTap: () => setState(() => _selectedTheme = theme['key']),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: theme['color'],
                                    borderRadius: BorderRadius.circular(12),
                                    border: isSelected
                                        ? Border.all(color: const Color(0xFF1E293B), width: 3)
                                        : null,
                                    boxShadow: isSelected
                                        ? [
                                            BoxShadow(
                                              color: (theme['color'] as Color).withAlpha(128),
                                              blurRadius: 8,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: isSelected
                                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 24)
                                      : null,
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Join Policy card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('Join Policy'),
                          const SizedBox(height: 12),
                          _buildRadioOption(
                            value: 'approval',
                            groupValue: _joinPolicy,
                            onChanged: (v) => setState(() => _joinPolicy = v!),
                            title: 'Require Approval',
                            subtitle: 'New members must be approved by an organiser',
                          ),
                          const SizedBox(height: 8),
                          _buildRadioOption(
                            value: 'auto',
                            groupValue: _joinPolicy,
                            onChanged: (v) => setState(() => _joinPolicy = v!),
                            title: 'Auto Approve',
                            subtitle: 'Anyone can join immediately',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Visibility card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('Visibility'),
                          const SizedBox(height: 12),
                          _buildRadioOption(
                            value: 'listed',
                            groupValue: _visibility,
                            onChanged: (v) => setState(() => _visibility = v!),
                            title: 'Listed',
                            subtitle: 'Anyone can find and join your group',
                          ),
                          const SizedBox(height: 8),
                          _buildRadioOption(
                            value: 'unlisted',
                            groupValue: _visibility,
                            onChanged: (v) => setState(() => _visibility = v!),
                            title: 'Unlisted',
                            subtitle: 'Only people with the invite link can join',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Require Profile Image card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: GestureDetector(
                        onTap: () => setState(() => _requireProfileImage = !_requireProfileImage),
                        behavior: HitTestBehavior.opaque,
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Require Profile Image',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF1E293B),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Members must have a profile photo before they can join',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Switch(
                              value: _requireProfileImage,
                              onChanged: (value) => setState(() => _requireProfileImage = value),
                              activeTrackColor: const Color(0xFF7C3AED).withValues(alpha: 0.5),
                              activeThumbColor: const Color(0xFF7C3AED),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Submit button
                    Container(
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
                                'Save Changes',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
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

  Widget _buildRadioOption({
    required String value,
    required String groupValue,
    required ValueChanged<String?> onChanged,
    required String title,
    required String subtitle,
  }) {
    final isSelected = value == groupValue;

    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF5F3FF) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            RadioGroup<String>(
              groupValue: groupValue,
              onChanged: onChanged,
              child: Radio<String>(
                value: value,
                activeColor: const Color(0xFF7C3AED),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
