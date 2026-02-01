'use client';

/*
=======================================================================================================================================
Event Attendees Page
=======================================================================================================================================
Full attendees list with tabs (Going, Waitlist, Not Going) and sorting options.
=======================================================================================================================================
*/

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getEvent,
    getAttendees,
    getHosts,
    manageAttendee,
    EventWithDetails,
    Attendee,
    NotGoingAttendee,
} from '@/lib/api/events';
import { EventHost } from '@/types';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { FEATURE_GUESTS_ENABLED } from '@/lib/featureFlags';

type Tab = 'going' | 'waitlist' | 'not_going';
type SortBy = 'rsvp_time' | 'name';

export default function AttendeesPage() {
    const { token } = useAuth();
    const params = useParams();

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [hosts, setHosts] = useState<EventHost[]>([]);
    const [attending, setAttending] = useState<Attendee[]>([]);
    const [waitlist, setWaitlist] = useState<Attendee[]>([]);
    const [notGoing, setNotGoing] = useState<NotGoingAttendee[]>([]);
    const [attendingCount, setAttendingCount] = useState(0);
    const [totalGuestCount, setTotalGuestCount] = useState(0);
    const [waitlistCount, setWaitlistCount] = useState(0);
    const [notGoingCount, setNotGoingCount] = useState(0);
    const [canViewAttendees, setCanViewAttendees] = useState(false);
    const [canManageAttendees, setCanManageAttendees] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // UI state
    const [activeTab, setActiveTab] = useState<Tab>('going');
    const [sortBy, setSortBy] = useState<SortBy>('rsvp_time');
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | NotGoingAttendee | null>(null);

    const [viewingLargePhoto, setViewingLargePhoto] = useState(false);

    // =======================================================================
    // Fetch event and attendees
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (!params.id) return;

            const eventId = Number(params.id);

            const [eventResult, attendeesResult, hostsResult] = await Promise.all([
                getEvent(eventId, token || undefined),
                getAttendees(eventId, token || undefined),
                getHosts(eventId),
            ]);

            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setCanManageAttendees(eventResult.data.can_edit);
            } else {
                setError(eventResult.error || 'Event not found');
            }

            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setNotGoing(attendeesResult.data.not_going);
                setAttendingCount(attendeesResult.data.attending_count);
                setTotalGuestCount(attendeesResult.data.total_guest_count);
                setWaitlistCount(attendeesResult.data.waitlist_count);
                setNotGoingCount(attendeesResult.data.not_going_count);
                setCanViewAttendees(attendeesResult.data.is_member);
            }

            if (hostsResult.success && hostsResult.data) {
                setHosts(hostsResult.data);
            }

            setLoading(false);
        }
        fetchData();
    }, [params.id, token]);

    // =======================================================================
    // Check if user is a host
    // =======================================================================
    const isHost = (userId: number) => hosts.some(h => h.user_id === userId);

    // =======================================================================
    // Sort attendees
    // =======================================================================
    const sortAttendees = <T extends { name: string; rsvp_at: string }>(list: T[]): T[] => {
        return [...list].sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            // Default: rsvp_time (earliest first)
            return new Date(a.rsvp_at).getTime() - new Date(b.rsvp_at).getTime();
        });
    };

    // =======================================================================
    // Format date/time
    // =======================================================================
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            }),
            time: date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        };
    };

    const formatRsvpTime = (dateString: string) => {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
        });
        const timeStr = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${dateStr}, ${timeStr}`;
    };

    // =======================================================================
    // Manage attendee actions
    // =======================================================================
    const handleManageAttendee = async (userId: number, action: 'remove' | 'demote' | 'promote') => {
        if (!token || !event) return;

        const actionLabels = {
            remove: 'remove from event',
            demote: 'move to waitlist',
            promote: 'move to going',
        };

        if (!confirm(`Are you sure you want to ${actionLabels[action]} this person?`)) return;

        setActionLoading(userId);
        const result = await manageAttendee(token, event.id, userId, action);
        setActionLoading(null);

        if (result.success) {
            // Close modal and refresh the attendees list
            setSelectedAttendee(null);
            const attendeesResult = await getAttendees(event.id, token);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setNotGoing(attendeesResult.data.not_going);
                setAttendingCount(attendeesResult.data.attending_count);
                setTotalGuestCount(attendeesResult.data.total_guest_count);
                setWaitlistCount(attendeesResult.data.waitlist_count);
                setNotGoingCount(attendeesResult.data.not_going_count);
            }
        } else {
            alert(result.error || 'Failed to update attendee');
        }
    };

    // =======================================================================
    // Handle selecting an attendee
    // =======================================================================
    const handleSelectAttendee = (person: Attendee | NotGoingAttendee) => {
        setSelectedAttendee(person);
        setViewingLargePhoto(false);
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 mt-4">Loading attendees...</p>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !event) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🎫</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found</h1>
                        <p className="text-slate-600 mb-6">{error || 'This event may have been removed.'}</p>
                        <Link
                            href="/your-events"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                        >
                            Back to your events
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Non-member state
    // =======================================================================
    if (!canViewAttendees) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="text-center">
                        <div className="text-6xl mb-4">👥</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Members only</h1>
                        <p className="text-slate-600 mb-6">Join this group to see who's attending.</p>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                        >
                            Back to event
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    const { date, time } = formatDateTime(event.date_time);

    // Get current list based on active tab
    const getCurrentList = () => {
        switch (activeTab) {
            case 'going':
                return sortAttendees(attending);
            case 'waitlist':
                return sortAttendees(waitlist);
            case 'not_going':
                return sortAttendees(notGoing);
        }
    };

    const currentList = getCurrentList();

    return (
        <SidebarLayout>
            {/* Event Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-3 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to event
                    </Link>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display mb-2">
                            {event.title}
                        </h1>
                        <p className="text-slate-600">
                            {date} at {time}
                            {event.location && <span className="text-slate-400"> &bull; {event.location}</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-6">
                {/* Tabs and Sort */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('going')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                activeTab === 'going'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Going ({attendingCount}{FEATURE_GUESTS_ENABLED && totalGuestCount > 0 ? ` +${totalGuestCount}` : ''})
                        </button>
                        {(waitlistCount > 0 || event?.waitlist_enabled !== false) && (
                        <button
                            onClick={() => setActiveTab('waitlist')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                activeTab === 'waitlist'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Waitlist ({waitlistCount})
                        </button>
                        )}
                        <button
                            onClick={() => setActiveTab('not_going')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                activeTab === 'not_going'
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Not Going ({notGoingCount})
                        </button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                        >
                            <option value="rsvp_time">RSVP time</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                {/* Attendee Grid */}
                {currentList.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex flex-wrap gap-6 sm:gap-8">
                                {currentList.map((person) => {
                                    const attendee = person as Attendee;
                                    const isHostUser = isHost(person.user_id);

                                    return (
                                        <button
                                            key={person.user_id}
                                            onClick={() => handleSelectAttendee(person)}
                                            className="flex flex-col items-center text-center hover:opacity-80 transition"
                                        >
                                            {/* Avatar */}
                                            <div className="relative mb-2">
                                                {person.avatar_url ? (
                                                    <div className="relative w-20 h-20">
                                                        <Image
                                                            src={person.avatar_url}
                                                            alt={person.name}
                                                            fill
                                                            className="rounded-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                                                        <span className="text-2xl font-medium text-indigo-600">
                                                            {person.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                {isHostUser && (
                                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded">
                                                        Host
                                                    </span>
                                                )}
                                                {activeTab === 'waitlist' && attendee.waitlist_position && (
                                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-yellow-500 text-white text-xs font-medium rounded">
                                                        #{attendee.waitlist_position}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Name */}
                                            <span className="text-sm font-medium text-slate-900">
                                                {person.name}
                                            </span>

                                            {/* Role/Guest info */}
                                            <span className="text-xs text-slate-500">
                                                {isHostUser ? 'Event Host' :
                                                 FEATURE_GUESTS_ENABLED && activeTab === 'going' && attendee.guest_count > 0
                                                    ? `+${attendee.guest_count} guest${attendee.guest_count > 1 ? 's' : ''}`
                                                    : 'Member'}
                                            </span>

                                            {/* RSVP time */}
                                            <span className="text-xs text-slate-400">
                                                {formatRsvpTime(person.rsvp_at)}
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="text-4xl mb-3">
                            {activeTab === 'going' && '👥'}
                            {activeTab === 'waitlist' && '⏳'}
                            {activeTab === 'not_going' && '👋'}
                        </div>
                        <p className="text-slate-500">
                            {activeTab === 'going' && 'No one is going yet'}
                            {activeTab === 'waitlist' && 'No one on the waitlist'}
                            {activeTab === 'not_going' && 'No one has cancelled'}
                        </p>
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            {selectedAttendee && (() => {
                const isInGoing = attending.some(a => a.user_id === selectedAttendee.user_id);
                const isInWaitlist = waitlist.some(a => a.user_id === selectedAttendee.user_id);
                const isLoading = actionLoading === selectedAttendee.user_id;

                // Large photo view
                if (viewingLargePhoto) {
                    return (
                        <div
                            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
                            onClick={() => setViewingLargePhoto(false)}
                        >
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setViewingLargePhoto(false)}
                                    className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                {selectedAttendee.avatar_url ? (
                                    <div
                                        className="relative w-72 h-72 sm:w-80 sm:h-80 cursor-pointer"
                                        onClick={() => setViewingLargePhoto(false)}
                                    >
                                        <Image
                                            src={selectedAttendee.avatar_url}
                                            alt={selectedAttendee.name}
                                            fill
                                            className="rounded-2xl object-cover shadow-2xl"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl bg-gradient-to-br from-indigo-200 to-violet-300 flex items-center justify-center shadow-2xl cursor-pointer"
                                        onClick={() => setViewingLargePhoto(false)}
                                    >
                                        <span className="text-8xl font-bold text-white">
                                            {selectedAttendee.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <p className="text-center mt-4 text-xl font-medium text-white">
                                    {selectedAttendee.name}
                                </p>
                            </div>
                        </div>
                    );
                }

                // Card modal view
                return (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                        onClick={() => setSelectedAttendee(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with large photo */}
                            <div className="p-5 border-b border-slate-100">
                                {/* Close button */}
                                <div className="flex justify-end mb-3">
                                    <button
                                        onClick={() => setSelectedAttendee(null)}
                                        className="p-1 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Large avatar - centered */}
                                <div className="flex flex-col items-center">
                                    {selectedAttendee.avatar_url ? (
                                        <div
                                            className="relative w-40 h-40 cursor-pointer hover:opacity-90 transition"
                                            onClick={() => setViewingLargePhoto(true)}
                                        >
                                            <Image
                                                src={selectedAttendee.avatar_url}
                                                alt={selectedAttendee.name}
                                                fill
                                                className="rounded-2xl object-cover shadow-md"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className="w-40 h-40 rounded-2xl bg-gradient-to-br from-indigo-200 to-violet-300 flex items-center justify-center cursor-pointer hover:opacity-90 transition shadow-md"
                                            onClick={() => setViewingLargePhoto(true)}
                                        >
                                            <span className="text-5xl font-bold text-white">
                                                {selectedAttendee.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Name and status below photo */}
                                    <h3 className="text-xl font-semibold text-slate-900 mt-4">{selectedAttendee.name}</h3>
                                    <p className="text-sm text-slate-500">
                                        {isInGoing ? 'Going' : isInWaitlist ? 'Waitlist' : 'Not going'}
                                    </p>
                                </div>
                            </div>

                            {/* Action buttons for hosts/organisers */}
                            {canManageAttendees && (isInGoing || isInWaitlist) && (
                                <div className="p-4 bg-slate-50 flex flex-wrap justify-center gap-2">
                                    {isInGoing && event?.waitlist_enabled !== false && (
                                        <button
                                            onClick={() => handleManageAttendee(selectedAttendee.user_id, 'demote')}
                                            disabled={isLoading}
                                            className="px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-100 rounded-lg transition disabled:opacity-50"
                                        >
                                            {isLoading ? 'Moving...' : 'Move to waitlist'}
                                        </button>
                                    )}
                                    {isInWaitlist && (
                                        <button
                                            onClick={() => handleManageAttendee(selectedAttendee.user_id, 'promote')}
                                            disabled={isLoading}
                                            className="px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                                        >
                                            {isLoading ? 'Moving...' : 'Move to going'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleManageAttendee(selectedAttendee.user_id, 'remove')}
                                        disabled={isLoading}
                                        className="px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                                    >
                                        {isLoading ? 'Removing...' : 'Remove from event'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

        </SidebarLayout>
    );
}
