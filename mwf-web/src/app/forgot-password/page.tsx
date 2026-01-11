'use client';

/*
=======================================================================================================================================
Forgot Password Page
=======================================================================================================================================
Allows users to request a password reset email.
=======================================================================================================================================
*/

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // =======================================================================
        // Client-side validation
        // =======================================================================
        if (!email.trim()) {
            setError('Please enter your email');
            return;
        }

        // =======================================================================
        // Submit forgot password request
        // =======================================================================
        setIsLoading(true);

        const result = await forgotPassword(email);

        if (result.success) {
            setIsSubmitted(true);
        } else {
            setError(result.error || 'Failed to send reset email');
        }

        setIsLoading(false);
    };

    // =======================================================================
    // Success state - email sent
    // =======================================================================
    if (isSubmitted) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    {/* Logo */}
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

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-4 text-slate-800">Check Your Email</h1>
                        <p className="text-slate-600 mb-6">
                            If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            The link will expire in 1 hour. Check your spam folder if you don&apos;t see it.
                        </p>
                        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Request form
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
            <div className="w-full max-w-md">
                {/* Logo */}
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

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <h1 className="text-2xl font-bold text-center mb-2 text-slate-800">Forgot Password?</h1>
                    <p className="text-slate-600 text-center mb-6">
                        Enter your email and we&apos;ll send you a reset link.
                    </p>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="you@example.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <p className="text-center text-slate-600 mt-6">
                        Remember your password?{' '}
                        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
