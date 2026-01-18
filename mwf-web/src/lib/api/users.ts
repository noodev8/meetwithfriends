/*
=======================================================================================================================================
Users API Functions
=======================================================================================================================================
API client functions for user profile management.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiCall, apiGet } from '../apiClient';
import { ApiResult, User } from '@/types';

/*
=======================================================================================================================================
getProfile
=======================================================================================================================================
Fetches the authenticated user's profile.
=======================================================================================================================================
*/
export async function getProfile(token: string): Promise<ApiResult<User>> {
    const response = await apiGet('/api/users/profile', token);

    if (response.return_code === 'SUCCESS' && response.user) {
        return {
            success: true,
            data: response.user as unknown as User,
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get profile',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
updateProfile
=======================================================================================================================================
Updates the authenticated user's profile.
=======================================================================================================================================
*/
export async function updateProfile(
    token: string,
    updates: {
        name?: string;
        bio?: string;
        avatar_url?: string;
        contact_mobile?: string;
        contact_email?: string;
        show_mobile_to_guests?: boolean;
        show_email_to_guests?: boolean;
        receive_broadcasts?: boolean;
    }
): Promise<ApiResult<User>> {
    const response = await apiCall('/api/users/update_profile', updates, token);

    if (response.return_code === 'SUCCESS' && response.user) {
        return {
            success: true,
            data: response.user as unknown as User,
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to update profile',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
changePassword
=======================================================================================================================================
Changes the authenticated user's password.
=======================================================================================================================================
*/
export async function changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
): Promise<ApiResult> {
    const response = await apiCall(
        '/api/users/change_password',
        {
            current_password: currentPassword,
            new_password: newPassword,
        },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return { success: true };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to change password',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
deleteAccount
=======================================================================================================================================
Deletes the authenticated user's account. Requires password confirmation.
=======================================================================================================================================
*/
export async function deleteAccount(
    token: string,
    password: string
): Promise<ApiResult> {
    const response = await apiCall(
        '/api/users/delete_account',
        { password },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return { success: true };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to delete account',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
deleteImage
=======================================================================================================================================
Deletes an image from Cloudinary. Used when removing or replacing avatar images.
=======================================================================================================================================
*/
export async function deleteImage(
    token: string,
    imageUrl: string
): Promise<ApiResult> {
    const response = await apiCall(
        '/api/images/delete',
        { image_url: imageUrl },
        token
    );

    if (response.return_code === 'SUCCESS') {
        return { success: true };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to delete image',
        return_code: response.return_code,
    };
}
