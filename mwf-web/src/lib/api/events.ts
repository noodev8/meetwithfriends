/*
=======================================================================================================================================
Events API Functions
=======================================================================================================================================
API client functions for event management.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiGet } from '../apiClient';
import { ApiResult, Event } from '@/types';

// Extended Event type with group_name and counts
export interface EventWithDetails extends Event {
    group_name: string;
    waitlist_count: number;
}

/*
=======================================================================================================================================
getAllEvents
=======================================================================================================================================
Fetches all upcoming published events with their attendee counts.
=======================================================================================================================================
*/
export async function getAllEvents(token?: string): Promise<ApiResult<EventWithDetails[]>> {
    const response = await apiGet('/api/events', token);

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
Fetches a single event by ID.
=======================================================================================================================================
*/
export async function getEvent(id: number, token?: string): Promise<ApiResult<EventWithDetails>> {
    const response = await apiGet(`/api/events/${id}`, token);

    if (response.return_code === 'SUCCESS' && response.event) {
        return {
            success: true,
            data: response.event as unknown as EventWithDetails,
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get event',
        return_code: response.return_code,
    };
}
