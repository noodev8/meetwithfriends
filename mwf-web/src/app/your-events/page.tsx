'use client';

/*
=======================================================================================================================================
Your Events Page
=======================================================================================================================================
Shows all upcoming events from groups the user is a member of.
Includes filter tabs to show All, Going, or Not Responded events.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyEvents, EventWithDetails } from '@/lib/api/events';
import SidebarLayout from '@/components/layout/SidebarLayout';
import EventCard from '@/components/ui/EventCard';

type FilterType = 'all' | 'going' | 'not_responded';

export default function YourEventsPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    // =======================================================================
    // Redirect to landing if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Fetch all events from user's groups
    // =======================================================================
    useEffect(() => {
        async function fetchEvents() {
            if (!token) return;

            const result = await getMyEvents(token);
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
    // Filter events based on selected filter
    // =======================================================================
    const filteredEvents = events.filter(event => {
        if (filter === 'all') return true;
        if (filter === 'going') return event.rsvp_status === 'attending' || event.rsvp_status === 'waitlist';
        if (filter === 'not_responded') return !event.rsvp_status;
        return true;
    });

    // Count events for each filter
    const counts = {
        all: events.length,
        going: events.filter(e => e.rsvp_status === 'attending' || e.rsvp_status === 'waitlist').length,
        not_responded: events.filter(e => !e.rsvp_status).length,
    };

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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mb-4">
                    Events
                </h1>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition ${
                            filter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All {counts.all > 0 && <span className="ml-1">({counts.all})</span>}
                    </button>
                    <button
                        onClick={() => setFilter('going')}
                        className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition ${
                            filter === 'going'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Going {counts.going > 0 && <span className="ml-1">({counts.going})</span>}
                    </button>
                    <button
                        onClick={() => setFilter('not_responded')}
                        className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition ${
                            filter === 'not_responded'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Not Responded {counts.not_responded > 0 && <span className="ml-1">({counts.not_responded})</span>}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 mt-4">Loading events...</p>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">📅</div>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-2">
                            {filter === 'all' && 'No upcoming events'}
                            {filter === 'going' && 'Not going to any events yet'}
                            {filter === 'not_responded' && 'All caught up!'}
                        </h2>
                        <p className="text-slate-500 mb-6">
                            {filter === 'all' && 'Events from your groups will appear here.'}
                            {filter === 'going' && 'RSVP to events to see them here.'}
                            {filter === 'not_responded' && "You've responded to all your events."}
                        </p>
                        {filter !== 'all' && events.length > 0 && (
                            <button
                                onClick={() => setFilter('all')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                            >
                                View all events
                            </button>
                        )}
                        {filter === 'all' && (
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                            >
                                Go to dashboard
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredEvents.map(event => (
                            <EventCard key={event.id} event={event} from="your-events" />
                        ))}
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}
