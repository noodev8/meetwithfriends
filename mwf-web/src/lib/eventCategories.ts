/*
=======================================================================================================================================
Event Categories Configuration
=======================================================================================================================================
Central configuration for event categories, their display properties (emoji, gradient), and labels.
Used by EventCard component and event creation/edit forms.
=======================================================================================================================================
*/

export type EventCategory = 'food' | 'outdoor' | 'games' | 'coffee' | 'arts' | 'learning' | 'other';

export interface CategoryConfig {
    key: EventCategory;
    label: string;
    emoji: string;
    gradient: string;
}

// Category configuration with display properties
export const EVENT_CATEGORIES: Record<EventCategory, CategoryConfig> = {
    food: {
        key: 'food',
        label: 'Dining',
        emoji: '🍽️',
        gradient: 'from-indigo-500 via-purple-400 to-pink-300',
    },
    outdoor: {
        key: 'outdoor',
        label: 'Outdoor',
        emoji: '🥾',
        gradient: 'from-emerald-500 via-teal-400 to-cyan-300',
    },
    games: {
        key: 'games',
        label: 'Games',
        emoji: '🎱',
        gradient: 'from-red-500 via-rose-400 to-orange-300',
    },
    coffee: {
        key: 'coffee',
        label: 'Coffee',
        emoji: '☕',
        gradient: 'from-amber-500 via-orange-400 to-yellow-300',
    },
    arts: {
        key: 'arts',
        label: 'Arts',
        emoji: '🎨',
        gradient: 'from-rose-500 via-pink-400 to-fuchsia-300',
    },
    learning: {
        key: 'learning',
        label: 'Learning',
        emoji: '📚',
        gradient: 'from-blue-500 via-indigo-400 to-violet-300',
    },
    other: {
        key: 'other',
        label: 'Other',
        emoji: '✨',
        gradient: 'from-slate-500 via-gray-400 to-zinc-300',
    },
};

// Get category config with fallback to 'other'
export function getCategoryConfig(category?: string | null): CategoryConfig {
    if (category && category in EVENT_CATEGORIES) {
        return EVENT_CATEGORIES[category as EventCategory];
    }
    return EVENT_CATEGORIES.other;
}

// List of categories for form selectors (in display order)
export const CATEGORY_OPTIONS: CategoryConfig[] = [
    EVENT_CATEGORIES.food,
    EVENT_CATEGORIES.outdoor,
    EVENT_CATEGORIES.games,
    EVENT_CATEGORIES.coffee,
    EVENT_CATEGORIES.arts,
    EVENT_CATEGORIES.learning,
    EVENT_CATEGORIES.other,
];
