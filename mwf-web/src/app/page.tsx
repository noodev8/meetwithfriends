'use client';

/*
=======================================================================================================================================
Home Page
=======================================================================================================================================
Landing page that shows different content based on auth state:
- Logged out: Login/Register options
- Logged in: Welcome message and navigation to profile/groups
=======================================================================================================================================
*/

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
    const { user, isLoading } = useAuth();

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Logged in view
    // =======================================================================
    if (user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <h1 className="text-4xl font-bold mb-4">Welcome, {user.name}!</h1>
                <p className="text-gray-600 mb-8">Ready to meet with friends?</p>
                <div className="flex gap-4">
                    <Link
                        href="/profile"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        My Profile
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Logged out view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-4">Meet With Friends</h1>
            <p className="text-gray-600 mb-8">Organize group events with ease</p>
            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Login
                </Link>
                <Link
                    href="/register"
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                    Register
                </Link>
            </div>
        </main>
    );
}
