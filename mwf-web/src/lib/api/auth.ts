/*
=======================================================================================================================================
Auth API Functions
=======================================================================================================================================
API client functions for authentication.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiCall } from '../apiClient';
import { ApiResult, AuthResponse, User } from '@/types';

/*
=======================================================================================================================================
register
=======================================================================================================================================
Creates a new user account.
=======================================================================================================================================
*/
export async function register(
    email: string,
    password: string,
    name: string
): Promise<ApiResult<AuthResponse>> {
    const response = await apiCall('/api/auth/register', {
        email,
        password,
        name,
    });

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                token: response.token,
                user: response.user,
            },
        };
    }

    return {
        success: false,
        error: response.message || 'Registration failed',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
login
=======================================================================================================================================
Authenticates a user and returns a token.
=======================================================================================================================================
*/
export async function login(
    email: string,
    password: string
): Promise<ApiResult<AuthResponse>> {
    const response = await apiCall('/api/auth/login', {
        email,
        password,
    });

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                token: response.token,
                user: response.user,
            },
        };
    }

    return {
        success: false,
        error: response.message || 'Login failed',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
forgotPassword
=======================================================================================================================================
Sends a password reset email.
=======================================================================================================================================
*/
export async function forgotPassword(email: string): Promise<ApiResult> {
    const response = await apiCall('/api/auth/forgot_password', { email });

    if (response.return_code === 'SUCCESS') {
        return { success: true };
    }

    return {
        success: false,
        error: response.message || 'Failed to send reset email',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
resetPassword
=======================================================================================================================================
Resets password using a reset token.
=======================================================================================================================================
*/
export async function resetPassword(
    token: string,
    password: string
): Promise<ApiResult> {
    const response = await apiCall('/api/auth/reset_password', {
        token,
        password,
    });

    if (response.return_code === 'SUCCESS') {
        return { success: true };
    }

    return {
        success: false,
        error: response.message || 'Failed to reset password',
        return_code: response.return_code,
    };
}
