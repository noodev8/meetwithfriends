/*
=======================================================================================================================================
Type Definitions
=======================================================================================================================================
TypeScript interfaces for the application.
=======================================================================================================================================
*/

// User
export interface User {
    id: number;
    email: string;
    name: string;
    bio?: string;
    avatar_url?: string;
    contact_mobile?: string;
    contact_email?: string;
    show_mobile_to_guests?: boolean;
    show_email_to_guests?: boolean;
    receive_broadcasts?: boolean;
}

// Group
export interface Group {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
    image_position?: 'top' | 'center' | 'bottom';
    join_policy: 'auto' | 'approval';
    theme_color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet';
    icon?: string;
    require_profile_image?: boolean;
    all_members_host?: boolean;
    created_at: string;
}

// Group Member
export interface GroupMember {
    id: number;
    user_id: number;
    group_id: number;
    role: 'organiser' | 'host' | 'member';
    status: 'active' | 'pending';
    joined_at: string;
    user?: User;
}

// Event
export interface Event {
    id: number;
    group_id: number;
    created_by: number;
    title: string;
    description?: string;
    location?: string;
    date_time: string;
    capacity?: number;
    image_url?: string;
    image_position?: 'top' | 'center' | 'bottom';
    allow_guests?: boolean;
    max_guests_per_rsvp?: number;
    preorders_enabled?: boolean;
    menu_link?: string;
    menu_images?: string[];
    preorder_cutoff?: string;
    category?: 'food' | 'outdoor' | 'games' | 'coffee' | 'arts' | 'learning' | 'other';
    waitlist_enabled?: boolean;
    rsvps_closed?: boolean;
    broadcast_sent_at?: string;
    status: 'published' | 'cancelled';
    created_at: string;
    attendee_count?: number;
    total_guest_count?: number;
    waitlist_count?: number;
}

// Event RSVP
export interface EventRsvp {
    id: number;
    event_id: number;
    user_id: number;
    status: 'attending' | 'waitlist';
    waitlist_position?: number;
    guest_count?: number;
    food_order?: string;
    dietary_notes?: string;
    created_at: string;
    user?: User;
}

// Event Host
export interface EventHost {
    user_id: number;
    name: string;
    avatar_url?: string;
    added_at?: string;
}

// Comment
export interface Comment {
    id: number;
    event_id: number;
    user_id: number;
    content: string;
    created_at: string;
    user?: User;
}

// API Response types
export interface ApiResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
    return_code?: string;
}

// Auth types
export interface AuthResponse {
    token: string;
    user: User;
}
