/*
=======================================================================================================================================
Invite API Functions
=======================================================================================================================================
API client functions for magic invite links.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiGet, apiCall } from '../apiClient';
import { ApiResult, User } from '@/types';

// =======================================================================
// Types
// =======================================================================

export interface InviteGroup {
    id: number;
    name: string;
    icon: string;
    member_count: number;
    require_profile_image: boolean;
    description: string | null;
}

export interface InviteEvent {
    id: number;
    title: string;
    date_time: string;
    location: string | null;
    description: string | null;
    spots_remaining: number | null;
    status: string;
}

export interface InviteUserStatus {
    is_group_member: boolean;
    is_event_rsvp: boolean;
    has_profile_image: boolean;
}

export interface InviteData {
    valid: boolean;
    type: 'event' | 'group';
    invite: {
        inviter_name: string;
        group: InviteGroup;
        event: InviteEvent | null;
    };
    user_status?: InviteUserStatus;
}

export interface AcceptInviteData {
    actions: {
        joined_group: boolean;
        rsvp_status: string | null;
    };
    redirect_to: string;
}

export interface AcceptWithSignupData {
    token: string;
    user: User;
    actions: {
        joined_group: boolean;
        rsvp_status: string | null;
    };
    redirect_to: string;
}

/*
=======================================================================================================================================
validateInvite
=======================================================================================================================================
Validates a magic invite token and returns group/event details.
If auth token is provided, also returns user membership status.
=======================================================================================================================================
*/
export async function validateInvite(
    inviteToken: string,
    authToken?: string
): Promise<ApiResult<InviteData>> {
    const response = await apiGet(`/api/invite/validate/${inviteToken}`, authToken);

    if (response.return_code === 'SUCCESS' && response.valid) {
        return {
            success: true,
            data: {
                valid: response.valid as unknown as boolean,
                type: response.type as unknown as 'event' | 'group',
                invite: response.invite as unknown as InviteData['invite'],
                user_status: response.user_status as unknown as InviteUserStatus | undefined,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Invalid invitation link',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
acceptInvite
=======================================================================================================================================
Accepts a magic invite for a logged-in user. Joins group and/or RSVPs to event.
=======================================================================================================================================
*/
export async function acceptInvite(
    inviteToken: string,
    authToken: string
): Promise<ApiResult<AcceptInviteData>> {
    const response = await apiCall(`/api/invite/accept/${inviteToken}`, {}, authToken);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                actions: response.actions as unknown as AcceptInviteData['actions'],
                redirect_to: response.redirect_to as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to accept invitation',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
acceptInviteWithSignup
=======================================================================================================================================
Creates a new account and accepts the invite in one step.
Returns JWT token and user for immediate login.
=======================================================================================================================================
*/
export async function acceptInviteWithSignup(
    inviteToken: string,
    payload: { name: string; email: string; password: string; avatar_url?: string }
): Promise<ApiResult<AcceptWithSignupData>> {
    const response = await apiCall(`/api/invite/accept-with-signup/${inviteToken}`, payload);

    if (response.return_code === 'SUCCESS' && response.token && response.user) {
        return {
            success: true,
            data: {
                token: response.token as string,
                user: response.user as unknown as User,
                actions: response.actions as unknown as AcceptWithSignupData['actions'],
                redirect_to: response.redirect_to as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to create account',
        return_code: response.return_code,
    };
}
