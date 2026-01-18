'use client';

/*
=======================================================================================================================================
All My Events Page
=======================================================================================================================================
Full list of events user has committed to (RSVP'd as attending or waitlist).
Accessed via "View all" from the home dashboard when user has more events than the preview limit.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyRsvps, EventWithDetails } from '@/lib/api/events';
import SidebarLayout from '@/components/layout/SidebarLayout';
import EventCard from '@/components/ui/EventCard';

export default function AllMyEventsPage() {
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
    // Fetch all events user has committed to
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
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {/* Header with back link */}
                <div className="mb-6">
                    <Link
                        href="/your-events"
                        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                        All My Events
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {events.length} event{events.length === 1 ? '' : 's'} you&apos;re attending or waitlisted for
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 mt-4">Loading events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">📅</div>
                        <h2 className="text-xl font-bold text-slate-900 font-display">
                            No upcoming events
                        </h2>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {events.map(event => (
                            <EventCard key={event.id} event={event} from="your-events" />
                        ))}
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}
