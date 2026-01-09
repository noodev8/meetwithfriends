'use client';

/*
=======================================================================================================================================
Event Attendees Page
=======================================================================================================================================
Full attendees list with tabs (Going, Waitlist, Not Going) and sorting options.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getEvent,
    getAttendees,
    getHosts,
    EventWithDetails,
    Attendee,
    NotGoingAttendee,
} from '@/lib/api/events';
import { EventHost } from '@/types';
import Header from '@/components/layout/Header';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [activeTab, setActiveTab] = useState<Tab>('going');
    const [sortBy, setSortBy] = useState<SortBy>('rsvp_time');
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | NotGoingAttendee | null>(null);

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
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
        }) + ' at ' + date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-600 mt-4">Loading attendees...</p>
            </main>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !event) {
        return (
            <main className="min-h-screen flex flex-col bg-stone-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🎫</div>
                        <h1 className="text-2xl font-bold text-stone-900 mb-2">Event not found</h1>
                        <p className="text-stone-600 mb-6">{error || 'This event may have been removed.'}</p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Non-member state
    // =======================================================================
    if (!canViewAttendees) {
        return (
            <main className="min-h-screen flex flex-col bg-stone-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">👥</div>
                        <h1 className="text-2xl font-bold text-stone-900 mb-2">Members only</h1>
                        <p className="text-stone-600 mb-6">Join this group to see who's attending.</p>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                        >
                            Back to event
                        </Link>
                    </div>
                </div>
            </main>
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
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            {/* Event Header */}
            <div className="bg-white border-b border-stone-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
                    <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-3 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to event
                    </Link>

                    <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-display mb-2">
                        {event.title}
                    </h1>
                    <p className="text-stone-600">
                        {date} at {time}
                        {event.location && <span className="text-stone-400"> • {event.location}</span>}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-8 py-6">
                {/* Tabs and Sort */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('going')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                activeTab === 'going'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            Going ({attendingCount}{totalGuestCount > 0 ? ` +${totalGuestCount}` : ''})
                        </button>
                        <button
                            onClick={() => setActiveTab('waitlist')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                activeTab === 'waitlist'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            Waitlist ({waitlistCount})
                        </button>
                        <button
                            onClick={() => setActiveTab('not_going')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                activeTab === 'not_going'
                                    ? 'bg-stone-200 text-stone-700'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            Not Going ({notGoingCount})
                        </button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-stone-500">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                            <option value="rsvp_time">RSVP time</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                {/* Attendee List */}
                {currentList.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                        {currentList.map((person) => {
                            const attendee = person as Attendee;
                            const isHostUser = isHost(person.user_id);

                            return (
                                <div
                                    key={person.user_id}
                                    className="p-4 hover:bg-stone-50 transition"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Large Avatar - priority on seeing the face */}
                                        <button
                                            onClick={() => setSelectedAttendee(person)}
                                            className="flex-shrink-0 hover:opacity-80 transition"
                                        >
                                            {person.avatar_url ? (
                                                <img
                                                    src={person.avatar_url}
                                                    alt={person.name}
                                                    className="w-16 h-16 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
                                                    <span className="text-2xl font-bold text-white">
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </button>

                                        {/* Info - secondary to the photo */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    onClick={() => setSelectedAttendee(person)}
                                                    className="text-sm font-medium text-stone-900 hover:text-amber-600 transition text-left"
                                                >
                                                    {person.name}
                                                </button>
                                                {isHostUser && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                                        Host
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                                                {activeTab === 'going' && attendee.guest_count > 0 && (
                                                    <span>+{attendee.guest_count} guest{attendee.guest_count > 1 ? 's' : ''}</span>
                                                )}
                                                {activeTab === 'waitlist' && attendee.waitlist_position && (
                                                    <span className="text-yellow-600">#{attendee.waitlist_position}</span>
                                                )}
                                                <span>{formatRsvpTime(person.rsvp_at)}</span>
                                            </div>

                                            {/* Food order (only for going tab when preorders enabled) */}
                                            {activeTab === 'going' && event.preorders_enabled && (attendee.food_order || attendee.dietary_notes) && (
                                                <div className="mt-1 text-xs text-stone-500">
                                                    {attendee.food_order && <span>{attendee.food_order}</span>}
                                                    {attendee.food_order && attendee.dietary_notes && <span> • </span>}
                                                    {attendee.dietary_notes && (
                                                        <span className="text-orange-600">{attendee.dietary_notes}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                        <div className="text-4xl mb-3">
                            {activeTab === 'going' && '👥'}
                            {activeTab === 'waitlist' && '⏳'}
                            {activeTab === 'not_going' && '👋'}
                        </div>
                        <p className="text-stone-500">
                            {activeTab === 'going' && 'No one is going yet'}
                            {activeTab === 'waitlist' && 'No one on the waitlist'}
                            {activeTab === 'not_going' && 'No one has cancelled'}
                        </p>
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            {selectedAttendee && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedAttendee(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedAttendee(null)}
                            className="absolute top-3 right-3 p-2 text-stone-400 hover:text-stone-600 transition z-10"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Content */}
                        <div className="p-6 text-center">
                            {/* Large Avatar - main focus */}
                            <div className="flex justify-center mb-4">
                                {selectedAttendee.avatar_url ? (
                                    <img
                                        src={selectedAttendee.avatar_url}
                                        alt={selectedAttendee.name}
                                        className="w-44 h-44 rounded-full object-cover border-4 border-amber-100 shadow-lg"
                                    />
                                ) : (
                                    <div className="w-44 h-44 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center border-4 border-amber-100 shadow-lg">
                                        <span className="text-6xl font-bold text-white">
                                            {selectedAttendee.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-stone-900 font-display">
                                {selectedAttendee.name}
                            </h3>

                            {/* Host badge */}
                            {isHost(selectedAttendee.user_id) && (
                                <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                                    Host
                                </span>
                            )}

                            {/* Status */}
                            <div className="mt-3">
                                {activeTab === 'going' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                                        Going
                                        {(selectedAttendee as Attendee).guest_count > 0 && (
                                            <span className="text-green-600">
                                                +{(selectedAttendee as Attendee).guest_count} guest{(selectedAttendee as Attendee).guest_count > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </span>
                                )}
                                {activeTab === 'waitlist' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
                                        Waitlist #{(selectedAttendee as Attendee).waitlist_position}
                                    </span>
                                )}
                                {activeTab === 'not_going' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 text-stone-600 text-sm rounded-full">
                                        Not Going
                                    </span>
                                )}
                            </div>

                            {/* Food order info */}
                            {activeTab === 'going' && event.preorders_enabled && ((selectedAttendee as Attendee).food_order || (selectedAttendee as Attendee).dietary_notes) && (
                                <div className="mt-4 p-4 bg-stone-50 rounded-xl text-left">
                                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                                        Food Order
                                    </h4>
                                    {(selectedAttendee as Attendee).food_order && (
                                        <p className="text-sm text-stone-700">
                                            {(selectedAttendee as Attendee).food_order}
                                        </p>
                                    )}
                                    {(selectedAttendee as Attendee).dietary_notes && (
                                        <p className="text-sm text-orange-600 mt-1">
                                            {(selectedAttendee as Attendee).dietary_notes}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* RSVP date and time */}
                            <p className="mt-4 text-xs text-stone-400">
                                RSVP'd {formatRsvpTime(selectedAttendee.rsvp_at)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
