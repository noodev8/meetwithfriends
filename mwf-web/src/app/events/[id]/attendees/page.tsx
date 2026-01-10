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
    const [viewingLargePhoto, setViewingLargePhoto] = useState(false);

    // Order summary modal state
    const [showOrderSummary, setShowOrderSummary] = useState(false);
    const [copiedOrders, setCopiedOrders] = useState(false);

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
        setSelectedAttendee(person);
        setViewingLargePhoto(false);
        const attendee = person as Attendee;
        setEditFoodOrder(attendee.food_order || '');
        setEditDietaryNotes(attendee.dietary_notes || '');
    };

    // =======================================================================
    // Generate formatted order summary text
    // =======================================================================
    const generateOrderSummary = () => {
        const lines: string[] = [];
        lines.push(`${event?.title || 'Event'} - Orders`);
        lines.push('');

        attending.forEach((person) => {
            lines.push(person.name);
            if (person.food_order) {
                lines.push(person.food_order);
            } else {
                lines.push('No order submitted');
            }
            if (person.dietary_notes) {
                lines.push(`Notes: ${person.dietary_notes}`);
            }
            lines.push('');
        });

        return lines.join('\n').trim();
    };

    // =======================================================================
    // Copy orders to clipboard
    // =======================================================================
    const handleCopyOrders = async () => {
        const text = generateOrderSummary();
        try {
            await navigator.clipboard.writeText(text);
            setCopiedOrders(true);
            setTimeout(() => setCopiedOrders(false), 2000);
        } catch {
            alert('Failed to copy to clipboard');
        }
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

                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-display mb-2">
                                {event.title}
                            </h1>
                            <p className="text-stone-600">
                                {date} at {time}
                                {event.location && <span className="text-stone-400"> • {event.location}</span>}
                            </p>
                        </div>

                        {/* View Orders button for all group members */}
                        {canViewAttendees && event.preorders_enabled && (
                            <button
                                onClick={() => setShowOrderSummary(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span className="hidden sm:inline">View Orders</span>
                                <span className="sm:hidden">Orders</span>
                            </button>
                        )}
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

                {/* Attendee Grid */}
                {currentList.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
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
            {selectedAttendee && (() => {
                const isInGoing = attending.some(a => a.user_id === selectedAttendee.user_id);
                const isInWaitlist = waitlist.some(a => a.user_id === selectedAttendee.user_id);
                const isLoading = actionLoading === selectedAttendee.user_id;
                const showOrderForm = canManageAttendees && isInGoing && event?.preorders_enabled;

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
                                    <img
                                        src={selectedAttendee.avatar_url}
                                        alt={selectedAttendee.name}
                                        className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl object-cover shadow-2xl cursor-pointer"
                                        onClick={() => setViewingLargePhoto(false)}
                                    />
                                ) : (
                                    <div
                                        className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center shadow-2xl cursor-pointer"
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
                            {/* Header with photo and name */}
                            <div className="p-5 flex items-center gap-4 border-b border-stone-100">
                                {selectedAttendee.avatar_url ? (
                                    <img
                                        src={selectedAttendee.avatar_url}
                                        alt={selectedAttendee.name}
                                        className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                                        onClick={() => setViewingLargePhoto(true)}
                                    />
                                ) : (
                                    <div
                                        className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                                        onClick={() => setViewingLargePhoto(true)}
                                    >
                                        <span className="text-2xl font-bold text-white">
                                            {selectedAttendee.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-stone-900">{selectedAttendee.name}</h3>
                                    <p className="text-sm text-stone-500">
                                        {isInGoing ? 'Going' : isInWaitlist ? 'Waitlist' : 'Not going'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedAttendee(null)}
                                    className="p-1 text-stone-400 hover:text-stone-600 transition"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Order form for hosts/organisers */}
                            {showOrderForm && (
                                <div className="p-5 border-b border-stone-100">
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
                                <div className="p-4 bg-stone-50 flex flex-wrap justify-center gap-2">
                                    {isInGoing && (
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

            {/* Order Summary Modal */}
            {showOrderSummary && event && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowOrderSummary(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between flex-shrink-0">
                            <h3 className="text-lg font-bold text-stone-900 font-display">Orders</h3>
                            <button
                                onClick={() => setShowOrderSummary(false)}
                                className="p-1 text-stone-400 hover:text-stone-600 transition"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Order list - scrollable */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {attending.length > 0 ? (
                                <div className="space-y-4">
                                    {attending.map((person) => (
                                        <div key={person.user_id} className="pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                                            <p className="font-semibold text-stone-900">{person.name}</p>
                                            {person.food_order ? (
                                                <p className="text-stone-700 mt-1">{person.food_order}</p>
                                            ) : (
                                                <p className="text-stone-400 italic mt-1">No order submitted</p>
                                            )}
                                            {person.dietary_notes && (
                                                <p className="text-sm text-orange-600 mt-1">
                                                    Notes: {person.dietary_notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-stone-500 py-8">No attendees yet</p>
                            )}
                        </div>

                        {/* Footer with copy button */}
                        <div className="px-6 py-4 border-t border-stone-200 flex-shrink-0">
                            <button
                                onClick={handleCopyOrders}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition"
                            >
                                {copiedOrders ? (
                                    <>
                                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-green-600">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy to clipboard
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
