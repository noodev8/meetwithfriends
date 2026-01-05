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
}

// Group
export interface Group {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
    join_policy: 'auto' | 'approval';
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
    status: 'published' | 'cancelled';
    created_at: string;
    attendee_count?: number;
    waitlist_count?: number;
}

// Event RSVP
export interface EventRsvp {
    id: number;
    event_id: number;
    user_id: number;
    status: 'attending' | 'waitlist';
    waitlist_position?: number;
    created_at: string;
    user?: User;
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
