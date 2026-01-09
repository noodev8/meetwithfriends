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
    updateRsvp,
    manageAttendee,
    cancelEvent,
    restoreEvent,
    addHost,
    removeHost,
    submitOrder,
    updateOrder,
    EventWithDetails,
    RsvpStatus,
    Attendee,
} from '@/lib/api/events';
import { getGroupMembers, GroupMember } from '@/lib/api/groups';
import { EventHost } from '@/types';
import {
    getComments,
    addComment,
    deleteComment,
    CommentWithDetails,
} from '@/lib/api/comments';
import Header from '@/components/layout/Header';
import DOMPurify from 'dompurify';

export default function EventDetailPage() {
    const { user, token } = useAuth();
    const params = useParams();

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
    const [hosts, setHosts] = useState<EventHost[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [isGroupMember, setIsGroupMember] = useState(false);
    const [canManageAttendees, setCanManageAttendees] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [hostActionLoading, setHostActionLoading] = useState(false);
    const [showHostManager, setShowHostManager] = useState(false);
    const [hostSearchQuery, setHostSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GroupMember[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [attending, setAttending] = useState<Attendee[]>([]);
    const [waitlist, setWaitlist] = useState<Attendee[]>([]);
    const [attendingCount, setAttendingCount] = useState(0);
    const [totalGuestCount, setTotalGuestCount] = useState(0);
    const [waitlistCount, setWaitlistCount] = useState(0);
    const [canViewAttendees, setCanViewAttendees] = useState(false);
    const [selectedGuestCount, setSelectedGuestCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [managingUser, setManagingUser] = useState<number | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Comments state
    const [comments, setComments] = useState<CommentWithDetails[]>([]);
    const [commentCount, setCommentCount] = useState(0);
    const [canViewComments, setCanViewComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [deletingComment, setDeletingComment] = useState<number | null>(null);

    // Pre-order state
    const [foodOrder, setFoodOrder] = useState('');
    const [dietaryNotes, setDietaryNotes] = useState('');
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState('');
    const [editingOrderUserId, setEditingOrderUserId] = useState<number | null>(null);
    const [editFoodOrder, setEditFoodOrder] = useState('');
    const [editDietaryNotes, setEditDietaryNotes] = useState('');

    // =======================================================================
    // Fetch event details, attendees, and comments
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (!params.id) return;

            const eventId = Number(params.id);

            // Fetch event, attendees, and comments in parallel
            const [eventResult, attendeesResult, commentsResult] = await Promise.all([
                getEvent(eventId, token || undefined),
                getAttendees(eventId, token || undefined),
                getComments(eventId, token || undefined),
            ]);

            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setRsvp(eventResult.data.rsvp);
                setSelectedGuestCount(eventResult.data.rsvp?.guest_count || 0);
                setFoodOrder(eventResult.data.rsvp?.food_order || '');
                setDietaryNotes(eventResult.data.rsvp?.dietary_notes || '');
                setHosts(eventResult.data.hosts);
                setIsHost(eventResult.data.is_host);
                setIsGroupMember(eventResult.data.is_group_member);
                setCanManageAttendees(eventResult.data.can_manage_attendees);
                setCanEdit(eventResult.data.can_edit);
            } else {
                setError(eventResult.error || 'Event not found');
            }

            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setAttendingCount(attendeesResult.data.attending_count);
                setTotalGuestCount(attendeesResult.data.total_guest_count);
                setWaitlistCount(attendeesResult.data.waitlist_count);
                setCanViewAttendees(attendeesResult.data.is_member);
            }

            if (commentsResult.success && commentsResult.data) {
                setComments(commentsResult.data.comments);
                setCommentCount(commentsResult.data.comment_count);
                setCanViewComments(commentsResult.data.is_member);
            }

            setLoading(false);
        }
        fetchData();
    }, [params.id, token]);

    // =======================================================================
    // Handle RSVP action
    // =======================================================================
    const handleRsvp = async (action: 'join' | 'leave', guestCount?: number) => {
        if (!token || !event) return;

        setRsvpLoading(true);
        const result = await rsvpEvent(token, event.id, action, guestCount);
        setRsvpLoading(false);

        if (result.success && result.data) {
            setRsvp(result.data.rsvp);
            setSelectedGuestCount(result.data.rsvp?.guest_count || 0);
            // Refresh attendees
            const attendeesResult = await getAttendees(event.id);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setTotalGuestCount(attendeesResult.data.total_guest_count);
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
    // Handle updating guest count
    // =======================================================================
    const handleUpdateGuests = async (newGuestCount: number) => {
        if (!token || !event || !rsvp) return;

        setRsvpLoading(true);
        const result = await updateRsvp(token, event.id, newGuestCount);
        setRsvpLoading(false);

        if (result.success && result.data) {
            setRsvp(result.data.rsvp);
            setSelectedGuestCount(result.data.rsvp.guest_count);
            // Refresh attendees
            const attendeesResult = await getAttendees(event.id);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setTotalGuestCount(attendeesResult.data.total_guest_count);
            }
            // Update event counts
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
            }
        } else {
            alert(result.error || 'Failed to update guests');
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
    // Handle step down as host
    // =======================================================================
    const handleStepDown = async () => {
        if (!token || !event || !user) return;

        const confirmed = window.confirm(
            'Are you sure you want to step down as host? You will no longer be able to manage this event.'
        );

        if (!confirmed) return;

        setHostActionLoading(true);
        const result = await removeHost(token, event.id, user.id);
        setHostActionLoading(false);

        if (result.success) {
            // Refresh event data
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setHosts(eventResult.data.hosts);
                setIsHost(eventResult.data.is_host);
                setCanManageAttendees(eventResult.data.can_manage_attendees);
                setCanEdit(eventResult.data.can_edit);
            }
        } else {
            alert(result.error || 'Failed to step down as host');
        }
    };

    // =======================================================================
    // Handle search for members to add as host
    // =======================================================================
    const handleHostSearch = async (query: string) => {
        setHostSearchQuery(query);

        if (!event || !token || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        const result = await getGroupMembers(event.group_id, token, {
            search: query.trim(),
            limit: 10
        });
        setSearchLoading(false);

        if (result.success && result.data) {
            // Filter out users who are already hosts
            const hostUserIds = new Set(hosts.map(h => h.user_id));
            const filtered = result.data.members.filter(m => !hostUserIds.has(m.user_id));
            setSearchResults(filtered);
        }
    };

    // =======================================================================
    // Handle add host
    // =======================================================================
    const handleAddHost = async (userId: number) => {
        if (!token || !event) return;

        setHostActionLoading(true);
        const result = await addHost(token, event.id, userId);
        setHostActionLoading(false);

        if (result.success) {
            // Refresh event data to get updated hosts
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setHosts(eventResult.data.hosts);
                setIsHost(eventResult.data.is_host);
            }
            // Clear search
            setHostSearchQuery('');
            setSearchResults([]);
        } else {
            alert(result.error || 'Failed to add host');
        }
    };

    // =======================================================================
    // Handle submit own food order
    // =======================================================================
    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !event) return;

        setOrderLoading(true);
        setOrderSuccess('');
        const result = await submitOrder(token, event.id, foodOrder.trim() || null, dietaryNotes.trim() || null);
        setOrderLoading(false);

        if (result.success) {
            setOrderSuccess('Order saved');
            // Update local rsvp state
            if (rsvp) {
                setRsvp({
                    ...rsvp,
                    food_order: foodOrder.trim() || null,
                    dietary_notes: dietaryNotes.trim() || null,
                });
            }
            // Refresh attendees to show updated orders
            const attendeesResult = await getAttendees(event.id, token);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
            }
            // Clear success message after 3 seconds
            setTimeout(() => setOrderSuccess(''), 3000);
        } else {
            alert(result.error || 'Failed to submit order');
        }
    };

    // =======================================================================
    // Handle host editing another attendee's order
    // =======================================================================
    const handleUpdateOtherOrder = async (userId: number) => {
        if (!token || !event) return;

        setOrderLoading(true);
        const result = await updateOrder(token, event.id, userId, editFoodOrder.trim() || null, editDietaryNotes.trim() || null);
        setOrderLoading(false);

        if (result.success) {
            // Refresh attendees
            const attendeesResult = await getAttendees(event.id, token);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
            }
            setEditingOrderUserId(null);
            setEditFoodOrder('');
            setEditDietaryNotes('');
        } else {
            alert(result.error || 'Failed to update order');
        }
    };

    // =======================================================================
    // Start editing another attendee's order (host only)
    // =======================================================================
    const startEditOrder = (person: Attendee) => {
        setEditingOrderUserId(person.user_id);
        setEditFoodOrder(person.food_order || '');
        setEditDietaryNotes(person.dietary_notes || '');
    };

    // =======================================================================
    // Check if preorder cutoff has passed
    // =======================================================================
    const isCutoffPassed = event?.preorder_cutoff
        ? new Date(event.preorder_cutoff) < new Date()
        : false;

    // =======================================================================
    // Handle add comment
    // =======================================================================
    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !event || !newComment.trim()) return;

        setCommentLoading(true);
        const result = await addComment(token, event.id, newComment.trim());
        setCommentLoading(false);

        if (result.success && result.data) {
            setComments(prev => [...prev, result.data!]);
            setNewComment('');
        } else {
            alert(result.error || 'Failed to add comment');
        }
    };

    // =======================================================================
    // Handle delete comment
    // =======================================================================
    const handleDeleteComment = async (commentId: number) => {
        if (!token) return;

        const confirmed = window.confirm('Are you sure you want to delete this comment?');
        if (!confirmed) return;

        setDeletingComment(commentId);
        const result = await deleteComment(token, commentId);
        setDeletingComment(null);

        if (result.success) {
            setComments(prev => prev.filter(c => c.id !== commentId));
        } else {
            alert(result.error || 'Failed to delete comment');
        }
    };

    // =======================================================================
    // Format comment date
    // =======================================================================
    const formatCommentDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
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
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        Back to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    const { date, time } = formatDateTime(event.date_time);
    const totalSpotsUsed = (event.attendee_count || 0) + (event.total_guest_count || 0);
    const spotsRemaining = event.capacity ? event.capacity - totalSpotsUsed : null;

    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Featured Image */}
            {event.image_url && (
                <div className="w-full h-48 sm:h-64 md:h-80 bg-gray-200">
                    <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: event.image_position || 'center' }}
                    />
                </div>
            )}

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

                    {/* Title and RSVP row */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                {event.title}
                            </h1>
                            <p className="text-gray-500">
                                Hosted by {hosts.length > 0
                                    ? hosts.map((h, i) => (
                                        <span key={h.user_id}>
                                            {h.name}
                                            {i < hosts.length - 2 && ', '}
                                            {i === hosts.length - 2 && ' and '}
                                        </span>
                                    ))
                                    : event.creator_name
                                }
                            </p>
                        </div>

                        {/* RSVP Section - compact in header */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:flex-shrink-0">
                            {/* Attendance info */}
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span className="font-medium">{event.attendee_count} going</span>
                                {event.capacity && (
                                    <>
                                        <span className="text-gray-300">|</span>
                                        <span>{spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left</span>
                                    </>
                                )}
                            </div>

                            {/* RSVP Status Badge */}
                            {rsvp && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    rsvp.status === 'attending'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {rsvp.status === 'attending'
                                        ? (rsvp.guest_count > 0 ? `You + ${rsvp.guest_count} guest${rsvp.guest_count > 1 ? 's' : ''}` : "You're going!")
                                        : `Waitlist #${rsvp.waitlist_position}`
                                    }
                                </span>
                            )}

                            {/* Guest selector for attending members */}
                            {event.status !== 'cancelled' && !isPastEvent && rsvp?.status === 'attending' && event.allow_guests && (
                                <div className="flex items-center gap-2">
                                    <label htmlFor="guestCount" className="text-sm text-gray-600">Guests:</label>
                                    <select
                                        id="guestCount"
                                        value={selectedGuestCount}
                                        onChange={(e) => handleUpdateGuests(parseInt(e.target.value, 10))}
                                        disabled={rsvpLoading}
                                        className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {Array.from({ length: (event.max_guests_per_rsvp || 1) + 1 }, (_, i) => (
                                            <option key={i} value={i}>{i}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* RSVP Button */}
                            {event.status !== 'cancelled' && !isPastEvent && (
                                <>
                                    {!user ? (
                                        <Link
                                            href="/login"
                                            className="px-6 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
                                        >
                                            Log in to RSVP
                                        </Link>
                                    ) : !isGroupMember ? (
                                        <Link
                                            href={`/groups/${event.group_id}`}
                                            className="px-6 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
                                            title="Join this group to RSVP"
                                        >
                                            Join Group
                                        </Link>
                                    ) : rsvp ? (
                                        <button
                                            onClick={() => handleRsvp('leave')}
                                            disabled={rsvpLoading}
                                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Updating...' : 'Cancel RSVP'}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {event.allow_guests && (
                                                <div className="flex items-center gap-2">
                                                    <label htmlFor="joinGuestCount" className="text-sm text-gray-600">Guests:</label>
                                                    <select
                                                        id="joinGuestCount"
                                                        value={selectedGuestCount}
                                                        onChange={(e) => setSelectedGuestCount(parseInt(e.target.value, 10))}
                                                        disabled={rsvpLoading}
                                                        className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    >
                                                        {Array.from({ length: (event.max_guests_per_rsvp || 1) + 1 }, (_, i) => (
                                                            <option key={i} value={i}>{i}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleRsvp('join', selectedGuestCount)}
                                                disabled={rsvpLoading}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                            >
                                                {rsvpLoading
                                                    ? 'Updating...'
                                                    : spotsRemaining === 0
                                                        ? 'Join Waitlist'
                                                        : 'Attend'
                                                }
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {event.status === 'cancelled' && (
                                <span className="text-red-600 font-medium">Event cancelled</span>
                            )}

                            {isPastEvent && event.status !== 'cancelled' && (
                                <span className="text-gray-500">Event ended</span>
                            )}
                        </div>
                    </div>

                    {/* Edit/Cancel/Step down buttons - separate row for hosts */}
                    {(canEdit || (event.status === 'cancelled' && canManageAttendees) || (isHost && hosts.length > 1)) && (
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            {canEdit && (
                                <>
                                    <Link
                                        href={`/events/${event.id}/edit`}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center"
                                    >
                                        Edit Event
                                    </Link>
                                    <button
                                        onClick={handleCancelEvent}
                                        disabled={cancelLoading}
                                        className="text-sm text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                                    >
                                        {cancelLoading ? 'Cancelling...' : 'Cancel event'}
                                    </button>
                                </>
                            )}
                            {event.status === 'cancelled' && canManageAttendees && (
                                <button
                                    onClick={handleRestoreEvent}
                                    disabled={restoreLoading}
                                    className="text-sm text-gray-400 hover:text-green-600 transition disabled:opacity-50"
                                >
                                    {restoreLoading ? 'Restoring...' : 'Restore event'}
                                </button>
                            )}
                            {isHost && hosts.length > 1 && (
                                <button
                                    onClick={handleStepDown}
                                    disabled={hostActionLoading}
                                    className="text-sm text-gray-400 hover:text-orange-600 transition disabled:opacity-50"
                                >
                                    {hostActionLoading ? 'Stepping down...' : 'Step down as host'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Event Content */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
                <div className="space-y-6">
                    {/* Date/Time/Location Card */}
                    <div className="bg-white rounded-lg border p-6">
                        <div className="flex flex-wrap gap-6 sm:gap-8">
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
                            {event.menu_link && (
                                <div className="flex gap-4">
                                    <div className="text-2xl">🍽️</div>
                                    <div>
                                        <a
                                            href={event.menu_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            View Menu
                                        </a>
                                        {event.preorder_cutoff && (
                                            <p className="text-sm text-gray-500">
                                                {isCutoffPassed
                                                    ? 'Pre-orders closed'
                                                    : `Order by ${new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
                            <div
                                className="text-gray-600 prose prose-sm max-w-none prose-a:text-blue-600"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(event.description)
                                }}
                            />
                        </div>
                    )}

                    {/* Pre-order Form - only visible to attendees when menu link is set */}
                    {event.menu_link && rsvp && (
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Order</h2>
                            {isCutoffPassed ? (
                                <div>
                                    {rsvp.food_order || rsvp.dietary_notes ? (
                                        <div className="space-y-2">
                                            {rsvp.food_order && (
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700">Order: </span>
                                                    <span className="text-gray-600">{rsvp.food_order}</span>
                                                </div>
                                            )}
                                            {rsvp.dietary_notes && (
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700">Notes: </span>
                                                    <span className="text-gray-600">{rsvp.dietary_notes}</span>
                                                </div>
                                            )}
                                            <p className="text-sm text-gray-500 mt-2">
                                                Pre-order deadline has passed. Contact a host if you need to make changes.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">
                                            Pre-order deadline has passed. You did not submit an order.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitOrder} className="space-y-4">
                                    <div>
                                        <label htmlFor="foodOrder" className="block text-sm font-medium text-gray-700 mb-1">
                                            Your Food Order
                                        </label>
                                        <textarea
                                            id="foodOrder"
                                            value={foodOrder}
                                            onChange={(e) => setFoodOrder(e.target.value)}
                                            placeholder="e.g., Chicken Caesar Salad, no croutons"
                                            rows={2}
                                            maxLength={500}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dietaryNotes" className="block text-sm font-medium text-gray-700 mb-1">
                                            Dietary Notes / Allergies
                                        </label>
                                        <input
                                            type="text"
                                            id="dietaryNotes"
                                            value={dietaryNotes}
                                            onChange={(e) => setDietaryNotes(e.target.value)}
                                            placeholder="e.g., Vegetarian, nut allergy"
                                            maxLength={200}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="submit"
                                            disabled={orderLoading}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {orderLoading ? 'Saving...' : 'Save Order'}
                                        </button>
                                        {orderSuccess && (
                                            <span className="text-sm text-green-600">{orderSuccess}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        <a href={event.menu_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                            View the menu
                                        </a>
                                        {' '}to see what's available.
                                        {event.preorder_cutoff && (
                                            <> Order by {new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</>
                                        )}
                                    </p>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Manage Hosts Section - only visible to hosts/organisers */}
                    {canManageAttendees && (
                        <div className="bg-white rounded-lg border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">
                                    Hosts ({hosts.length})
                                </h2>
                                <button
                                    onClick={() => setShowHostManager(!showHostManager)}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    {showHostManager ? 'Done' : 'Manage'}
                                </button>
                            </div>

                            {/* Current hosts list */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {hosts.map(host => (
                                    <div
                                        key={host.user_id}
                                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full"
                                    >
                                        {host.avatar_url ? (
                                            <img
                                                src={host.avatar_url}
                                                alt={host.name}
                                                className="w-5 h-5 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                <span className="text-xs text-blue-400">
                                                    {host.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-sm text-gray-700">{host.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Add host interface - shown when managing */}
                            {showHostManager && (
                                <div className="pt-4 border-t">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Add a host
                                    </label>
                                    <input
                                        type="text"
                                        value={hostSearchQuery}
                                        onChange={(e) => handleHostSearch(e.target.value)}
                                        placeholder="Search group members by name..."
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />

                                    {/* Search results */}
                                    {searchLoading && (
                                        <p className="text-sm text-gray-500 mt-2">Searching...</p>
                                    )}

                                    {!searchLoading && searchResults.length > 0 && (
                                        <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                                            {searchResults.map(member => (
                                                <button
                                                    key={member.user_id}
                                                    onClick={() => handleAddHost(member.user_id)}
                                                    disabled={hostActionLoading}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 disabled:opacity-50 text-left"
                                                >
                                                    {member.avatar_url ? (
                                                        <img
                                                            src={member.avatar_url}
                                                            alt={member.name}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                            <span className="text-sm text-blue-400">
                                                                {member.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                                    </div>
                                                    <span className="text-xs text-blue-600">Add</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {!searchLoading && hostSearchQuery.length >= 2 && searchResults.length === 0 && (
                                        <p className="text-sm text-gray-500 mt-2">No members found</p>
                                    )}

                                    {hostSearchQuery.length > 0 && hostSearchQuery.length < 2 && (
                                        <p className="text-sm text-gray-400 mt-2">Type at least 2 characters to search</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attendees */}
                    <div>
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Attendees ({attendingCount}{totalGuestCount > 0 ? ` + ${totalGuestCount} guest${totalGuestCount > 1 ? 's' : ''}` : ''})
                            </h2>

                            {/* Members can view full attendee list */}
                            {canViewAttendees ? (
                                <>
                                    {attending.length > 0 ? (
                                        <div className={canManageAttendees || event.menu_link ? 'space-y-2' : 'flex flex-wrap gap-3'}>
                                            {attending.map(person => (
                                                <div
                                                    key={person.user_id}
                                                    className={canManageAttendees || event.menu_link
                                                        ? 'p-3 rounded-lg border bg-gray-50'
                                                        : 'flex items-center gap-2'
                                                    }
                                                >
                                                    <div className="flex items-center justify-between gap-2">
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
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {person.name}
                                                                {person.guest_count > 0 && (
                                                                    <span className="ml-1 text-gray-400 font-normal">
                                                                        +{person.guest_count}
                                                                    </span>
                                                                )}
                                                            </span>
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

                                                    {/* Food Order - shown when event has menu */}
                                                    {event.menu_link && (
                                                        <div className="mt-2 pl-10">
                                                            {editingOrderUserId === person.user_id ? (
                                                                /* Inline edit form for hosts */
                                                                <div className="space-y-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editFoodOrder}
                                                                        onChange={(e) => setEditFoodOrder(e.target.value)}
                                                                        placeholder="Food order..."
                                                                        maxLength={500}
                                                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={editDietaryNotes}
                                                                        onChange={(e) => setEditDietaryNotes(e.target.value)}
                                                                        placeholder="Dietary notes..."
                                                                        maxLength={200}
                                                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleUpdateOtherOrder(person.user_id)}
                                                                            disabled={orderLoading}
                                                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                                                        >
                                                                            {orderLoading ? 'Saving...' : 'Save'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingOrderUserId(null)}
                                                                            className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Display order info */
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="text-sm text-gray-600">
                                                                        {person.food_order ? (
                                                                            <span>{person.food_order}</span>
                                                                        ) : (
                                                                            <span className="text-gray-400 italic">No order</span>
                                                                        )}
                                                                        {person.dietary_notes && (
                                                                            <span className="ml-2 text-orange-600">
                                                                                ({person.dietary_notes})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {canManageAttendees && (
                                                                        <button
                                                                            onClick={() => startEditOrder(person)}
                                                                            className="text-xs text-blue-600 hover:text-blue-700 flex-shrink-0"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
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
                                                Waitlist ({waitlistCount})
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
                                </>
                            ) : (
                                /* Non-members only see count */
                                <div className="text-center py-4">
                                    <p className="text-gray-500 mb-2">
                                        {attendingCount > 0
                                            ? `${attendingCount} ${attendingCount === 1 ? 'person is' : 'people are'} attending${totalGuestCount > 0 ? ` (+${totalGuestCount} guest${totalGuestCount > 1 ? 's' : ''})` : ''}`
                                            : 'No attendees yet'}
                                        {waitlistCount > 0 && ` (${waitlistCount} on waitlist)`}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Join this group to see who's attending
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Discussion Section */}
                    <div>
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Discussion ({commentCount})
                            </h2>

                            {/* Members can view and participate in discussion */}
                            {canViewComments ? (
                                <>
                                    {/* Add Comment Form */}
                                    {isGroupMember && user && (
                                        <form onSubmit={handleAddComment} className="mb-6">
                                            <div className="flex gap-3">
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={user.name}
                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm text-blue-400">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <textarea
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder="Add a comment..."
                                                        rows={2}
                                                        maxLength={280}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                                    />
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-xs text-gray-400">
                                                            {newComment.length}/280
                                                        </span>
                                                        <button
                                                            type="submit"
                                                            disabled={commentLoading || !newComment.trim()}
                                                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {commentLoading ? 'Posting...' : 'Post'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    )}

                                    {/* Comments List */}
                                    {comments.length > 0 ? (
                                        <div className="space-y-4">
                                            {comments.map(comment => (
                                                <div key={comment.id} className="flex gap-3">
                                                    {comment.user_avatar_url ? (
                                                        <img
                                                            src={comment.user_avatar_url}
                                                            alt={comment.user_name}
                                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-sm text-blue-400">
                                                                {comment.user_name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-gray-900 text-sm">
                                                                {comment.user_name}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {formatCommentDate(comment.created_at)}
                                                            </span>
                                                            {comment.can_delete && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    disabled={deletingComment === comment.id}
                                                                    className="text-xs text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                                                                    title="Delete comment"
                                                                >
                                                                    {deletingComment === comment.id ? '...' : 'Delete'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap break-words">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">
                                            No comments yet. Be the first to start the discussion!
                                        </p>
                                    )}
                                </>
                            ) : (
                                /* Non-members only see count */
                                <div className="text-center py-4">
                                    <p className="text-gray-500 mb-2">
                                        {commentCount > 0
                                            ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`
                                            : 'No comments yet'}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        {user
                                            ? 'Join this group to view and participate in the discussion'
                                            : <>
                                                <Link href="/login" className="text-blue-600 hover:text-blue-700">Log in</Link>
                                                {' '}and join this group to view the discussion
                                              </>
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
