'use client';

/*
=======================================================================================================================================
Dashboard Page
=======================================================================================================================================
Main dashboard for logged-in users. Shows all groups and upcoming events.
Redirects to landing page if not authenticated.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllGroups, GroupWithCount } from '@/lib/api/groups';
import { getAllEvents, EventWithDetails } from '@/lib/api/events';

export default function Dashboard() {
    const { user, token, isLoading, logout } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<GroupWithCount[]>([]);
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // =======================================================================
    // Redirect to landing if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Fetch groups and events
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (!token) return;

            const [groupsResult, eventsResult] = await Promise.all([
                getAllGroups(token),
                getAllEvents(token)
            ]);

            if (groupsResult.success && groupsResult.data) {
                setGroups(groupsResult.data);
            }

            if (eventsResult.success && eventsResult.data) {
                setEvents(eventsResult.data);
            }

            setLoadingData(false);
        }

        if (user && token) {
            fetchData();
        }
    }, [user, token]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || !user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Dashboard view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-4 bg-white border-b">
                <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                    Meet With Friends
                </Link>
                <div className="flex items-center gap-4">
                    <Link
                        href="/groups/create"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Create Group
                    </Link>
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
                </div>
            </header>

            <div className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
                {/* Groups Section */}
                <section className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Groups</h2>
                        {groups.length > 0 && (
                            <Link href="/groups" className="text-blue-600 hover:text-blue-700">
                                See all
                            </Link>
                        )}
                    </div>

                    {loadingData ? (
                        <p className="text-gray-500">Loading groups...</p>
                    ) : groups.length === 0 ? (
                        <div className="bg-white rounded-lg border p-8 text-center">
                            <p className="text-gray-600 mb-4">No groups yet</p>
                            <p className="text-gray-500 mb-6">Be the first to create one!</p>
                            <Link
                                href="/groups/create"
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-block"
                            >
                                Create Group
                            </Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6">
                            {groups.slice(0, 6).map((group) => (
                                <Link
                                    key={group.id}
                                    href={`/groups/${group.id}`}
                                    className="bg-white rounded-lg border hover:shadow-md transition overflow-hidden"
                                >
                                    {group.image_url ? (
                                        <div className="h-32 bg-gray-200">
                                            <img
                                                src={group.image_url}
                                                alt={group.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                            <span className="text-4xl text-blue-400">
                                                {group.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900">{group.name}</h3>
                                        {group.description && (
                                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                                                {group.description}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* Events Section */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
                        {events.length > 0 && (
                            <Link href="/events" className="text-blue-600 hover:text-blue-700">
                                See all
                            </Link>
                        )}
                    </div>

                    {loadingData ? (
                        <p className="text-gray-500">Loading events...</p>
                    ) : events.length === 0 ? (
                        <div className="bg-white rounded-lg border p-8 text-center">
                            <p className="text-gray-600 mb-4">No upcoming events</p>
                            <p className="text-gray-500">
                                Events will appear here once groups start hosting.
                            </p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6">
                            {events.slice(0, 6).map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="bg-white rounded-lg border hover:shadow-md transition overflow-hidden"
                                >
                                    <div className="p-4">
                                        <p className="text-sm text-blue-600 font-medium">
                                            {new Date(event.date_time).toLocaleDateString('en-GB', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        <h3 className="font-semibold text-gray-900 mt-1">
                                            {event.title}
                                        </h3>
                                        {event.location && (
                                            <p className="text-gray-500 text-sm mt-1">
                                                {event.location}
                                            </p>
                                        )}
                                        {event.attendee_count !== undefined && (
                                            <p className="text-gray-400 text-sm mt-2">
                                                {event.attendee_count} attending
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
