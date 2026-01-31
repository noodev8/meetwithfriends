'use client';

/*
=======================================================================================================================================
Home Dashboard (My Events Page)
=======================================================================================================================================
Primary landing screen for logged-in users. Dashboard approach showing:
- Greeting
- Summary stat cards (Events count, Groups count)
- "Next Up" section (next upcoming RSVP'd event)
See USER-FLOW.md for design rationale.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyRsvps, getMyEvents, EventWithDetails } from '@/lib/api/events';
import { getMyGroups, MyGroup } from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';
import EventCard from '@/components/ui/EventCard';

export default function MyEventsPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [rsvpEvents, setRsvpEvents] = useState<EventWithDetails[]>([]);
    const [allEvents, setAllEvents] = useState<EventWithDetails[]>([]);
    const [groups, setGroups] = useState<MyGroup[]>([]);
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
    // Fetch all dashboard data in parallel
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (!token) return;

            const [rsvpsResult, eventsResult, groupsResult] = await Promise.all([
                getMyRsvps(token),
                getMyEvents(token),
                getMyGroups(token),
            ]);

            if (rsvpsResult.success && rsvpsResult.data) {
                setRsvpEvents(rsvpsResult.data);
            }
            if (eventsResult.success && eventsResult.data) {
                setAllEvents(eventsResult.data);
            }
            if (groupsResult.success && groupsResult.data) {
                setGroups(groupsResult.data);
            }
            setLoading(false);
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-4">Loading...</p>
            </main>
        );
    }

    const firstName = user.name?.split(' ')[0] || 'there';
    // New user = no groups yet
    const isNewUser = !loading && groups.length === 0;
    const nextEvent = rsvpEvents.length > 0 ? rsvpEvents[0] : null;

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 mt-4">Loading...</p>
                    </div>
                ) : isNewUser ? (
                    /* ============================================================
                       Welcome state for new users (no groups yet)
                       ============================================================ */
                    <div className="py-4 sm:py-8">
                        {/* Welcome message */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 mb-4">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mb-2">
                                Welcome, {firstName}!
                            </h1>
                            <p className="text-slate-500">
                                Create a group to start organizing events, or browse existing ones.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <Link
                                href="/groups/create"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create a Group
                            </Link>
                            <Link
                                href="/explore"
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                            >
                                Browse groups
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* ============================================================
                       Normal dashboard for users with groups
                       ============================================================ */
                    <>
                        {/* Greeting */}
                        <div className="mb-6">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                                Hello, {firstName}!
                            </h1>
                        </div>

                        {/* Summary stat cards */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <Link
                                href="/your-events/all"
                                className="bg-white p-4 sm:p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{allEvents.length}</p>
                                        <p className="text-sm text-slate-500">Total Events</p>
                                    </div>
                                </div>
                            </Link>

                            <Link
                                href="/my-groups"
                                className="bg-white p-4 sm:p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{groups.length}</p>
                                        <p className="text-sm text-slate-500">Groups</p>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Next Up section */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800">Next Up For You</h2>
                                {rsvpEvents.length > 0 && (
                                    <Link
                                        href="/your-events/all?filter=going"
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        See all
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                )}
                            </div>

                            {nextEvent ? (
                                <div className="max-w-md">
                                    <EventCard event={nextEvent} from="your-events" />
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                                    <div className="text-5xl mb-3">📅</div>
                                    <h3 className="text-lg font-semibold text-slate-800">No upcoming events</h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        RSVP to an event to see it here
                                    </p>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </SidebarLayout>
    );
}
