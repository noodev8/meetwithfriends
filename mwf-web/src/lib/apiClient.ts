/*
=======================================================================================================================================
API Client
=======================================================================================================================================
Base fetch wrapper for making API calls to mwf-server.
Follows API-Rules: never throws on API errors, returns structured objects.
=======================================================================================================================================
*/

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3018';

interface ApiResponse {
    return_code: string;
    message?: string;
    [key: string]: any;
}

/*
=======================================================================================================================================
apiCall
=======================================================================================================================================
Makes a POST request to the API and returns the response.
Never throws on API errors - only on network failures.
=======================================================================================================================================
*/
export async function apiCall(
    endpoint: string,
    body?: object,
    token?: string
): Promise<ApiResponse> {
    try {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        // Parse JSON response
        const data = await response.json();
        return data;
    } catch (error) {
        // Network error - only case where we return a failure object
        console.error('API call failed:', error);
        return {
            return_code: 'NETWORK_ERROR',
            message: 'Unable to connect to server. Please check your connection.',
        };
    }
}

/*
=======================================================================================================================================
apiGet
=======================================================================================================================================
Makes a GET request to the API and returns the response.
=======================================================================================================================================
*/
export async function apiGet(
    endpoint: string,
    token?: string
): Promise<ApiResponse> {
    try {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers,
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        return {
            return_code: 'NETWORK_ERROR',
            message: 'Unable to connect to server. Please check your connection.',
        };
    }
}
