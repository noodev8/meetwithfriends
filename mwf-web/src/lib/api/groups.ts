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
    visibility?: 'listed' | 'unlisted';
    upcoming_event_count?: number;
}

// User's group with their role and upcoming event count
export interface MyGroup extends GroupWithCount {
    role: 'organiser' | 'host' | 'member';
    upcoming_event_count: number;
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
                membership: response.membership as unknown as GroupMembership | null,
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
        image_position?: 'top' | 'center' | 'bottom';
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

/*
=======================================================================================================================================
updateGroup
=======================================================================================================================================
Updates a group's settings. Requires organiser role.
=======================================================================================================================================
*/
export async function updateGroup(
    token: string,
    groupId: number,
    data: {
        name?: string;
        description?: string | null;
        image_url?: string | null;
        image_position?: 'top' | 'center' | 'bottom';
        join_policy?: 'auto' | 'approval';
    }
): Promise<ApiResult<Group>> {
    const response = await apiCall(`/api/groups/${groupId}/update`, data, token);

    if (response.return_code === 'SUCCESS' && response.group) {
        return {
            success: true,
            data: response.group as unknown as Group,
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to update group',
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

// Paginated members response type
export interface PaginatedMembers {
    members: GroupMember[];
    total_count: number;
    has_more: boolean;
}

// Options for fetching group members
export interface GetMembersOptions {
    status?: 'active' | 'pending' | 'all';
    search?: string;
    limit?: number;
    offset?: number;
}

/*
=======================================================================================================================================
getGroupMembers
=======================================================================================================================================
Fetches members of a group with pagination and search support.
- status: "active" (default), "pending", or "all" (pending/all require organiser/host role)
- search: optional name search (case-insensitive partial match)
- limit: number of results per page (default: 20, max: 100)
- offset: pagination offset (default: 0)
=======================================================================================================================================
*/
export async function getGroupMembers(
    groupId: number,
    token?: string,
    options?: GetMembersOptions | 'active' | 'pending' | 'all'
): Promise<ApiResult<PaginatedMembers>> {
    // Support legacy call pattern: getGroupMembers(id, token, 'pending')
    const opts: GetMembersOptions = typeof options === 'string'
        ? { status: options }
        : options || {};

    // Build query string
    const params = new URLSearchParams();
    if (opts.status) params.append('status', opts.status);
    if (opts.search) params.append('search', opts.search);
    if (opts.limit) params.append('limit', opts.limit.toString());
    if (opts.offset) params.append('offset', opts.offset.toString());

    const queryString = params.toString();
    const url = `/api/groups/${groupId}/members${queryString ? `?${queryString}` : ''}`;

    const response = await apiGet(url, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                members: response.members as unknown as GroupMember[],
                total_count: Number(response.total_count) || 0,
                has_more: Boolean(response.has_more),
            },
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

/*
=======================================================================================================================================
removeMember
=======================================================================================================================================
Removes a member from a group. Only the group organiser can remove members.
=======================================================================================================================================
*/
export async function removeMember(
    token: string,
    groupId: number,
    membershipId: number
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall(
        `/api/groups/${groupId}/members/remove`,
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
        error: (response.message as string) || 'Failed to remove member',
        return_code: response.return_code,
    };
}

// Response type for assignRole
export interface AssignRoleResponse {
    message: string;
    member: {
        id: number;
        user_id: number;
        name: string;
        role: 'host' | 'member';
    };
}

/*
=======================================================================================================================================
assignRole
=======================================================================================================================================
Assigns a role (host or member) to a group member. Only the group organiser can assign roles.
Cannot change the organiser role.
=======================================================================================================================================
*/
export async function assignRole(
    token: string,
    groupId: number,
    membershipId: number,
    role: 'host' | 'member'
): Promise<ApiResult<AssignRoleResponse>> {
    const response = await apiCall(
        `/api/groups/${groupId}/members/role`,
        { membership_id: membershipId, role },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                message: response.message as string,
                member: response.member as AssignRoleResponse['member'],
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to assign role',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
getMyGroups
=======================================================================================================================================
Fetches all groups the authenticated user belongs to, with their role in each group.
=======================================================================================================================================
*/
export async function getMyGroups(token: string): Promise<ApiResult<MyGroup[]>> {
    const response = await apiGet('/api/users/my-groups', token);

    if (response.return_code === 'SUCCESS' && response.groups) {
        return {
            success: true,
            data: response.groups as unknown as MyGroup[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get my groups',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
discoverGroups
=======================================================================================================================================
Fetches listed groups that the authenticated user is NOT already a member of.
Used for the "Discover Groups" dashboard section.
=======================================================================================================================================
*/
export async function discoverGroups(token: string): Promise<ApiResult<GroupWithCount[]>> {
    const response = await apiGet('/api/groups/discover', token);

    if (response.return_code === 'SUCCESS' && response.groups) {
        return {
            success: true,
            data: response.groups as unknown as GroupWithCount[],
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to discover groups',
        return_code: response.return_code,
    };
}
