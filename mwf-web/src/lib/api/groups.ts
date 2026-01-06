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
Fetches a single group by ID.
=======================================================================================================================================
*/
export async function getGroup(id: number, token?: string): Promise<ApiResult<GroupWithCount>> {
    const response = await apiGet(`/api/groups/${id}`, token);

    if (response.return_code === 'SUCCESS' && response.group) {
        return {
            success: true,
            data: response.group as unknown as GroupWithCount,
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
