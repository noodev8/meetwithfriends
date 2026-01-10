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
import Footer from '@/components/layout/Footer';

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {events.map(event => {
                            const eventDate = new Date(event.date_time);
                            const isWaitlist = event.rsvp_status === 'waitlist';
                            const imageUrl = event.image_url || event.group_image_url;

                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all shadow-sm overflow-hidden"
                                >
                                    {/* Image header */}
                                    <div className="relative h-36 bg-stone-100">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={event.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                style={{ objectPosition: event.image_url ? (event.image_position || 'center') : 'center' }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                <svg className="w-10 h-10 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Status badge overlay */}
                                        <span className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${
                                            isWaitlist
                                                ? 'text-yellow-800 bg-yellow-100'
                                                : 'text-green-800 bg-green-100'
                                        }`}>
                                            {isWaitlist ? (
                                                <>
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                    On waitlist
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

                                    {/* Content */}
                                    <div className="p-4">
                                        <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">
                                            {event.group_name}
                                        </p>
                                        <h3 className="text-base font-semibold text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                                            {event.title}
                                        </h3>
                                        <p className="text-sm text-stone-500 mt-1">
                                            {eventDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {event.location && (
                                            <p className="text-stone-500 text-sm mt-1 flex items-center gap-1.5 line-clamp-1">
                                                <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {event.location}
                                            </p>
                                        )}
                                        <p className="text-xs text-stone-400 mt-2">
                                            {event.attendee_count || 0} attending
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <Footer />
        </main>
    );
}
