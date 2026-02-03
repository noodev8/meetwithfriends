import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/user.dart';
import '../services/invite_service.dart';
import '../services/user_service.dart';
import 'event_detail_screen.dart';
import 'group_dashboard_screen.dart';

enum _InviteStep { loading, intro, signup, photoUpload, processing, redirecting, error }

class InviteScreen extends StatefulWidget {
  final String token;
  final String type; // 'e' or 'g'
  final bool isLoggedIn;
  final User? user;
  final Function(Map<String, dynamic> userData, String token)? onAuthSuccess;
  final VoidCallback? onNavigateToLogin;

  const InviteScreen({
    super.key,
    required this.token,
    required this.type,
    required this.isLoggedIn,
    this.user,
    this.onAuthSuccess,
    this.onNavigateToLogin,
  });

  @override
  State<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends State<InviteScreen> {
  final _inviteService = InviteService();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  _InviteStep _step = _InviteStep.loading;
  InviteData? _inviteData;
  String? _errorCode;
  int? _errorGroupId;
  String? _signupError;
  bool _isAccepting = false;
  bool _isSubmitting = false;
  bool _agreedToTerms = false;

  // Photo upload state
  String? _avatarUrl;
  bool _isUploadingPhoto = false;
  File? _photoFile;
  bool _signupPendingPhoto = false; // True = new user signup flow, False = logged-in user flow
  final _imagePicker = ImagePicker();

  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()
      ..onTap = () => _openUrl('https://meetwithfriends.net/terms');
    _privacyRecognizer = TapGestureRecognizer()
      ..onTap = () => _openUrl('https://meetwithfriends.net/privacy');
    _validateInvite();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    super.dispose();
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _validateInvite() async {
    final result = await _inviteService.validateInvite(widget.token);
    if (!mounted) return;

    if (result.success && result.data != null) {
      setState(() {
        _inviteData = result.data;
        _step = _InviteStep.intro;
      });
    } else {
      setState(() {
        _errorCode = result.returnCode ?? 'INVITE_NOT_FOUND';
        _step = _InviteStep.error;
      });
    }
  }

  Future<void> _handleAccept() async {
    if (widget.isLoggedIn) {
      // Check if photo is required and user doesn't have one
      final requirePhoto = _inviteData?.invite.group.requireProfileImage ?? false;
      final hasPhoto = _inviteData?.userStatus?.hasProfileImage ?? false;
      if (requirePhoto && !hasPhoto && _avatarUrl == null) {
        setState(() {
          _signupPendingPhoto = false;
          _step = _InviteStep.photoUpload;
        });
        return;
      }

      setState(() => _isAccepting = true);
      final result = await _inviteService.acceptInvite(widget.token);
      if (!mounted) return;

      if (result.success) {
        _navigateToResult(result.redirectType, result.redirectId);
      } else if (result.returnCode == 'PROFILE_IMAGE_REQUIRED') {
        // Handle edge case where group setting changed between validation and acceptance
        setState(() {
          _isAccepting = false;
          _signupPendingPhoto = false;
          _step = _InviteStep.photoUpload;
        });
      } else {
        setState(() {
          _isAccepting = false;
          _errorCode = result.returnCode;
          _errorGroupId = _inviteData?.invite.group.id;
          _step = _InviteStep.error;
        });
      }
    } else {
      setState(() => _step = _InviteStep.signup);
    }
  }

  Future<void> _handleSignup() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      setState(() => _signupError = 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setState(() => _signupError = 'Password must be at least 8 characters');
      return;
    }

    if (!_agreedToTerms) {
      setState(() => _signupError = 'Please agree to the Terms and Conditions');
      return;
    }

    await _submitSignup();
  }

  Future<void> _submitSignup() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    setState(() {
      _isSubmitting = true;
      _signupError = null;
    });

    final result = await _inviteService.acceptWithSignup(
      widget.token,
      name,
      email,
      password,
      avatarUrl: _avatarUrl,
    );
    if (!mounted) return;

    if (result.success && result.token != null && result.user != null) {
      widget.onAuthSuccess?.call(result.user!, result.token!);
      _navigateToResult(result.redirectType, result.redirectId);
    } else if (result.returnCode == 'PROFILE_IMAGE_REQUIRED') {
      // Backend validated credentials successfully but needs a photo.
      // Redirect to photo upload step, then re-submit with avatar URL.
      setState(() {
        _isSubmitting = false;
        _signupPendingPhoto = true;
        _step = _InviteStep.photoUpload;
      });
    } else {
      setState(() {
        _isSubmitting = false;
        _signupError = result.error ?? 'Signup failed';
        // For invite-level errors, go to error screen
        if (_isInviteError(result.returnCode)) {
          _errorCode = result.returnCode;
          _errorGroupId = _inviteData?.invite.group.id;
          _step = _InviteStep.error;
        }
      });
    }
  }

  bool _isInviteError(String? code) {
    const inviteErrors = {
      'INVITE_NOT_FOUND',
      'INVITE_EXPIRED',
      'INVITE_DISABLED',
      'INVITE_LIMIT_REACHED',
      'EVENT_ENDED',
      'EVENT_CANCELLED',
    };
    return inviteErrors.contains(code);
  }

  void _navigateToResult(String? redirectType, int? redirectId) {
    if (!mounted || redirectId == null) return;

    setState(() => _step = _InviteStep.redirecting);

    final navigator = Navigator.of(context);

    if (redirectType == 'events') {
      navigator.pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (context) => EventDetailScreen(
            eventId: redirectId,
            onBack: () => Navigator.of(context).pop(),
          ),
        ),
        (route) => route.isFirst,
      );
    } else {
      navigator.pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (context) => GroupDashboardScreen(
            groupId: redirectId,
            onBack: () => Navigator.of(context).pop(),
          ),
        ),
        (route) => route.isFirst,
      );
    }
  }

  void _handleLoginRedirect() {
    widget.onNavigateToLogin?.call();
  }

  // --- Helpers ---

  static String stripHtml(String html, {int maxLength = 120}) {
    final stripped = html.replaceAll(RegExp(r'<[^>]*>'), '').trim();
    if (stripped.length <= maxLength) return stripped;
    return '${stripped.substring(0, maxLength)}...';
  }

  String _formatDate(String? dateTime) {
    if (dateTime == null) return '';
    try {
      final dt = DateTime.parse(dateTime);
      return DateFormat('EEEE, d MMMM yyyy').format(dt);
    } catch (_) {
      return dateTime;
    }
  }

  String _formatTime(String? dateTime) {
    if (dateTime == null) return '';
    try {
      final dt = DateTime.parse(dateTime);
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return '';
    }
  }

  // --- Build ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: SafeArea(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    switch (_step) {
      case _InviteStep.loading:
      case _InviteStep.redirecting:
        return _buildLoading();
      case _InviteStep.intro:
        return _buildIntro();
      case _InviteStep.signup:
        return _buildSignup();
      case _InviteStep.photoUpload:
        return _buildPhotoUpload();
      case _InviteStep.processing:
        return _buildLoading();
      case _InviteStep.error:
        return _buildError();
    }
  }

  Widget _buildLoading() {
    return const Center(
      child: CircularProgressIndicator(
        color: Color(0xFF7C3AED),
      ),
    );
  }

  // --- Intro View ---

  Widget _buildIntro() {
    final data = _inviteData!;
    final isEvent = data.type == 'event';
    final title = isEvent
        ? (data.invite.event?.title ?? data.invite.group.name)
        : data.invite.group.name;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 400;

        return Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(isSmall ? 16.0 : 24.0),
            child: Container(
              width: double.infinity,
              constraints:
                  BoxConstraints(maxWidth: constraints.maxWidth < 600 ? double.infinity : 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Title
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: isSmall ? 24.0 : 28.0,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Invited by
                  Text.rich(
                    TextSpan(
                      text: data.invite.inviterName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                      ),
                      children: [
                        TextSpan(
                          text: ' has invited you to join ${isEvent ? 'an event' : 'a group'}',
                          style: const TextStyle(fontWeight: FontWeight.normal),
                        ),
                      ],
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),

                  // Details card
                  _buildDetailsCard(data, isSmall),
                  const SizedBox(height: 24),

                  // Action section
                  _buildActionSection(data, isSmall),
                  const SizedBox(height: 32),

                  // Footer
                  const Text(
                    'Powered by Meet With Friends',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailsCard(InviteData data, bool isSmall) {
    final isEvent = data.type == 'event';

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isSmall ? 16.0 : 20.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: isEvent ? _buildEventDetails(data) : _buildGroupDetails(data),
    );
  }

  Widget _buildEventDetails(InviteData data) {
    final event = data.invite.event;
    if (event == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Group name
        Row(
          children: [
            const Icon(Icons.restaurant, size: 16, color: Color(0xFF64748B)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                data.invite.group.name,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Date & time
        if (event.dateTime != null) ...[
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _formatDate(event.dateTime),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF1E293B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.access_time, size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 8),
              Text(
                _formatTime(event.dateTime),
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],

        // Location
        if (event.location != null) ...[
          Row(
            children: [
              const Icon(Icons.location_on, size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  event.location!,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF1E293B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],

        // Spots remaining
        if (event.spotsRemaining != null) ...[
          Row(
            children: [
              const Icon(Icons.people, size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 8),
              Text(
                '${event.spotsRemaining} spots remaining',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildGroupDetails(InviteData data) {
    final group = data.invite.group;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Member count
        Row(
          children: [
            const Icon(Icons.people, size: 16, color: Color(0xFF64748B)),
            const SizedBox(width: 8),
            Text(
              '${group.memberCount} members',
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF1E293B),
              ),
            ),
          ],
        ),

        // Description
        if (group.description != null && group.description!.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            stripHtml(group.description!),
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildActionSection(InviteData data, bool isSmall) {
    final isEvent = data.type == 'event';
    final userStatus = data.userStatus;

    // Already a member/attending
    if (widget.isLoggedIn && userStatus != null) {
      if (isEvent && userStatus.isEventRsvp) {
        return _buildAlreadyMember("You're already attending this event", isEvent);
      }
      if (!isEvent && userStatus.isGroupMember) {
        return _buildAlreadyMember("You're already a member of this group", isEvent);
      }
    }

    return Column(
      children: [
        // Logged-in user info
        if (widget.isLoggedIn && widget.user != null) ...[
          Text(
            'Joining as ${widget.user!.name}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Accept button
        SizedBox(
          width: double.infinity,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              gradient: const LinearGradient(
                colors: [Color(0xFFF43F5E), Color(0xFFFB923C)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
            ),
            child: ElevatedButton(
              onPressed: _isAccepting ? null : _handleAccept,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                disabledBackgroundColor: Colors.transparent,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: _isAccepting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(
                      "Let's take a look",
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAlreadyMember(String message, bool isEvent) {
    return Column(
      children: [
        Text(
          message,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              gradient: const LinearGradient(
                colors: [Color(0xFF7C3AED), Color(0xFF6366F1)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
            ),
            child: ElevatedButton(
              onPressed: () {
                if (isEvent && _inviteData?.invite.event != null) {
                  _navigateToResult('events', _inviteData!.invite.event!.id);
                } else {
                  _navigateToResult('groups', _inviteData!.invite.group.id);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                isEvent ? 'View Event' : 'View Group',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // --- Signup View ---

  Widget _buildSignup() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 400;
        final padding = isSmall ? 16.0 : 24.0;
        final cardPadding = isSmall ? 20.0 : 32.0;
        final maxCardWidth = constraints.maxWidth < 600 ? double.infinity : 400.0;

        return Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(padding),
            child: Container(
              width: double.infinity,
              constraints: BoxConstraints(maxWidth: maxCardWidth),
              padding: EdgeInsets.all(cardPadding),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Back button
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Color(0xFF64748B)),
                      onPressed: () => setState(() => _step = _InviteStep.intro),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Heading
                  Text(
                    'Create Your Account',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: isSmall ? 20.0 : 24.0,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1E293B),
                    ),
                  ),
                  SizedBox(height: isSmall ? 20 : 24),

                  // Error message
                  if (_signupError != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Text(
                            _signupError!,
                            style: const TextStyle(
                              color: Color(0xFFDC2626),
                              fontSize: 14,
                            ),
                          ),
                          if (_signupError!.contains('EMAIL_EXISTS') ||
                              _signupError!.contains('already exists')) ...[
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: _handleLoginRedirect,
                              child: const Text(
                                'Log in instead',
                                style: TextStyle(
                                  color: Color(0xFF6366F1),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Name label & field
                  const Text(
                    'Name',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.words,
                    enabled: !_isSubmitting,
                    decoration: _inputDecoration('Your name'),
                  ),
                  SizedBox(height: isSmall ? 16 : 20),

                  // Email label & field
                  const Text(
                    'Email',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    enabled: !_isSubmitting,
                    decoration: _inputDecoration('you@example.com'),
                  ),
                  SizedBox(height: isSmall ? 16 : 20),

                  // Password label & field
                  const Text(
                    'Password',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    enabled: !_isSubmitting,
                    decoration: _inputDecoration('Min. 8 characters'),
                  ),
                  SizedBox(height: isSmall ? 16 : 20),

                  // Terms checkbox
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: Checkbox(
                          value: _agreedToTerms,
                          onChanged: _isSubmitting
                              ? null
                              : (value) {
                                  setState(() {
                                    _agreedToTerms = value ?? false;
                                  });
                                },
                          activeColor: const Color(0xFF7C3AED),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            text: 'I agree to the ',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF64748B),
                            ),
                            children: [
                              TextSpan(
                                text: 'Terms of Service',
                                style: const TextStyle(
                                  color: Color(0xFF6366F1),
                                  fontWeight: FontWeight.w500,
                                ),
                                recognizer: _termsRecognizer,
                              ),
                              const TextSpan(text: ' and '),
                              TextSpan(
                                text: 'Privacy Policy',
                                style: const TextStyle(
                                  color: Color(0xFF6366F1),
                                  fontWeight: FontWeight.w500,
                                ),
                                recognizer: _privacyRecognizer,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: isSmall ? 20 : 24),

                  // Submit button
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF43F5E), Color(0xFFFB923C)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                    ),
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _handleSignup,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        disabledBackgroundColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'Create Account & Join',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                  SizedBox(height: isSmall ? 16 : 20),

                  // Login link
                  Wrap(
                    alignment: WrapAlignment.center,
                    children: [
                      const Text(
                        'Already have an account? ',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      TextButton(
                        onPressed: _isSubmitting ? null : _handleLoginRedirect,
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Log in',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF6366F1),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // --- Photo Upload View ---

  Widget _buildPhotoUpload() {
    final groupName = _inviteData?.invite.group.name ?? 'This group';

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 400;
        final padding = isSmall ? 16.0 : 24.0;
        final cardPadding = isSmall ? 20.0 : 32.0;
        final maxCardWidth = constraints.maxWidth < 600 ? double.infinity : 400.0;

        return Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(padding),
            child: Container(
              width: double.infinity,
              constraints: BoxConstraints(maxWidth: maxCardWidth),
              padding: EdgeInsets.all(cardPadding),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Back button
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Color(0xFF64748B)),
                      onPressed: _isUploadingPhoto
                          ? null
                          : () {
                              setState(() {
                                _step = _signupPendingPhoto
                                    ? _InviteStep.signup
                                    : _InviteStep.intro;
                              });
                            },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Heading
                  Text(
                    'One more thing...',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: isSmall ? 20.0 : 24.0,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Subtitle
                  Text(
                    '$groupName requires members to have a profile photo',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Avatar placeholder / preview
                  Center(
                    child: GestureDetector(
                      onTap: _isUploadingPhoto ? null : _handlePickPhoto,
                      child: Stack(
                        children: [
                          Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFFF1F5F9),
                              border: Border.all(
                                color: const Color(0xFFE2E8F0),
                                width: 2,
                              ),
                              image: _photoFile != null
                                  ? DecorationImage(
                                      image: FileImage(_photoFile!),
                                      fit: BoxFit.cover,
                                    )
                                  : null,
                            ),
                            child: _photoFile == null
                                ? const Icon(
                                    Icons.person,
                                    size: 48,
                                    color: Color(0xFF94A3B8),
                                  )
                                : null,
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: const Color(0xFF7C3AED),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2,
                                ),
                              ),
                              child: const Icon(
                                Icons.camera_alt,
                                size: 18,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Tap to add hint
                  if (_photoFile == null)
                    const Text(
                      'Tap to add a photo',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF94A3B8),
                      ),
                    ),

                  // Error message
                  if (_signupError != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _signupError!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFFDC2626),
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 32),

                  // Continue button
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      gradient: _photoFile != null && !_isUploadingPhoto
                          ? const LinearGradient(
                              colors: [Color(0xFFF43F5E), Color(0xFFFB923C)],
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            )
                          : null,
                      color: _photoFile == null || _isUploadingPhoto
                          ? const Color(0xFFE2E8F0)
                          : null,
                    ),
                    child: ElevatedButton(
                      onPressed: _photoFile != null && !_isUploadingPhoto
                          ? _handleUploadAndContinue
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        disabledBackgroundColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isUploadingPhoto
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              'Continue',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: _photoFile != null
                                    ? Colors.white
                                    : const Color(0xFF94A3B8),
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _handlePickPhoto() {
    showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Choose Photo',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF7C3AED).withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.camera_alt_rounded,
                    color: Color(0xFF7C3AED),
                  ),
                ),
                title: const Text(
                  'Take Photo',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1E293B),
                  ),
                ),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF7C3AED).withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.photo_library_rounded,
                    color: Color(0xFF7C3AED),
                  ),
                ),
                title: const Text(
                  'Choose from Gallery',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1E293B),
                  ),
                ),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    ).then((source) async {
      if (source == null) return;

      try {
        final XFile? pickedFile = await _imagePicker.pickImage(
          source: source,
          maxWidth: 800,
          maxHeight: 800,
          imageQuality: 85,
        );

        if (pickedFile == null || !mounted) return;

        setState(() {
          _photoFile = File(pickedFile.path);
          _signupError = null;
        });
      } catch (e) {
        if (!mounted) return;
        setState(() => _signupError = 'Failed to pick image');
      }
    });
  }

  Future<void> _handleUploadAndContinue() async {
    if (_photoFile == null) return;

    setState(() {
      _isUploadingPhoto = true;
      _signupError = null;
    });

    try {
      // Upload to Cloudinary directly (same pattern as UserService)
      const cloudinaryCloudName = 'dnrevr0pi';
      const cloudinaryUploadPreset = 'meetwithfriends';
      const cloudinaryFolder = 'mwf-avatars';

      final fileSize = await _photoFile!.length();
      if (fileSize > 5 * 1024 * 1024) {
        if (!mounted) return;
        setState(() {
          _isUploadingPhoto = false;
          _signupError = 'Image must be less than 5MB';
        });
        return;
      }

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          _photoFile!.path,
          filename: 'avatar.jpg',
        ),
        'upload_preset': cloudinaryUploadPreset,
        'folder': cloudinaryFolder,
      });

      final dio = Dio();
      final response = await dio.post(
        'https://api.cloudinary.com/v1_1/$cloudinaryCloudName/image/upload',
        data: formData,
      );

      if (!mounted) return;

      if (response.statusCode != 200) {
        setState(() {
          _isUploadingPhoto = false;
          _signupError = 'Failed to upload image';
        });
        return;
      }

      final secureUrl = response.data['secure_url'] as String;
      _avatarUrl = secureUrl.replaceFirst(
        '/upload/',
        '/upload/w_200,h_200,c_fill,g_face,q_auto/',
      );

      if (_signupPendingPhoto) {
        // New user signup flow: call acceptWithSignup with avatar URL
        await _submitSignup();
      } else {
        // Logged-in user flow: save avatar to profile first, then accept invite
        final userService = UserService();
        final uploadResult = await userService.uploadAvatar(
          _photoFile!,
        );

        if (!mounted) return;

        if (uploadResult.success && uploadResult.user != null) {
          // Accept the invite now that user has a profile photo
          setState(() => _isAccepting = true);
          final acceptResult = await _inviteService.acceptInvite(widget.token);

          if (!mounted) return;

          if (acceptResult.success) {
            _navigateToResult(acceptResult.redirectType, acceptResult.redirectId);
          } else {
            setState(() {
              _isUploadingPhoto = false;
              _isAccepting = false;
              _errorCode = acceptResult.returnCode;
              _errorGroupId = _inviteData?.invite.group.id;
              _step = _InviteStep.error;
            });
          }
        } else {
          setState(() {
            _isUploadingPhoto = false;
            _signupError = uploadResult.error ?? 'Failed to upload photo';
          });
        }
      }
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _isUploadingPhoto = false;
        _signupError = e.message ?? 'Failed to upload image';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isUploadingPhoto = false;
        _signupError = 'Failed to upload image';
      });
    }
  }

  // --- Error View ---

  Widget _buildError() {
    final errorInfo = _getErrorInfo(_errorCode);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 400;

        return Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(isSmall ? 16.0 : 24.0),
            child: Container(
              width: double.infinity,
              constraints: BoxConstraints(
                  maxWidth: constraints.maxWidth < 600 ? double.infinity : 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Error icon
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Color(0xFFDC2626),
                  ),
                  const SizedBox(height: 24),

                  // Error card
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.all(isSmall ? 20.0 : 24.0),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        Text(
                          errorInfo.$1,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: isSmall ? 18.0 : 20.0,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          errorInfo.$2,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // View Group button for ended/cancelled events
                  if ((_errorCode == 'EVENT_ENDED' ||
                          _errorCode == 'EVENT_CANCELLED') &&
                      _errorGroupId != null) ...[
                    SizedBox(
                      width: double.infinity,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF7C3AED), Color(0xFF6366F1)],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                        ),
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (context) => GroupDashboardScreen(
                                  groupId: _errorGroupId!,
                                ),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text(
                            'View Group',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Go Home button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Go Home',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  (String, String) _getErrorInfo(String? code) {
    switch (code) {
      case 'INVITE_NOT_FOUND':
        return (
          'Invitation Not Found',
          'This invitation link is no longer valid. It may have been removed or the URL is incorrect.',
        );
      case 'INVITE_EXPIRED':
        return (
          'Invitation Expired',
          'This invitation link has expired. Please ask the admin for a new invite link.',
        );
      case 'INVITE_DISABLED':
        return (
          'Invitation Disabled',
          'This invitation link has been disabled by the admin.',
        );
      case 'INVITE_LIMIT_REACHED':
        return (
          'Invitation Limit Reached',
          'This invitation link has reached its maximum number of uses.',
        );
      case 'EVENT_ENDED':
        return (
          'Event Has Ended',
          'This event has already happened. You can still view the group.',
        );
      case 'EVENT_CANCELLED':
        return (
          'Event Cancelled',
          'This event has been cancelled. You can still view the group.',
        );
      case 'PROFILE_IMAGE_REQUIRED':
        return (
          'Profile Photo Required',
          'This group requires members to have a profile photo. Please add one to your profile first.',
        );
      default:
        return (
          'Something Went Wrong',
          'An unexpected error occurred. Please try again later.',
        );
    }
  }

  // --- Input Decoration (matches RegisterScreen) ---

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 14,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(
          color: Color(0xFF7C3AED),
          width: 2,
        ),
      ),
    );
  }
}
