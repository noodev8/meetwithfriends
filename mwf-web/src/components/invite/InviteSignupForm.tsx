'use client';

/*
=======================================================================================================================================
InviteSignupForm Component
=======================================================================================================================================
Signup form for new users accepting an invite. Creates account + joins in one API call.
Handles validation, EMAIL_EXISTS error with login redirect, and auto-login on success.
=======================================================================================================================================
*/

import { useState } from 'react';
import Link from 'next/link';

interface InviteSignupFormProps {
    isSubmitting: boolean;
    error: string;
    onSubmit: (payload: { name: string; email: string; password: string }) => void;
    onLogin: () => void;
}

export default function InviteSignupForm({
    isSubmitting,
    error,
    onSubmit,
    onLogin,
}: InviteSignupFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [localError, setLocalError] = useState('');

    const displayError = error || localError;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        // Client-side validation
        if (!name.trim()) {
            setLocalError('Please enter your name');
            return;
        }

        if (!email.trim()) {
            setLocalError('Please enter your email');
            return;
        }

        if (password.length < 8) {
            setLocalError('Password must be at least 8 characters');
            return;
        }

        if (!acceptedTerms) {
            setLocalError('Please accept the Terms of Service and Privacy Policy');
            return;
        }

        onSubmit({ name: name.trim(), email: email.trim(), password });
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 font-display">
                        Create Your Account
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Sign up to accept the invitation
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    {displayError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {displayError}
                            {error && (error.includes('already exists') || error.includes('EMAIL_EXISTS')) && (
                                <button
                                    onClick={onLogin}
                                    className="block mt-2 text-rose-600 hover:text-rose-700 font-medium underline"
                                >
                                    Log in instead
                                </button>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="invite-name" className="block text-sm font-medium text-slate-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                id="invite-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="invite-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="invite-password" className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="invite-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="invite-acceptTerms"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 text-rose-500 border-slate-300 rounded focus:ring-rose-500"
                            />
                            <label htmlFor="invite-acceptTerms" className="text-sm text-slate-600">
                                I agree to the{' '}
                                <Link href="/terms" className="text-rose-600 hover:text-rose-700">
                                    Terms of Service
                                </Link>
                                {' '}and{' '}
                                <Link href="/privacy" className="text-rose-600 hover:text-rose-700">
                                    Privacy Policy
                                </Link>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating Account...' : 'Create Account & Join'}
                        </button>
                    </form>

                    <p className="text-center text-slate-600 mt-6">
                        Already have an account?{' '}
                        <button
                            onClick={onLogin}
                            className="text-rose-600 hover:text-rose-700 font-medium"
                        >
                            Log in
                        </button>
                    </p>
                </div>
            </div>
        </main>
    );
}
