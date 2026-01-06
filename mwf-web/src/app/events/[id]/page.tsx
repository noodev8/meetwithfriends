'use client';

/*
=======================================================================================================================================
Event Detail Page
=======================================================================================================================================
Displays a single event's details. Accessible to both logged-in and non-logged-in users.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEvent, EventWithDetails } from '@/lib/api/events';

export default function EventDetailPage() {
    const { user, token, logout } = useAuth();
    const params = useParams();
    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // =======================================================================
    // Fetch event details
    // =======================================================================
    useEffect(() => {
        async function fetchEvent() {
            if (!params.id) return;

            const result = await getEvent(Number(params.id), token || undefined);
            if (result.success && result.data) {
                setEvent(result.data);
            } else {
                setError(result.error || 'Event not found');
            }
            setLoading(false);
        }
        fetchEvent();
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
    if (error || !event) {
        return (
            <main className="min-h-screen flex flex-col bg-gray-50">
                <header className="flex justify-between items-center px-8 py-4 bg-white border-b">
                    <Link href={user ? '/dashboard' : '/'} className="text-xl font-bold text-blue-600">
                        Meet With Friends
                    </Link>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-gray-600 mb-4">{error || 'Event not found'}</p>
                    <Link href="/events" className="text-blue-600 hover:text-blue-700">
                        Back to events
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Format date for display
    // =======================================================================
    const eventDate = new Date(event.date_time);
    const isPast = eventDate < new Date();
    const isCancelled = event.status === 'cancelled';

    // =======================================================================
    // Event detail view
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

            {/* Event Content */}
            <div className="flex-1 px-8 py-8 max-w-4xl mx-auto w-full">
                {/* Status badges */}
                {(isCancelled || isPast) && (
                    <div className="mb-4">
                        {isCancelled && (
                            <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                Cancelled
                            </span>
                        )}
                        {isPast && !isCancelled && (
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                Past Event
                            </span>
                        )}
                    </div>
                )}

                {/* Event header */}
                <div className="bg-white rounded-lg border p-6 mb-6">
                    <p className="text-blue-600 font-medium mb-2">
                        {eventDate.toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                        {' at '}
                        {eventDate.toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                    <Link
                        href={`/groups/${event.group_id}`}
                        className="text-gray-600 hover:text-blue-600 transition"
                    >
                        Hosted by {event.group_name}
                    </Link>
                </div>

                {/* Event details */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Description */}
                        {event.description && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
                                <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                            </div>
                        )}

                        {/* Location */}
                        {event.location && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
                                <p className="text-gray-700">{event.location}</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Attendees */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendees</h2>
                            <p className="text-gray-700 mb-2">
                                {event.attendee_count} attending
                                {event.capacity && ` of ${event.capacity}`}
                            </p>
                            {event.waitlist_count > 0 && (
                                <p className="text-orange-600 text-sm">
                                    {event.waitlist_count} on waitlist
                                </p>
                            )}
                        </div>

                        {/* RSVP Button */}
                        {!isPast && !isCancelled && user && (
                            <button
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                                onClick={() => {
                                    // TODO: Implement RSVP functionality
                                    alert('RSVP functionality coming soon!');
                                }}
                            >
                                RSVP
                            </button>
                        )}

                        {!user && !isPast && !isCancelled && (
                            <Link
                                href="/login"
                                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-center"
                            >
                                Log in to RSVP
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
