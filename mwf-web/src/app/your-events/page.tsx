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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-600 mt-4">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto w-full">
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-display mb-6 sm:mb-8">
                    Your Events
                </h1>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-stone-500 mt-4">Loading your events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">📅</div>
                        <h2 className="text-xl font-bold text-stone-900 font-display mb-2">No upcoming events</h2>
                        <p className="text-stone-500 mb-6">
                            Events you RSVP to will appear here.
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                        >
                            Browse events
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map(event => {
                            const eventDate = new Date(event.date_time);
                            const isWaitlist = event.rsvp_status === 'waitlist';
                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="block bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 hover:border-amber-300 hover:shadow-md transition-all shadow-sm"
                                >
                                    <div className="flex gap-4">
                                        {/* Date badge */}
                                        <div className="flex-shrink-0">
                                            <div className={`w-16 sm:w-20 rounded-xl p-2 sm:p-3 text-center ${
                                                isWaitlist
                                                    ? 'bg-yellow-50'
                                                    : 'bg-gradient-to-br from-amber-50 to-orange-50'
                                            }`}>
                                                <p className={`text-xs font-medium ${
                                                    isWaitlist ? 'text-yellow-600' : 'text-amber-600'
                                                }`}>
                                                    {eventDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                                                </p>
                                                <p className={`text-2xl sm:text-3xl font-bold ${
                                                    isWaitlist ? 'text-yellow-700' : 'text-amber-600'
                                                }`}>
                                                    {eventDate.getDate()}
                                                </p>
                                                <p className={`text-xs ${
                                                    isWaitlist ? 'text-yellow-600' : 'text-amber-600'
                                                }`}>
                                                    {eventDate.toLocaleDateString('en-GB', { month: 'short' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Event details */}
                                        <div className="flex-1 min-w-0 py-1">
                                            <p className="text-xs text-stone-500 font-medium mb-1">
                                                {event.group_name}
                                            </p>
                                            <h3 className="text-base sm:text-lg font-semibold text-stone-900 mb-1 line-clamp-1">
                                                {event.title}
                                            </h3>
                                            <p className="text-stone-500 text-sm mb-2">
                                                {eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                {event.location && (
                                                    <span className="text-stone-400"> · {event.location}</span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                                                    isWaitlist
                                                        ? 'text-yellow-700 bg-yellow-100'
                                                        : 'text-green-700 bg-green-100'
                                                }`}>
                                                    {isWaitlist ? (
                                                        <>
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                            Waitlist
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            Going
                                                        </>
                                                    )}
                                                </span>
                                                <span className="text-xs text-stone-400">
                                                    {event.attendee_count || 0} attending
                                                </span>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="flex-shrink-0 flex items-center">
                                            <svg className="w-5 h-5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
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
