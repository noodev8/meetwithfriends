'use client';

/*
=======================================================================================================================================
Login Page
=======================================================================================================================================
User login form. Authenticates and logs the user in.
=======================================================================================================================================
*/

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login as apiLogin } from '@/lib/api/auth';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

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

        if (!password) {
            setError('Please enter your password');
            return;
        }

        // =======================================================================
        // Submit login
        // =======================================================================
        setIsLoading(true);

        const result = await apiLogin(email, password);

        if (result.success && result.data) {
            // Log the user in and show redirecting state
            login(result.data.token, result.data.user);
            setIsLoading(false);
            setIsRedirecting(true);
            router.push('/your-events');
        } else {
            setError(result.error || 'Login failed');
            setIsLoading(false);
        }
    };

    // =======================================================================
    // Show loading state while redirecting after successful login
    // =======================================================================
    if (isRedirecting) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Signing you in...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="block text-center mb-8">
                    <span className="font-display text-2xl font-bold text-slate-800">
                        Meet With Friends
                    </span>
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <h1 className="text-2xl font-bold text-center mb-6 text-slate-800">Log In</h1>

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
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                placeholder="Your password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Logging in...' : 'Log In'}
                        </button>
                    </form>

                    <div className="text-center mt-4">
                        <Link href="/forgot-password" className="text-sm text-rose-600 hover:text-rose-700">
                            Forgot your password?
                        </Link>
                    </div>

                    <p className="text-center text-slate-600 mt-6">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-rose-600 hover:text-rose-700 font-medium">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
