'use client';

/*
=======================================================================================================================================
Group Detail Page
=======================================================================================================================================
Displays a single group's details. Accessible to both logged-in and non-logged-in users.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroup, GroupWithCount } from '@/lib/api/groups';

export default function GroupDetailPage() {
    const { user, token, logout } = useAuth();
    const params = useParams();
    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // =======================================================================
    // Fetch group details
    // =======================================================================
    useEffect(() => {
        async function fetchGroup() {
            if (!params.id) return;

            const result = await getGroup(Number(params.id), token || undefined);
            if (result.success && result.data) {
                setGroup(result.data);
            } else {
                setError(result.error || 'Group not found');
            }
            setLoading(false);
        }
        fetchGroup();
    }, [params.id, token]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !group) {
        return (
            <main className="min-h-screen flex flex-col bg-gray-50">
                <header className="flex justify-between items-center px-8 py-4 bg-white border-b">
                    <Link href={user ? '/dashboard' : '/'} className="text-xl font-bold text-blue-600">
                        Meet With Friends
                    </Link>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-gray-600 mb-4">{error || 'Group not found'}</p>
                    <Link href="/groups" className="text-blue-600 hover:text-blue-700">
                        Back to groups
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Group detail view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-4 bg-white border-b">
                <Link href={user ? '/dashboard' : '/'} className="text-xl font-bold text-blue-600">
                    Meet With Friends
                </Link>
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <Link
                                href="/profile"
                                className="text-gray-700 hover:text-gray-900 transition"
                            >
                                {user.name}
                            </Link>
                            <button
                                onClick={logout}
                                className="text-gray-500 hover:text-gray-700 transition"
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </header>

            {/* Group Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-8 py-8">
                    <div className="flex gap-6">
                        {group.image_url ? (
                            <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                    src={group.image_url}
                                    alt={group.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-4xl text-blue-400">
                                    {group.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
                            {group.description && (
                                <p className="text-gray-600 mb-4">{group.description}</p>
                            )}
                            <p className="text-gray-500">
                                {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            {user && (
                                <button
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                    onClick={() => {
                                        // TODO: Implement join group functionality
                                        alert('Join group functionality coming soon!');
                                    }}
                                >
                                    Join Group
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
                <div className="bg-white rounded-lg border p-8 text-center">
                    <p className="text-gray-600">No upcoming events in this group.</p>
                </div>
            </div>
        </main>
    );
}
