'use client';

/*
=======================================================================================================================================
Reset Password Page
=======================================================================================================================================
Allows users to set a new password using a reset token from email.
=======================================================================================================================================
*/

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/lib/api/auth';

// =======================================================================
// Loading component for Suspense fallback
// =======================================================================
function LoadingState() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
            <p className="text-gray-600">Loading...</p>
        </main>
    );
}

// =======================================================================
// Main reset password form component
// =======================================================================
function ResetPasswordForm() {
    const searchParams = useSearchParams();

    const [token, setToken] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // =======================================================================
    // Get token from URL on mount
    // =======================================================================
    useEffect(() => {
        const urlToken = searchParams.get('token');
        setToken(urlToken);
        setIsReady(true);
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // =======================================================================
        // Client-side validation
        // =======================================================================
        if (!token) {
            setError('Invalid reset link. Please request a new one.');
            return;
        }

        const tokenStr = token;

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // =======================================================================
        // Submit password reset
        // =======================================================================
        setIsLoading(true);

        const result = await resetPassword(tokenStr, password);

        if (result.success) {
            setIsSuccess(true);
        } else {
            setError(result.error || 'Failed to reset password');
        }

        setIsLoading(false);
    };

    // =======================================================================
    // Loading state - waiting to read token from URL
    // =======================================================================
    if (!isReady) {
        return <LoadingState />;
    }

    // =======================================================================
    // Success state - password reset complete
    // =======================================================================
    if (isSuccess) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Password Reset!</h1>
                    <p className="text-gray-600 mb-6">
                        Your password has been successfully reset. You can now log in with your new password.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        Go to Login
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // No token state
    // =======================================================================
    if (!token) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
                    <p className="text-gray-600 mb-6">
                        This password reset link is invalid or has expired.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        Request New Link
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Reset form
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
                <h1 className="text-2xl font-bold text-center mb-2">Set New Password</h1>
                <p className="text-gray-600 text-center mb-6">
                    Enter your new password below.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="At least 8 characters"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Confirm your password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <p className="text-center text-gray-600 mt-6">
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Back to Login
                    </Link>
                </p>
            </div>
        </main>
    );
}

// =======================================================================
// Page component with Suspense boundary
// =======================================================================
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
