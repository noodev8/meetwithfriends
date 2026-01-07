'use client';

/*
=======================================================================================================================================
Events List Page
=======================================================================================================================================
Displays all upcoming events. Accessible to both logged-in and non-logged-in users.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllEvents, EventWithDetails } from '@/lib/api/events';
import Header from '@/components/layout/Header';

export default function EventsPage() {
    const { token } = useAuth();
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // =======================================================================
    // Fetch events
    // =======================================================================
    useEffect(() => {
        async function fetchEvents() {
            const result = await getAllEvents(token || undefined);
            if (result.success && result.data) {
                setEvents(result.data);
            }
            setLoadingData(false);
        }
        fetchEvents();
    }, [token]);

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Upcoming Events</h1>

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                href={`/events/${event.id}`}
                                className="bg-white rounded-lg border hover:shadow-md transition overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-blue-600 font-medium">
                                            {new Date(event.date_time).toLocaleDateString('en-GB', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        {event.status === 'cancelled' && (
                                            <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                                Cancelled
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 text-lg mt-2">
                                        {event.title}
                                    </h3>
                                    <p className="text-gray-500 text-sm mt-1">
                                        by {event.group_name}
                                    </p>
                                    {event.location && (
                                        <p className="text-gray-500 text-sm mt-2">
                                            {event.location}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-4 text-sm">
                                        <span className="text-gray-600">
                                            {event.attendee_count} attending
                                        </span>
                                        {event.waitlist_count > 0 && (
                                            <span className="text-orange-600">
                                                {event.waitlist_count} on waitlist
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
