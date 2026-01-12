'use client';

/*
=======================================================================================================================================
Group Events Page
=======================================================================================================================================
Shows all events for a specific group with filter tabs (All, Going, Not Responded).
Accessible from the group page via "See all" link.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroup, GroupWithCount, GroupMembership } from '@/lib/api/groups';
import { getAllEvents, EventWithDetails } from '@/lib/api/events';
import SidebarLayout from '@/components/layout/SidebarLayout';

type FilterType = 'all' | 'going' | 'not_responded';

export default function GroupEventsPage() {
    const { user, token, isLoading } = useAuth();
    const params = useParams();
    const router = useRouter();

    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [membership, setMembership] = useState<GroupMembership | null>(null);
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
    // Fetch group details
    // =======================================================================
    useEffect(() => {
        async function fetchGroup() {
            if (!params.id) return;

            const result = await getGroup(Number(params.id), token || undefined);
            if (result.success && result.data) {
                setGroup(result.data.group);
                setMembership(result.data.membership);
            }
        }

        fetchGroup();
    }, [params.id, token]);

    // =======================================================================
    // Fetch group events
    // =======================================================================
    useEffect(() => {
        async function fetchEvents() {
            if (!params.id) return;

            const result = await getAllEvents(token || undefined, Number(params.id));
            if (result.success && result.data) {
                setEvents(result.data);
            }
            setLoading(false);
        }

        fetchEvents();
    }, [params.id, token]);

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

    // Check if user can create events
    const canCreateEvents = membership?.status === 'active' &&
        (membership?.role === 'organiser' || membership?.role === 'host');

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
                {/* Back link and header */}
                <Link
                    href={`/groups/${params.id}`}
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 transition-colors text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to {group?.name || 'group'}
                </Link>

                <div className="flex items-start justify-between gap-4 mb-1">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                            Events
                        </h1>
                        {group && (
                            <p className="text-slate-500 mt-1">{group.name}</p>
                        )}
                    </div>
                    {canCreateEvents && (
                        <Link
                            href={`/groups/${params.id}/events/create`}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 mt-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Event
                        </Link>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 mt-5 overflow-x-auto pb-1">
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
                            {filter === 'all' && 'Events for this group will appear here.'}
                            {filter === 'going' && 'RSVP to events to see them here.'}
                            {filter === 'not_responded' && "You've responded to all events."}
                        </p>
                        {filter !== 'all' && events.length > 0 && (
                            <button
                                onClick={() => setFilter('all')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                            >
                                View all events
                            </button>
                        )}
                        {filter === 'all' && canCreateEvents && (
                            <Link
                                href={`/groups/${params.id}/events/create`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                            >
                                Create an event
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredEvents.map(event => {
                            const eventDate = new Date(event.date_time);
                            const isWaitlist = event.rsvp_status === 'waitlist';
                            const isFull = event.capacity != null && (event.attendee_count || 0) >= event.capacity;

                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    {/* Header: Status badges */}
                                    <div className="flex justify-end items-start mb-3">
                                        <div className="flex gap-1.5">
                                            {event.rsvp_status ? (
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
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full text-slate-600 bg-slate-100">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                    </svg>
                                                    Not responded
                                                </span>
                                            )}
                                            {event.status === 'cancelled' && (
                                                <span className="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                                                    Cancelled
                                                </span>
                                            )}
                                            {isFull && event.status !== 'cancelled' && !event.rsvp_status && (
                                                <span className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
                                                    Waitlist open
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
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
                                    <div className="flex items-center pt-4 mt-4 border-t border-slate-100">
                                        <span className="text-sm font-medium text-slate-500">
                                            {event.attendee_count || 0} going
                                        </span>
                                    </div>

                                    {/* CTA button */}
                                    <div className="mt-4">
                                        <span className="block w-full py-2.5 text-center text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition">
                                            Visit Event
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Past events link */}
                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                    <Link
                        href={`/groups/${params.id}/past-events`}
                        className="text-sm text-slate-400 hover:text-slate-600 transition"
                    >
                        View past events
                    </Link>
                </div>
            </div>
        </SidebarLayout>
    );
}
