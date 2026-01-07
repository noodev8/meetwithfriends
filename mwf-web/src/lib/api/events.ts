/*
=======================================================================================================================================
Events API Functions
=======================================================================================================================================
API client functions for event management.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiGet, apiCall } from '../apiClient';
import { ApiResult, Event } from '@/types';

// Extended Event type with group_name and counts
export interface EventWithDetails extends Event {
    group_name: string;
    creator_name: string;
    waitlist_count: number;
}

// RSVP status type
export interface RsvpStatus {
    status: 'attending' | 'waitlist';
    waitlist_position: number | null;
}

// Event with RSVP response
export interface EventWithRsvp {
    event: EventWithDetails;
    rsvp: RsvpStatus | null;
    is_group_member: boolean;
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
}

// Attendee type
export interface Attendee {
    user_id: number;
    name: string;
    avatar_url: string | null;
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
                is_group_member: Boolean(response.is_group_member),
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
=======================================================================================================================================
*/
export async function rsvpEvent(
    token: string,
    eventId: number,
    action: 'join' | 'leave'
): Promise<ApiResult<{ rsvp: RsvpStatus | null; message: string }>> {
    const response = await apiCall(`/api/events/${eventId}/rsvp`, { action }, token);

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

/*
=======================================================================================================================================
getAttendees
=======================================================================================================================================
Fetches attendees and waitlist for an event.
=======================================================================================================================================
*/
export async function getAttendees(
    eventId: number
): Promise<ApiResult<{ attending: Attendee[]; waitlist: Attendee[] }>> {
    const response = await apiGet(`/api/events/${eventId}/attendees`);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                attending: response.attending as unknown as Attendee[],
                waitlist: response.waitlist as unknown as Attendee[],
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
