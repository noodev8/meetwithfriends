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
    manageAttendee,
    updateOrder,
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
    const [canManageAttendees, setCanManageAttendees] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // UI state
    const [activeTab, setActiveTab] = useState<Tab>('going');
    const [sortBy, setSortBy] = useState<SortBy>('rsvp_time');
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | NotGoingAttendee | null>(null);

    // Order editing state
    const [editFoodOrder, setEditFoodOrder] = useState('');
    const [editDietaryNotes, setEditDietaryNotes] = useState('');
    const [orderSaving, setOrderSaving] = useState(false);

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
    // Handle order update
    // =======================================================================
    const handleSaveOrder = async () => {
        if (!token || !event || !selectedAttendee) return;

        setOrderSaving(true);
        const result = await updateOrder(token, event.id, selectedAttendee.user_id, editFoodOrder, editDietaryNotes);
        setOrderSaving(false);

        if (result.success) {
            // Update the local attending list with new order
            setAttending(prev => prev.map(a =>
                a.user_id === selectedAttendee.user_id
                    ? { ...a, food_order: editFoodOrder || null, dietary_notes: editDietaryNotes || null }
                    : a
            ));
            setSelectedAttendee(null);
        } else {
            alert(result.error || 'Failed to save order');
        }
    };

    // =======================================================================
    // Handle selecting an attendee (populate edit fields)
    // =======================================================================
    const handleSelectAttendee = (person: Attendee | NotGoingAttendee) => {
        handleSelectAttendee(person);
        const attendee = person as Attendee;
        setEditFoodOrder(attendee.food_order || '');
        setEditDietaryNotes(attendee.dietary_notes || '');
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
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
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

                {/* Attendee List/Grid */}
                {currentList.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                        {/* List view for Going tab when pre-orders are enabled */}
                        {activeTab === 'going' && event.preorders_enabled ? (
                            <div className="space-y-2">
                                {currentList.map((person) => {
                                    const attendee = person as Attendee;
                                    const isHostUser = isHost(person.user_id);

                                    return (
                                        <button
                                            key={person.user_id}
                                            onClick={() => handleSelectAttendee(person)}
                                            className="w-full flex items-start gap-4 p-3 rounded-xl hover:bg-stone-50 transition text-left"
                                        >
                                                {/* Avatar */}
                                                <div className="relative flex-shrink-0">
                                                    {person.avatar_url ? (
                                                        <img
                                                            src={person.avatar_url}
                                                            alt={person.name}
                                                            className="w-12 h-12 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                            <span className="text-lg font-medium text-amber-600">
                                                                {person.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {isHostUser && (
                                                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-medium rounded">
                                                            Host
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Name and Order */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-stone-900">
                                                            {person.name}
                                                        </span>
                                                        {attendee.guest_count > 0 && (
                                                            <span className="text-xs text-stone-500">
                                                                +{attendee.guest_count} guest{attendee.guest_count > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-stone-400">
                                                            {formatRsvpTime(person.rsvp_at)}
                                                        </span>
                                                    </div>
                                                    {attendee.food_order ? (
                                                        <p className="text-sm text-stone-600 mt-0.5">
                                                            {attendee.food_order}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-stone-400 mt-0.5 italic">
                                                            No order submitted
                                                        </p>
                                                    )}
                                                    {attendee.dietary_notes && (
                                                        <p className="text-xs text-orange-600 mt-0.5">
                                                            {attendee.dietary_notes}
                                                        </p>
                                                    )}
                                                </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Grid view for other tabs or when pre-orders disabled */
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
                                                    <img
                                                        src={person.avatar_url}
                                                        alt={person.name}
                                                        className="w-20 h-20 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                        <span className="text-2xl font-medium text-amber-600">
                                                            {person.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                {isHostUser && (
                                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
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
                                            <span className="text-sm font-medium text-stone-900">
                                                {person.name}
                                            </span>

                                            {/* Role/Guest info */}
                                            <span className="text-xs text-stone-500">
                                                {isHostUser ? 'Event Host' :
                                                 activeTab === 'going' && attendee.guest_count > 0
                                                    ? `+${attendee.guest_count} guest${attendee.guest_count > 1 ? 's' : ''}`
                                                    : 'Member'}
                                            </span>

                                            {/* RSVP time */}
                                            <span className="text-xs text-stone-400">
                                                {formatRsvpTime(person.rsvp_at)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
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

            {/* Profile Modal - Focus on the face */}
            {selectedAttendee && (() => {
                const isInGoing = attending.some(a => a.user_id === selectedAttendee.user_id);
                const isInWaitlist = waitlist.some(a => a.user_id === selectedAttendee.user_id);
                const isLoading = actionLoading === selectedAttendee.user_id;

                return (
                    <div
                        className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
                        onClick={() => setSelectedAttendee(null)}
                    >
                        <div
                            className="relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedAttendee(null)}
                                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition"
                                aria-label="Close"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Large photo */}
                            {selectedAttendee.avatar_url ? (
                                <img
                                    src={selectedAttendee.avatar_url}
                                    alt={selectedAttendee.name}
                                    className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl object-cover shadow-2xl"
                                />
                            ) : (
                                <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center shadow-2xl">
                                    <span className="text-8xl font-bold text-white">
                                        {selectedAttendee.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Name below */}
                            <p className="text-center mt-4 text-xl font-medium text-white">
                                {selectedAttendee.name}
                            </p>

                            {/* Order editing for hosts/organisers */}
                            {canManageAttendees && isInGoing && event?.preorders_enabled && (
                                <div className="mt-4 bg-white rounded-xl p-4 w-72 sm:w-80">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-600 mb-1">
                                                Order
                                            </label>
                                            <input
                                                type="text"
                                                value={editFoodOrder}
                                                onChange={(e) => setEditFoodOrder(e.target.value)}
                                                placeholder="e.g., Chicken Caesar Salad"
                                                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-600 mb-1">
                                                Notes
                                            </label>
                                            <input
                                                type="text"
                                                value={editDietaryNotes}
                                                onChange={(e) => setEditDietaryNotes(e.target.value)}
                                                placeholder="e.g., No nuts, gluten free"
                                                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSaveOrder}
                                            disabled={orderSaving}
                                            className="w-full px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                                        >
                                            {orderSaving ? 'Saving...' : 'Save Order'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action buttons for hosts/organisers */}
                            {canManageAttendees && (isInGoing || isInWaitlist) && (
                                <div className="flex justify-center gap-3 mt-4">
                                    {isInGoing && (
                                        <button
                                            onClick={() => handleManageAttendee(selectedAttendee.user_id, 'demote')}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition disabled:opacity-50"
                                        >
                                            {isLoading ? 'Moving...' : 'Move to waitlist'}
                                        </button>
                                    )}
                                    {isInWaitlist && (
                                        <button
                                            onClick={() => handleManageAttendee(selectedAttendee.user_id, 'promote')}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                                        >
                                            {isLoading ? 'Moving...' : 'Move to going'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleManageAttendee(selectedAttendee.user_id, 'remove')}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                                    >
                                        {isLoading ? 'Removing...' : 'Remove'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </main>
    );
}
