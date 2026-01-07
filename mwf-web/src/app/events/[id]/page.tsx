'use client';

/*
=======================================================================================================================================
Event Detail Page
=======================================================================================================================================
Shows event details, RSVP functionality, and attendee list.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getEvent,
    getAttendees,
    rsvpEvent,
    manageAttendee,
    cancelEvent,
    restoreEvent,
    EventWithDetails,
    RsvpStatus,
    Attendee,
} from '@/lib/api/events';
import Header from '@/components/layout/Header';

export default function EventDetailPage() {
    const { user, token } = useAuth();
    const params = useParams();

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
    const [isGroupMember, setIsGroupMember] = useState(false);
    const [canManageAttendees, setCanManageAttendees] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [attending, setAttending] = useState<Attendee[]>([]);
    const [waitlist, setWaitlist] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [managingUser, setManagingUser] = useState<number | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // =======================================================================
    // Fetch event details and attendees
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (!params.id) return;

            const eventId = Number(params.id);

            // Fetch event and attendees in parallel
            const [eventResult, attendeesResult] = await Promise.all([
                getEvent(eventId, token || undefined),
                getAttendees(eventId),
            ]);

            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setRsvp(eventResult.data.rsvp);
                setIsGroupMember(eventResult.data.is_group_member);
                setCanManageAttendees(eventResult.data.can_manage_attendees);
                setCanEdit(eventResult.data.can_edit);
            } else {
                setError(eventResult.error || 'Event not found');
            }

            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
            }

            setLoading(false);
        }
        fetchData();
    }, [params.id, token]);

    // =======================================================================
    // Handle RSVP action
    // =======================================================================
    const handleRsvp = async (action: 'join' | 'leave') => {
        if (!token || !event) return;

        setRsvpLoading(true);
        const result = await rsvpEvent(token, event.id, action);
        setRsvpLoading(false);

        if (result.success && result.data) {
            setRsvp(result.data.rsvp);
            // Refresh attendees
            const attendeesResult = await getAttendees(event.id);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
            }
            // Update event counts
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
            }
        } else {
            alert(result.error || 'Failed to update RSVP');
        }
    };

    // =======================================================================
    // Handle manage attendee action
    // =======================================================================
    const handleManageAttendee = async (userId: number, action: 'remove' | 'demote' | 'promote') => {
        if (!token || !event) return;

        setManagingUser(userId);
        const result = await manageAttendee(token, event.id, userId, action);
        setManagingUser(null);

        if (result.success) {
            // Refresh attendees
            const attendeesResult = await getAttendees(event.id);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
            }
            // Update event counts
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
            }
        } else {
            alert(result.error || 'Failed to manage attendee');
        }
    };

    // =======================================================================
    // Handle cancel event
    // =======================================================================
    const handleCancelEvent = async () => {
        if (!token || !event) return;

        const confirmed = window.confirm(
            'Are you sure you want to cancel this event? This action cannot be undone.'
        );

        if (!confirmed) return;

        setCancelLoading(true);
        const result = await cancelEvent(token, event.id);
        setCancelLoading(false);

        if (result.success) {
            // Refresh event to show cancelled status
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setCanEdit(eventResult.data.can_edit);
            }
        } else {
            alert(result.error || 'Failed to cancel event');
        }
    };

    // =======================================================================
    // Handle restore event
    // =======================================================================
    const handleRestoreEvent = async () => {
        if (!token || !event) return;

        const confirmed = window.confirm(
            'Are you sure you want to restore this event? It will be visible and open for RSVPs again.'
        );

        if (!confirmed) return;

        setRestoreLoading(true);
        const result = await restoreEvent(token, event.id);
        setRestoreLoading(false);

        if (result.success) {
            // Refresh event to show restored status
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setCanEdit(eventResult.data.can_edit);
            }
        } else {
            alert(result.error || 'Failed to restore event');
        }
    };

    // =======================================================================
    // Format date/time
    // =======================================================================
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }),
            time: date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        };
    };

    // =======================================================================
    // Check if event is in the past
    // =======================================================================
    const isPastEvent = event ? new Date(event.date_time) < new Date() : false;

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !event) {
        return (
            <main className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-gray-600 mb-4">{error || 'Event not found'}</p>
                    <Link href="/events" className="text-blue-600 hover:text-blue-700">
                        Back to events
                    </Link>
                </div>
            </main>
        );
    }

    const { date, time } = formatDateTime(event.date_time);
    const spotsRemaining = event.capacity ? event.capacity - (event.attendee_count || 0) : null;

    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Event Header */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    {/* Breadcrumb */}
                    <div className="mb-4">
                        <Link
                            href={`/groups/${event.group_id}`}
                            className="text-blue-600 hover:text-blue-700"
                        >
                            &larr; {event.group_name}
                        </Link>
                    </div>

                    {/* Status badges */}
                    {(event.status === 'cancelled' || isPastEvent) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {event.status === 'cancelled' && (
                                <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">
                                    Cancelled
                                </span>
                            )}
                            {isPastEvent && event.status !== 'cancelled' && (
                                <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-full">
                                    Past Event
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                {event.title}
                            </h1>
                            <p className="text-gray-500">
                                Hosted by {event.creator_name}
                            </p>
                        </div>
                        {canEdit && (
                            <div className="flex gap-2 sm:flex-shrink-0">
                                <Link
                                    href={`/events/${event.id}/edit`}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center"
                                >
                                    Edit Event
                                </Link>
                                <button
                                    onClick={handleCancelEvent}
                                    disabled={cancelLoading}
                                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                                >
                                    {cancelLoading ? 'Cancelling...' : 'Cancel Event'}
                                </button>
                            </div>
                        )}
                        {event.status === 'cancelled' && canManageAttendees && (
                            <button
                                onClick={handleRestoreEvent}
                                disabled={restoreLoading}
                                className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition disabled:opacity-50 sm:flex-shrink-0"
                            >
                                {restoreLoading ? 'Restoring...' : 'Restore Event'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Event Content */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                    {/* Date/Time/Location Card */}
                    <div className="lg:col-span-2 order-1">
                        <div className="bg-white rounded-lg border p-6">
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="text-2xl">📅</div>
                                    <div>
                                        <p className="font-medium text-gray-900">{date}</p>
                                        <p className="text-gray-500">{time}</p>
                                    </div>
                                </div>
                                {event.location && (
                                    <div className="flex gap-4">
                                        <div className="text-2xl">📍</div>
                                        <div>
                                            <p className="font-medium text-gray-900">{event.location}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="lg:col-span-2 order-2">
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
                                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                            </div>
                        </div>
                    )}

                    {/* RSVP Card - appears after description on mobile, sidebar on desktop */}
                    <div className="order-3 lg:order-none lg:col-span-1 lg:row-start-1 lg:row-span-4">
                        <div className="bg-white rounded-lg border p-6 lg:sticky lg:top-6">
                            {/* Capacity info */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">
                                        {event.attendee_count} going
                                    </span>
                                    {event.capacity && (
                                        <span className="text-gray-600">
                                            {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left
                                        </span>
                                    )}
                                </div>
                                {event.capacity && (
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{
                                                width: `${Math.min(100, ((event.attendee_count || 0) / event.capacity) * 100)}%`
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* RSVP Status */}
                            {rsvp && (
                                <div className={`mb-4 p-3 rounded-lg ${
                                    rsvp.status === 'attending'
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-yellow-50 text-yellow-700'
                                }`}>
                                    {rsvp.status === 'attending' ? (
                                        <p className="font-medium">You're going!</p>
                                    ) : (
                                        <p className="font-medium">
                                            You're on the waitlist (#{rsvp.waitlist_position})
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* RSVP Button */}
                            {event.status !== 'cancelled' && !isPastEvent && (
                                <>
                                    {!user ? (
                                        <Link
                                            href="/login"
                                            className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
                                        >
                                            Log in to RSVP
                                        </Link>
                                    ) : !isGroupMember ? (
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-600 text-center">
                                                Join this group to RSVP to events
                                            </p>
                                            <Link
                                                href={`/groups/${event.group_id}`}
                                                className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
                                            >
                                                View Group
                                            </Link>
                                        </div>
                                    ) : rsvp ? (
                                        <button
                                            onClick={() => handleRsvp('leave')}
                                            disabled={rsvpLoading}
                                            className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Updating...' : 'Cancel RSVP'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleRsvp('join')}
                                            disabled={rsvpLoading}
                                            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {rsvpLoading
                                                ? 'Updating...'
                                                : spotsRemaining === 0
                                                    ? 'Join Waitlist'
                                                    : 'Attend'
                                            }
                                        </button>
                                    )}
                                </>
                            )}

                            {event.status === 'cancelled' && (
                                <p className="text-center text-red-600 font-medium">
                                    This event has been cancelled
                                </p>
                            )}

                            {isPastEvent && event.status !== 'cancelled' && (
                                <p className="text-center text-gray-500">
                                    This event has ended
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Attendees - appears last on mobile and desktop */}
                    <div className="lg:col-span-2 order-4">
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Attendees ({attending.length})
                            </h2>
                            {attending.length > 0 ? (
                                <div className={canManageAttendees ? 'space-y-2' : 'flex flex-wrap gap-3'}>
                                    {attending.map(person => (
                                        <div
                                            key={person.user_id}
                                            className={canManageAttendees
                                                ? 'flex items-center justify-between gap-2 p-2 rounded hover:bg-gray-50'
                                                : 'flex items-center gap-2'
                                            }
                                        >
                                            <div className="flex items-center gap-2">
                                                {person.avatar_url ? (
                                                    <img
                                                        src={person.avatar_url}
                                                        alt={person.name}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <span className="text-sm text-blue-400">
                                                            {person.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-700">{person.name}</span>
                                            </div>
                                            {canManageAttendees && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleManageAttendee(person.user_id, 'demote')}
                                                        disabled={managingUser === person.user_id}
                                                        className="px-2 py-1 text-xs text-yellow-700 bg-yellow-50 rounded hover:bg-yellow-100 disabled:opacity-50"
                                                        title="Move to waitlist"
                                                    >
                                                        Waitlist
                                                    </button>
                                                    <button
                                                        onClick={() => handleManageAttendee(person.user_id, 'remove')}
                                                        disabled={managingUser === person.user_id}
                                                        className="px-2 py-1 text-xs text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                                                        title="Remove from event"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No attendees yet. Be the first!</p>
                            )}

                            {/* Waitlist */}
                            {waitlist.length > 0 && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="text-md font-medium text-gray-900 mb-4">
                                        Waitlist ({waitlist.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {waitlist.map(person => (
                                            <div
                                                key={person.user_id}
                                                className={canManageAttendees
                                                    ? 'flex items-center justify-between gap-2 p-2 rounded hover:bg-gray-50'
                                                    : 'flex items-center gap-2'
                                                }
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-400 w-6">
                                                        #{person.waitlist_position}
                                                    </span>
                                                    {person.avatar_url ? (
                                                        <img
                                                            src={person.avatar_url}
                                                            alt={person.name}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                            <span className="text-xs text-gray-400">
                                                                {person.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-gray-600">{person.name}</span>
                                                </div>
                                                {canManageAttendees && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleManageAttendee(person.user_id, 'promote')}
                                                            disabled={managingUser === person.user_id}
                                                            className="px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
                                                            title="Promote to attending"
                                                        >
                                                            Promote
                                                        </button>
                                                        <button
                                                            onClick={() => handleManageAttendee(person.user_id, 'remove')}
                                                            disabled={managingUser === person.user_id}
                                                            className="px-2 py-1 text-xs text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                                                            title="Remove from event"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
