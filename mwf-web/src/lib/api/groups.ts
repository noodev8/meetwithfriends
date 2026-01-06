/*
=======================================================================================================================================
Groups API Functions
=======================================================================================================================================
API client functions for group management.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiCall, apiGet } from '../apiClient';
import { ApiResult, Group } from '@/types';

// Extended Group type with member_count
export interface GroupWithCount extends Group {
    member_count: number;
}

// Membership status for the current user
export interface GroupMembership {
    status: 'active' | 'pending';
    role: 'organiser' | 'host' | 'member';
}

// Group with membership info
export interface GroupWithMembership {
    group: GroupWithCount;
    membership: GroupMembership | null;
}

/*
=======================================================================================================================================
getAllGroups
=======================================================================================================================================
Fetches all groups with their member counts.
=======================================================================================================================================
*/
export async function getAllGroups(token?: string): Promise<ApiResult<GroupWithCount[]>> {
    const response = await apiGet('/api/groups', token);

    if (response.return_code === 'SUCCESS' && response.groups) {
        return {
            success: true,
            data: response.groups as unknown as GroupWithCount[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get groups',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
getGroup
=======================================================================================================================================
Fetches a single group by ID, including user's membership status if logged in.
=======================================================================================================================================
*/
export async function getGroup(id: number, token?: string): Promise<ApiResult<GroupWithMembership>> {
    const response = await apiGet(`/api/groups/${id}`, token);

    if (response.return_code === 'SUCCESS' && response.group) {
        return {
            success: true,
            data: {
                group: response.group as unknown as GroupWithCount,
                membership: response.membership as GroupMembership | null,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get group',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
createGroup
=======================================================================================================================================
Creates a new group. Requires authentication.
=======================================================================================================================================
*/
export async function createGroup(
    token: string,
    data: {
        name: string;
        description?: string;
        image_url?: string;
        join_policy?: 'auto' | 'approval';
    }
): Promise<ApiResult<Group>> {
    const response = await apiCall('/api/groups/create', data, token);

    if (response.return_code === 'SUCCESS' && response.group) {
        return {
            success: true,
            data: response.group as unknown as Group,
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to create group',
        return_code: response.return_code,
    };
}

// Join group response type
export interface JoinGroupResponse {
    status: 'active' | 'pending';
    message: string;
}

/*
=======================================================================================================================================
joinGroup
=======================================================================================================================================
Requests to join a group. Behavior depends on group's join_policy:
- "auto": User is added immediately as active member
- "approval": User is added as pending, awaiting approval
=======================================================================================================================================
*/
export async function joinGroup(
    token: string,
    groupId: number
): Promise<ApiResult<JoinGroupResponse>> {
    const response = await apiCall('/api/groups/join', { group_id: groupId }, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                status: response.status as 'active' | 'pending',
                message: response.message as string,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to join group',
        return_code: response.return_code,
    };
}

// Group member type
export interface GroupMember {
    id: number;
    user_id: number;
    name: string;
    avatar_url: string | null;
    role: 'organiser' | 'host' | 'member';
    status: 'active' | 'pending';
    joined_at: string;
}

/*
=======================================================================================================================================
getGroupMembers
=======================================================================================================================================
Fetches members of a group. Use status param to filter:
- "active": Only active members (default)
- "pending": Only pending members (requires organiser/host role)
- "all": All members (requires organiser/host role)
=======================================================================================================================================
*/
export async function getGroupMembers(
    groupId: number,
    token?: string,
    status?: 'active' | 'pending' | 'all'
): Promise<ApiResult<GroupMember[]>> {
    const url = status
        ? `/api/groups/${groupId}/members?status=${status}`
        : `/api/groups/${groupId}/members`;

    const response = await apiGet(url, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: response.members as GroupMember[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get members',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
approveMember
=======================================================================================================================================
Approves a pending member request. Requires organiser/host role.
=======================================================================================================================================
*/
export async function approveMember(
    token: string,
    groupId: number,
    membershipId: number
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall(
        `/api/groups/${groupId}/members/approve`,
        { membership_id: membershipId },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: { message: response.message as string },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to approve member',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
rejectMember
=======================================================================================================================================
Rejects a pending member request. Requires organiser/host role.
=======================================================================================================================================
*/
export async function rejectMember(
    token: string,
    groupId: number,
    membershipId: number
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall(
        `/api/groups/${groupId}/members/reject`,
        { membership_id: membershipId },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: { message: response.message as string },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to reject member',
        return_code: response.return_code,
    };
}
