'use client';

/*
=======================================================================================================================================
Landing Page
=======================================================================================================================================
Public landing page for strangers. Logged-in users are redirected to /dashboard.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    // =======================================================================
    // Redirect logged-in users to dashboard
    // =======================================================================
    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Landing page for strangers
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-4 border-b">
                <h1 className="text-xl font-bold text-blue-600">Meet With Friends</h1>
                <div className="flex gap-4">
                    <Link
                        href="/login"
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Sign up
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center px-8 py-16 bg-gradient-to-b from-blue-50 to-white">
                <h2 className="text-5xl font-bold text-center mb-6 text-gray-900">
                    Bring your group together
                </h2>
                <p className="text-xl text-gray-600 text-center mb-8 max-w-2xl">
                    The simple way to organise group events. Create your community,
                    manage RSVPs, and collect deposits when needed.
                </p>
                <div className="flex gap-4">
                    <Link
                        href="/register"
                        className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                        Get Started
                    </Link>
                    <Link
                        href="/login"
                        className="px-8 py-4 border border-gray-300 text-lg font-semibold rounded-lg hover:bg-gray-50 transition"
                    >
                        Log in
                    </Link>
                </div>
            </section>

            {/* How it works */}
            <section className="px-8 py-16 bg-white">
                <h3 className="text-2xl font-bold text-center mb-12 text-gray-900">How it works</h3>
                <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
                        <h4 className="font-semibold mb-2">Create a Group</h4>
                        <p className="text-gray-600">Start your own community or join an existing one.</p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
                        <h4 className="font-semibold mb-2">Host Events</h4>
                        <p className="text-gray-600">Plan meetups, dinners, coffee catch-ups, or any gathering.</p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
                        <h4 className="font-semibold mb-2">Gather Friends</h4>
                        <p className="text-gray-600">Invite people, manage RSVPs, and bring your group together.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-8 py-6 border-t text-center text-gray-500 text-sm">
                Meet With Friends
            </footer>
        </main>
    );
}
