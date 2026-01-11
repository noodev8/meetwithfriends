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
import SidebarLayout from '@/components/layout/SidebarLayout';

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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-4">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mb-6 sm:mb-8">
                    Your Events
                </h1>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 mt-4">Loading your events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">📅</div>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-2">No upcoming events</h2>
                        <p className="text-slate-500 mb-6">
                            Events you RSVP to will appear here.
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                        >
                            Browse events
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {events.map(event => {
                            const eventDate = new Date(event.date_time);
                            const isWaitlist = event.rsvp_status === 'waitlist';

                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    {/* Header: Group badge + status */}
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                                            {event.group_name}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                                            isWaitlist
                                                ? 'text-yellow-800 bg-yellow-100'
                                                : 'text-green-800 bg-green-100'
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
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2">
                                        {event.title}
                                    </h3>

                                    {/* Date & Time */}
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {eventDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </div>

                                    {/* Location */}
                                    {event.location && (
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="line-clamp-1">{event.location}</span>
                                        </div>
                                    )}

                                    {/* Footer: Attendee count */}
                                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                                        <span className="text-sm font-medium text-slate-500">
                                            {event.attendee_count || 0} going
                                        </span>
                                        <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}
