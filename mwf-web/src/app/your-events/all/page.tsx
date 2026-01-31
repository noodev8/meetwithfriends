'use client';

/*
=======================================================================================================================================
All Events Page
=======================================================================================================================================
Shows events with two filter tabs:
- "All Events": All upcoming events from user's groups (getMyEvents)
- "Going": Events user has RSVP'd to (getMyRsvps)
Supports ?filter=going query param to pre-select Going tab.
=======================================================================================================================================
*/

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyRsvps, getMyEvents, EventWithDetails } from '@/lib/api/events';
import SidebarLayout from '@/components/layout/SidebarLayout';
import EventCard from '@/components/ui/EventCard';

type FilterTab = 'all' | 'going';

function AllEventsContent() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialFilter = searchParams.get('filter') === 'going' ? 'going' : 'all';

    const [activeTab, setActiveTab] = useState<FilterTab>(initialFilter);
    const [allEvents, setAllEvents] = useState<EventWithDetails[]>([]);
    const [goingEvents, setGoingEvents] = useState<EventWithDetails[]>([]);
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
    // Fetch both datasets in parallel on mount
    // =======================================================================
    useEffect(() => {
        async function fetchEvents() {
            if (!token) return;

            const [allResult, goingResult] = await Promise.all([
                getMyEvents(token),
                getMyRsvps(token),
            ]);

            if (allResult.success && allResult.data) {
                setAllEvents(allResult.data);
            }
            if (goingResult.success && goingResult.data) {
                setGoingEvents(goingResult.data);
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

    const events = activeTab === 'all' ? allEvents : goingEvents;

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                        Events
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {activeTab === 'all'
                            ? `${allEvents.length} upcoming event${allEvents.length === 1 ? '' : 's'} from your groups`
                            : `${goingEvents.length} event${goingEvents.length === 1 ? '' : 's'} you're attending`}
                    </p>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                            activeTab === 'all'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All Events
                    </button>
                    <button
                        onClick={() => setActiveTab('going')}
                        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                            activeTab === 'going'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Going
                    </button>
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
                            {activeTab === 'all' ? 'No upcoming events' : 'No events yet'}
                        </h2>
                        <p className="text-slate-500 mt-2">
                            {activeTab === 'all'
                                ? 'There are no upcoming events in your groups'
                                : 'RSVP to an event to see it here'}
                        </p>
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

export default function AllMyEventsPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-4">Loading...</p>
            </main>
        }>
            <AllEventsContent />
        </Suspense>
    );
}
