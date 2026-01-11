'use client';

/*
=======================================================================================================================================
Past Events Page
=======================================================================================================================================
Shows past events for a group with load more pagination.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroup, GroupWithCount } from '@/lib/api/groups';
import { listEvents, EventWithDetails } from '@/lib/api/events';
import SidebarLayout from '@/components/layout/SidebarLayout';

const PAGE_SIZE = 10;

export default function PastEventsPage() {
    const { token } = useAuth();
    const params = useParams();

    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // =======================================================================
    // Fetch group details
    // =======================================================================
    useEffect(() => {
        async function fetchGroup() {
            if (!params.id) return;

            const result = await getGroup(Number(params.id), token || undefined);
            if (result.success && result.data) {
                setGroup(result.data.group);
            } else {
                setError(result.error || 'Group not found');
            }
        }
        fetchGroup();
    }, [params.id, token]);

    // =======================================================================
    // Fetch past events
    // =======================================================================
    const fetchEvents = useCallback(async () => {
        if (!params.id) return;

        setLoading(true);
        const result = await listEvents(token || undefined, {
            group_id: Number(params.id),
            past: true,
            limit: PAGE_SIZE,
            offset: 0,
        });

        if (result.success && result.data) {
            setEvents(result.data.events);
            setHasMore(result.data.has_more || false);
        }
        setLoading(false);
    }, [params.id, token]);

    useEffect(() => {
        if (group) {
            fetchEvents();
        }
    }, [group, fetchEvents]);

    // =======================================================================
    // Load more events
    // =======================================================================
    const loadMore = async () => {
        if (!params.id || loadingMore || !hasMore) return;

        setLoadingMore(true);
        const result = await listEvents(token || undefined, {
            group_id: Number(params.id),
            past: true,
            limit: PAGE_SIZE,
            offset: events.length,
        });

        if (result.success && result.data) {
            setEvents(prev => [...prev, ...result.data!.events]);
            setHasMore(result.data.has_more || false);
        }
        setLoadingMore(false);
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading && !group) {
        return (
            <SidebarLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 mt-4">Loading...</p>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !group) {
        return (
            <SidebarLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-slate-600 mb-4">{error || 'Group not found'}</p>
                    <Link
                        href="/dashboard"
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Past events page
    // =======================================================================
    return (
        <SidebarLayout>
            {/* Page Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
                    <Link
                        href={`/groups/${group.id}`}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-3 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to {group.name}
                    </Link>

                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                        Past Events
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Previous events from {group.name}
                    </p>
                </div>
            </div>

            {/* Events List */}
            <div className="flex-1 px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-600 mt-4">Loading past events...</p>
                    </div>
                ) : events.length > 0 ? (
                    <>
                        <div className="grid gap-4">
                            {events.map(event => {
                                const eventDate = new Date(event.date_time);
                                const attendeeCount = event.attendee_count || 0;

                                return (
                                    <Link
                                        key={event.id}
                                        href={`/events/${event.id}`}
                                        className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            {/* Date badge */}
                                            <div className="flex-shrink-0 w-16 h-16 bg-slate-100 rounded-xl flex flex-col items-center justify-center">
                                                <span className="text-xs font-medium text-slate-500 uppercase">
                                                    {eventDate.toLocaleDateString('en-GB', { month: 'short' })}
                                                </span>
                                                <span className="text-2xl font-bold text-slate-700">
                                                    {eventDate.getDate()}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {eventDate.getFullYear()}
                                                </span>
                                            </div>

                                            {/* Event details */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                    {event.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                                                    <span>
                                                        {eventDate.toLocaleTimeString('en-GB', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                    {event.location && (
                                                        <span className="truncate">{event.location}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-sm text-slate-400">
                                                        {attendeeCount} attended
                                                    </span>
                                                    {event.rsvp_status === 'attending' && (
                                                        <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                                            You went
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {loadingMore ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-slate-600 font-medium">No past events yet</p>
                        <p className="text-slate-500 text-sm mt-1">
                            Events will appear here after they've ended
                        </p>
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}
