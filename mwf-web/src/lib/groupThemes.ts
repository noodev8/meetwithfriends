/*
=======================================================================================================================================
Group Themes Configuration
=======================================================================================================================================
Centralized configuration for group visual customization - colors and gradients.
Auto-generated initials from group name (e.g., "Brookfield Socials" → "BS").
Similar pattern to eventCategories.ts for consistency.
=======================================================================================================================================
*/

// Valid theme color keys
export type GroupThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet';

// Theme configuration interface
export interface GroupTheme {
    key: GroupThemeColor;
    label: string;
    gradient: string;       // Full gradient for hero sections (darker)
    gradientLight: string;  // Lighter gradient for cards/thumbnails
    textColor: string;      // Text color for initials on light backgrounds
    bgColor: string;        // Solid background color for swatches
}

// All available group themes
export const GROUP_THEMES: Record<GroupThemeColor, GroupTheme> = {
    indigo: {
        key: 'indigo',
        label: 'Indigo',
        gradient: 'from-indigo-500 to-violet-600',
        gradientLight: 'from-indigo-100 to-violet-200',
        textColor: 'text-indigo-600',
        bgColor: 'bg-indigo-500',
    },
    emerald: {
        key: 'emerald',
        label: 'Emerald',
        gradient: 'from-emerald-500 to-teal-600',
        gradientLight: 'from-emerald-100 to-teal-200',
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
    },
    rose: {
        key: 'rose',
        label: 'Rose',
        gradient: 'from-rose-500 to-pink-600',
        gradientLight: 'from-rose-100 to-pink-200',
        textColor: 'text-rose-600',
        bgColor: 'bg-rose-500',
    },
    amber: {
        key: 'amber',
        label: 'Amber',
        gradient: 'from-amber-500 to-orange-600',
        gradientLight: 'from-amber-100 to-orange-200',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-500',
    },
    cyan: {
        key: 'cyan',
        label: 'Cyan',
        gradient: 'from-cyan-500 to-blue-600',
        gradientLight: 'from-cyan-100 to-blue-200',
        textColor: 'text-cyan-600',
        bgColor: 'bg-cyan-500',
    },
    violet: {
        key: 'violet',
        label: 'Violet',
        gradient: 'from-violet-500 to-purple-600',
        gradientLight: 'from-violet-100 to-purple-200',
        textColor: 'text-violet-600',
        bgColor: 'bg-violet-500',
    },
};

// Array of themes for iteration in selectors
export const THEME_OPTIONS: GroupTheme[] = [
    GROUP_THEMES.indigo,
    GROUP_THEMES.emerald,
    GROUP_THEMES.rose,
    GROUP_THEMES.amber,
    GROUP_THEMES.cyan,
    GROUP_THEMES.violet,
];

/**
 * Get theme configuration by color key
 * Falls back to indigo if invalid or missing
 */
export function getGroupTheme(color?: string | null): GroupTheme {
    if (color && color in GROUP_THEMES) {
        return GROUP_THEMES[color as GroupThemeColor];
    }
    return GROUP_THEMES.indigo; // Default fallback
}

/**
 * Generate initials from group name
 * Takes first letter of first two words
 * "Brookfield Socials" → "BS"
 * "Friday Night Dinners" → "FN"
 * "Tech" → "T"
 */
export function getGroupInitials(name: string): string {
    if (!name) return '?';

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        // Single word - just use first letter
        return words[0].charAt(0).toUpperCase();
    }

    // Multiple words - first letter of first two words
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
