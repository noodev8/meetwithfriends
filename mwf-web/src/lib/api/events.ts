/*
=======================================================================================================================================
Events API Functions
=======================================================================================================================================
API client functions for event management.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiGet, apiCall } from '../apiClient';
import { ApiResult, Event, EventHost } from '@/types';

// Extended Event type with group_name and counts
export interface EventWithDetails extends Event {
    group_name: string;
    creator_name: string;
    waitlist_count: number;
    total_guest_count: number;
    rsvp_status?: 'attending' | 'waitlist' | null;
}

// RSVP status type
export interface RsvpStatus {
    status: 'attending' | 'waitlist';
    waitlist_position: number | null;
    guest_count: number;
    food_order: string | null;
    dietary_notes: string | null;
}

// Event with RSVP response
export interface EventWithRsvp {
    event: EventWithDetails;
    rsvp: RsvpStatus | null;
    hosts: EventHost[];
    is_group_member: boolean;
    is_host: boolean;
    can_manage_attendees: boolean;
    can_edit: boolean;
}

// Update event payload
export interface UpdateEventPayload {
    title?: string;
    description?: string;
    location?: string;
    date_time?: string;
    capacity?: number | null;
    image_url?: string | null;
    image_position?: 'top' | 'center' | 'bottom';
    allow_guests?: boolean;
    max_guests_per_rsvp?: number;
    preorders_enabled?: boolean;
    menu_link?: string | null;
    preorder_cutoff?: string | null;
}

// Attendee type
export interface Attendee {
    user_id: number;
    name: string;
    avatar_url: string | null;
    guest_count: number;
    food_order: string | null;
    dietary_notes: string | null;
    rsvp_at: string;
    waitlist_position?: number;
}

// Create event payload
export interface CreateEventPayload {
    group_id: number;
    title: string;
    description?: string;
    location?: string;
    date_time: string;
    capacity?: number | null;
    image_url?: string;
    image_position?: 'top' | 'center' | 'bottom';
    allow_guests?: boolean;
    max_guests_per_rsvp?: number;
    preorders_enabled?: boolean;
    menu_link?: string;
    preorder_cutoff?: string;
}

/*
=======================================================================================================================================
getAllEvents
=======================================================================================================================================
Fetches all upcoming published events with their attendee counts.
Optionally filter by group_id.
=======================================================================================================================================
*/
export async function getAllEvents(token?: string, groupId?: number): Promise<ApiResult<EventWithDetails[]>> {
    const url = groupId ? `/api/events?group_id=${groupId}` : '/api/events';
    const response = await apiGet(url, token);

    if (response.return_code === 'SUCCESS' && response.events) {
        return {
            success: true,
            data: response.events as unknown as EventWithDetails[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get events',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
getEvent
=======================================================================================================================================
Fetches a single event by ID with user's RSVP status if logged in.
=======================================================================================================================================
*/
export async function getEvent(id: number, token?: string): Promise<ApiResult<EventWithRsvp>> {
    const response = await apiGet(`/api/events/${id}`, token);

    if (response.return_code === 'SUCCESS' && response.event) {
        return {
            success: true,
            data: {
                event: response.event as unknown as EventWithDetails,
                rsvp: response.rsvp as unknown as RsvpStatus | null,
                hosts: (response.hosts || []) as unknown as EventHost[],
                is_group_member: Boolean(response.is_group_member),
                is_host: Boolean(response.is_host),
                can_manage_attendees: Boolean(response.can_manage_attendees),
                can_edit: Boolean(response.can_edit),
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get event',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
createEvent
=======================================================================================================================================
Creates a new event. Requires organiser or host role in the group.
=======================================================================================================================================
*/
export async function createEvent(
    token: string,
    payload: CreateEventPayload
): Promise<ApiResult<Event>> {
    const response = await apiCall('/api/events/create', payload, token);

    if (response.return_code === 'SUCCESS' && response.event) {
        return {
            success: true,
            data: response.event as unknown as Event,
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to create event',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
rsvpEvent
=======================================================================================================================================
Join or leave an event. Returns new RSVP status.
When joining, optionally specify guest_count (0-5) if the event allows guests.
=======================================================================================================================================
*/
export async function rsvpEvent(
    token: string,
    eventId: number,
    action: 'join' | 'leave',
    guestCount?: number
): Promise<ApiResult<{ rsvp: RsvpStatus | null; message: string }>> {
    const payload: { action: string; guest_count?: number } = { action };
    if (action === 'join' && guestCount !== undefined) {
        payload.guest_count = guestCount;
    }
    const response = await apiCall(`/api/events/${eventId}/rsvp`, payload, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                rsvp: response.rsvp as unknown as RsvpStatus | null,
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to update RSVP',
        return_code: response.return_code,
    };
}

// Not going attendee (minimal info)
export interface NotGoingAttendee {
    user_id: number;
    name: string;
    avatar_url: string | null;
    rsvp_at: string;
}

// Attendees response with membership info
export interface AttendeesResponse {
    attending: Attendee[];
    waitlist: Attendee[];
    not_going: NotGoingAttendee[];
    attending_count: number;
    total_guest_count: number;
    waitlist_count: number;
    not_going_count: number;
    is_member: boolean;
}

/*
=======================================================================================================================================
getAttendees
=======================================================================================================================================
Fetches attendees and waitlist for an event.
- Group members see full attendee list with profiles
- Non-members only see counts (attending/waitlist arrays will be empty)
=======================================================================================================================================
*/
export async function getAttendees(
    eventId: number,
    token?: string
): Promise<ApiResult<AttendeesResponse>> {
    const response = await apiGet(`/api/events/${eventId}/attendees`, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                attending: response.attending as unknown as Attendee[],
                waitlist: response.waitlist as unknown as Attendee[],
                not_going: response.not_going as unknown as NotGoingAttendee[],
                attending_count: Number(response.attending_count) || 0,
                total_guest_count: Number(response.total_guest_count) || 0,
                waitlist_count: Number(response.waitlist_count) || 0,
                not_going_count: Number(response.not_going_count) || 0,
                is_member: Boolean(response.is_member),
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get attendees',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
manageAttendee
=======================================================================================================================================
Allows organisers and event creators to manage attendees - remove, demote to waitlist, or promote.
=======================================================================================================================================
*/
export async function manageAttendee(
    token: string,
    eventId: number,
    userId: number,
    action: 'remove' | 'demote' | 'promote'
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall(`/api/events/${eventId}/manage-attendee`, { user_id: userId, action }, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to manage attendee',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
updateEvent
=======================================================================================================================================
Updates an existing event. Only event creator or group organiser can update.
=======================================================================================================================================
*/
export async function updateEvent(
    token: string,
    eventId: number,
    payload: UpdateEventPayload
): Promise<ApiResult<Event>> {
    const response = await apiCall(`/api/events/${eventId}/update`, payload, token);

    if (response.return_code === 'SUCCESS' && response.event) {
        return {
            success: true,
            data: response.event as unknown as Event,
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to update event',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
cancelEvent
=======================================================================================================================================
Cancels an event. Only event creator or group organiser can cancel.
=======================================================================================================================================
*/
export async function cancelEvent(
    token: string,
    eventId: number
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall(`/api/events/${eventId}/cancel`, {}, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to cancel event',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
restoreEvent
=======================================================================================================================================
Restores a cancelled event. Only event creator or group organiser can restore.
=======================================================================================================================================
*/
export async function restoreEvent(
    token: string,
    eventId: number
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall(`/api/events/${eventId}/restore`, {}, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to restore event',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
getMyEvents
=======================================================================================================================================
Fetches upcoming events from groups the authenticated user is a member of.
=======================================================================================================================================
*/
export async function getMyEvents(token: string): Promise<ApiResult<EventWithDetails[]>> {
    const response = await apiGet('/api/users/my-events', token);

    if (response.return_code === 'SUCCESS' && response.events) {
        return {
            success: true,
            data: response.events as unknown as EventWithDetails[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get my events',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
getMyRsvps
=======================================================================================================================================
Fetches events the authenticated user has RSVP'd to (attending or waitlist).
Used for the "Your Events" personal calendar page.
=======================================================================================================================================
*/
export async function getMyRsvps(token: string): Promise<ApiResult<EventWithDetails[]>> {
    const response = await apiGet('/api/users/my-rsvps', token);

    if (response.return_code === 'SUCCESS' && response.events) {
        return {
            success: true,
            data: response.events as unknown as EventWithDetails[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get your events',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
updateRsvp
=======================================================================================================================================
Updates guest count for an existing RSVP. Only the RSVP owner can update.
=======================================================================================================================================
*/
export async function updateRsvp(
    token: string,
    eventId: number,
    guestCount: number
): Promise<ApiResult<{ rsvp: RsvpStatus; message: string }>> {
    const response = await apiCall(`/api/events/${eventId}/rsvp/update`, { guest_count: guestCount }, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                rsvp: response.rsvp as unknown as RsvpStatus,
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to update RSVP',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
getHosts
=======================================================================================================================================
Gets the list of hosts for an event.
=======================================================================================================================================
*/
export async function getHosts(eventId: number): Promise<ApiResult<EventHost[]>> {
    const response = await apiGet(`/api/events/${eventId}/hosts`);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: (response.hosts || []) as unknown as EventHost[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get hosts',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
addHost
=======================================================================================================================================
Adds a host to an event. Requires being a host or group organiser.
=======================================================================================================================================
*/
export async function addHost(
    token: string,
    eventId: number,
    userId: number
): Promise<ApiResult<{ host: EventHost; message: string }>> {
    const response = await apiCall(`/api/events/${eventId}/hosts/add`, { user_id: userId }, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                host: response.host as unknown as EventHost,
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to add host',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
removeHost
=======================================================================================================================================
Removes a host from an event. Hosts can step down, organisers can remove any host.
Cannot remove the last host.
=======================================================================================================================================
*/
export async function removeHost(
    token: string,
    eventId: number,
    userId: number
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall(`/api/events/${eventId}/hosts/remove`, { user_id: userId }, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to remove host',
        return_code: response.return_code,
    };
}

// Food order type
export interface FoodOrder {
    food_order: string | null;
    dietary_notes: string | null;
}

/*
=======================================================================================================================================
submitOrder
=======================================================================================================================================
Submits or updates the current user's food order for an event.
Cannot submit after preorder_cutoff has passed.
=======================================================================================================================================
*/
export async function submitOrder(
    token: string,
    eventId: number,
    foodOrder: string | null,
    dietaryNotes: string | null
): Promise<ApiResult<{ order: FoodOrder; message: string }>> {
    const response = await apiCall(
        `/api/events/${eventId}/submit-order`,
        { food_order: foodOrder, dietary_notes: dietaryNotes },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                order: response.order as unknown as FoodOrder,
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to submit order',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
updateOrder
=======================================================================================================================================
Allows hosts/organisers to update another attendee's food order.
Can update regardless of cutoff.
=======================================================================================================================================
*/
export async function updateOrder(
    token: string,
    eventId: number,
    userId: number,
    foodOrder: string | null,
    dietaryNotes: string | null
): Promise<ApiResult<{ order: FoodOrder & { user_id: number }; message: string }>> {
    const response = await apiCall(
        `/api/events/${eventId}/update-order`,
        { user_id: userId, food_order: foodOrder, dietary_notes: dietaryNotes },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                order: response.order as unknown as FoodOrder & { user_id: number },
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to update order',
        return_code: response.return_code,
    };
}
