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
// Logo component (reused across states)
// =======================================================================
function Logo() {
    return (
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            </div>
            <span className="font-display text-xl font-bold text-slate-800">
                Meet With Friends
            </span>
        </Link>
    );
}

// =======================================================================
// Loading component for Suspense fallback
// =======================================================================
function LoadingState() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    <Logo />
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-4 text-slate-800">Password Reset!</h1>
                        <p className="text-slate-600 mb-6">
                            Your password has been successfully reset. You can now log in with your new password.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-violet-700 transition"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // =======================================================================
    // No token state
    // =======================================================================
    if (!token) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    <Logo />
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-4 text-slate-800">Invalid Link</h1>
                        <p className="text-slate-600 mb-6">
                            This password reset link is invalid or has expired.
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-violet-700 transition"
                        >
                            Request New Link
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Reset form
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
            <div className="w-full max-w-md">
                <Logo />
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <h1 className="text-2xl font-bold text-center mb-2 text-slate-800">Set New Password</h1>
                    <p className="text-slate-600 text-center mb-6">
                        Enter your new password below.
                    </p>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="Confirm your password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>

                    <p className="text-center text-slate-600 mt-6">
                        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                            Back to Login
                        </Link>
                    </p>
                </div>
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
