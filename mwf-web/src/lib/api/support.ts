/*
=======================================================================================================================================
Support API Functions
=======================================================================================================================================
API client functions for support features.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiCall } from '../apiClient';
import { ApiResult } from '@/types';

/*
=======================================================================================================================================
contactSupport
=======================================================================================================================================
Sends a support message via the contact form.
=======================================================================================================================================
*/
export async function contactSupport(
    name: string,
    email: string,
    message: string
): Promise<ApiResult> {
    const response = await apiCall('/api/support/contact', {
        name,
        email,
        message,
    });

    if (response.return_code === 'SUCCESS') {
        return { success: true };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to send message',
        return_code: response.return_code,
    };
}
