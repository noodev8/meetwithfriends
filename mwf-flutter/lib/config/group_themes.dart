import 'package:flutter/material.dart';

/// Group theme configuration
/// Matches the web version in mwf-web/src/lib/groupThemes.ts
class GroupTheme {
  final String key;
  final String label;
  final List<Color> gradient;
  final List<Color> gradientLight;
  final Color textColor;
  final Color bgColor;

  const GroupTheme({
    required this.key,
    required this.label,
    required this.gradient,
    required this.gradientLight,
    required this.textColor,
    required this.bgColor,
  });
}

/// All available group themes - matches web version
const Map<String, GroupTheme> groupThemes = {
  'indigo': GroupTheme(
    key: 'indigo',
    label: 'Indigo',
    gradient: [Color(0xFF6366F1), Color(0xFF7C3AED)],
    gradientLight: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
    textColor: Color(0xFF4F46E5),
    bgColor: Color(0xFF6366F1),
  ),
  'emerald': GroupTheme(
    key: 'emerald',
    label: 'Emerald',
    gradient: [Color(0xFF10B981), Color(0xFF0D9488)],
    gradientLight: [Color(0xFFD1FAE5), Color(0xFFCCFBF1)],
    textColor: Color(0xFF059669),
    bgColor: Color(0xFF10B981),
  ),
  'rose': GroupTheme(
    key: 'rose',
    label: 'Rose',
    gradient: [Color(0xFFF43F5E), Color(0xFFEC4899)],
    gradientLight: [Color(0xFFFFE4E6), Color(0xFFFCE7F3)],
    textColor: Color(0xFFE11D48),
    bgColor: Color(0xFFF43F5E),
  ),
  'amber': GroupTheme(
    key: 'amber',
    label: 'Amber',
    gradient: [Color(0xFFF59E0B), Color(0xFFF97316)],
    gradientLight: [Color(0xFFFEF3C7), Color(0xFFFFEDD5)],
    textColor: Color(0xFFD97706),
    bgColor: Color(0xFFF59E0B),
  ),
  'cyan': GroupTheme(
    key: 'cyan',
    label: 'Cyan',
    gradient: [Color(0xFF06B6D4), Color(0xFF3B82F6)],
    gradientLight: [Color(0xFFCFFAFE), Color(0xFFDBEAFE)],
    textColor: Color(0xFF0891B2),
    bgColor: Color(0xFF06B6D4),
  ),
  'violet': GroupTheme(
    key: 'violet',
    label: 'Violet',
    gradient: [Color(0xFF8B5CF6), Color(0xFFA855F7)],
    gradientLight: [Color(0xFFEDE9FE), Color(0xFFF3E8FF)],
    textColor: Color(0xFF7C3AED),
    bgColor: Color(0xFF8B5CF6),
  ),
};

/// Get theme configuration by color key
/// Falls back to indigo if invalid or missing
GroupTheme getGroupTheme(String? color) {
  if (color != null && groupThemes.containsKey(color)) {
    return groupThemes[color]!;
  }
  return groupThemes['indigo']!; // Default fallback
}

/// Generate initials from group name
/// Takes first letter of first two words
/// "Brookfield Socials" → "BS"
/// "Friday Night Dinners" → "FN"
/// "Tech" → "T"
String getGroupInitials(String name) {
  if (name.isEmpty) return '?';

  final words = name.trim().split(RegExp(r'\s+'));
  if (words.length == 1) {
    return words[0][0].toUpperCase();
  }

  return '${words[0][0]}${words[1][0]}'.toUpperCase();
}
