import 'package:flutter/material.dart';

/// Event category types matching the backend/web
enum EventCategory {
  food,
  outdoor,
  games,
  coffee,
  arts,
  learning,
  other,
}

/// Configuration for each event category
class CategoryConfig {
  final EventCategory key;
  final String label;
  final IconData icon;
  final List<Color> gradient;

  const CategoryConfig({
    required this.key,
    required this.label,
    required this.icon,
    required this.gradient,
  });
}

/// Central configuration for all event categories
/// Matches the web app's eventCategories.ts
const Map<EventCategory, CategoryConfig> eventCategories = {
  EventCategory.food: CategoryConfig(
    key: EventCategory.food,
    label: 'Dining',
    icon: Icons.restaurant_rounded,
    gradient: [Color(0xFF6366F1), Color(0xFFA855F7), Color(0xFFF472B6)],
  ),
  EventCategory.outdoor: CategoryConfig(
    key: EventCategory.outdoor,
    label: 'Outdoor',
    icon: Icons.hiking_rounded,
    gradient: [Color(0xFF10B981), Color(0xFF2DD4BF), Color(0xFF22D3EE)],
  ),
  EventCategory.games: CategoryConfig(
    key: EventCategory.games,
    label: 'Games',
    icon: Icons.sports_esports_rounded,
    gradient: [Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFF6366F1)],
  ),
  EventCategory.coffee: CategoryConfig(
    key: EventCategory.coffee,
    label: 'Coffee',
    icon: Icons.coffee_rounded,
    gradient: [Color(0xFFF59E0B), Color(0xFFFB923C), Color(0xFFFBBF24)],
  ),
  EventCategory.arts: CategoryConfig(
    key: EventCategory.arts,
    label: 'Arts',
    icon: Icons.palette_rounded,
    gradient: [Color(0xFFF43F5E), Color(0xFFEC4899), Color(0xFFD946EF)],
  ),
  EventCategory.learning: CategoryConfig(
    key: EventCategory.learning,
    label: 'Learning',
    icon: Icons.menu_book_rounded,
    gradient: [Color(0xFF3B82F6), Color(0xFF6366F1), Color(0xFF8B5CF6)],
  ),
  EventCategory.other: CategoryConfig(
    key: EventCategory.other,
    label: 'Other',
    icon: Icons.auto_awesome_rounded,
    gradient: [Color(0xFF64748B), Color(0xFF94A3B8), Color(0xFFCBD5E1)],
  ),
};

/// Get category config from string with fallback to 'other'
CategoryConfig getCategoryConfig(String? category) {
  if (category == null || category.isEmpty) {
    return eventCategories[EventCategory.other]!;
  }

  try {
    final enumValue = EventCategory.values.firstWhere(
      (e) => e.name == category.toLowerCase(),
    );
    return eventCategories[enumValue]!;
  } catch (_) {
    return eventCategories[EventCategory.other]!;
  }
}

/// List of categories for form selectors
final List<CategoryConfig> categoryOptions = [
  eventCategories[EventCategory.food]!,
  eventCategories[EventCategory.outdoor]!,
  eventCategories[EventCategory.games]!,
  eventCategories[EventCategory.coffee]!,
  eventCategories[EventCategory.arts]!,
  eventCategories[EventCategory.learning]!,
  eventCategories[EventCategory.other]!,
];
