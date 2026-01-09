'use client';

/*
=======================================================================================================================================
Your Events Page
=======================================================================================================================================
Personal calendar showing events the user is attending or on the waitlist for.
Displayed in chronological order with clear date groupings.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyRsvps, EventWithDetails } from '@/lib/api/events';
import Header from '@/components/layout/Header';

export default function YourEventsPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    // =======================================================================
    // Redirect to landing if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Fetch user's RSVP'd events
    // =======================================================================
    useEffect(() => {
        async function fetchEvents() {
            if (!token) return;

            const result = await getMyRsvps(token);
            if (result.success && result.data) {
                setEvents(result.data);
            }
            setLoading(false);
        }

        if (user && token) {
            fetchEvents();
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
    // Render
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto w-full">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
                    Your Events
                </h1>

                {loading ? (
                    <p className="text-gray-500">Loading your events...</p>
                ) : events.length === 0 ? (
                    <div className="bg-white rounded-lg border p-8 text-center">
                        <p className="text-gray-600 mb-4">No upcoming events</p>
                        <p className="text-gray-500 mb-6">
                            Events you RSVP to will appear here.
                        </p>
                        <Link
                            href="/dashboard"
                            className="text-blue-600 hover:text-blue-700"
                        >
                            Browse events on dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map(event => {
                            const eventDate = new Date(event.date_time);
                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="block bg-white rounded-lg border p-4 sm:p-6 hover:border-blue-300 transition"
                                >
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {/* Date badge */}
                                        <div className="flex-shrink-0 text-center sm:text-left">
                                            <div className="inline-block sm:block bg-blue-50 rounded-lg p-3 sm:w-20">
                                                <p className="text-sm text-blue-600 font-medium">
                                                    {eventDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                                                </p>
                                                <p className="text-2xl font-bold text-blue-700">
                                                    {eventDate.getDate()}
                                                </p>
                                                <p className="text-sm text-blue-600">
                                                    {eventDate.toLocaleDateString('en-GB', { month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Event details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-500 font-medium mb-1">
                                                {event.group_name}
                                            </p>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {event.title}
                                                </h3>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                    event.rsvp_status === 'attending'
                                                        ? 'text-green-700 bg-green-100'
                                                        : 'text-amber-700 bg-amber-100'
                                                }`}>
                                                    {event.rsvp_status === 'attending' ? 'Going' : 'Waitlist'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm mb-2">
                                                {eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                {event.location && ` · ${event.location}`}
                                            </p>
                                            <p className="text-gray-600 text-sm">
                                                {event.attendee_count || 0} going
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
