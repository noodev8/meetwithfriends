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
    cancelEvent,
    restoreEvent,
    removeHost,
    submitOrder,
    updateOrder,
    EventWithDetails,
    RsvpStatus,
    Attendee,
} from '@/lib/api/events';
import { EventHost } from '@/types';
import {
    getComments,
    addComment,
    deleteComment,
    CommentWithDetails,
} from '@/lib/api/comments';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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
    const [attending, setAttending] = useState<Attendee[]>([]);
    const [, setWaitlist] = useState<Attendee[]>([]);
    const [attendingCount, setAttendingCount] = useState(0);
    const [totalGuestCount, setTotalGuestCount] = useState(0);
    const [waitlistCount, setWaitlistCount] = useState(0);
    const [canViewAttendees, setCanViewAttendees] = useState(false);
    const [selectedGuestCount, setSelectedGuestCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [rsvpLoading, setRsvpLoading] = useState(false);
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

    // Profile modal state
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);

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
            // Refresh attendees (pass token to get full list as member)
            const attendeesResult = await getAttendees(event.id, token);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setAttendingCount(attendeesResult.data.attending_count);
                setTotalGuestCount(attendeesResult.data.total_guest_count);
                setWaitlistCount(attendeesResult.data.waitlist_count);
                setCanViewAttendees(attendeesResult.data.is_member);
            }
            // Update event counts and membership status
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setIsGroupMember(eventResult.data.is_group_member);
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
            // Refresh attendees (pass token to get full list as member)
            const attendeesResult = await getAttendees(event.id, token);
            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setAttendingCount(attendeesResult.data.attending_count);
                setTotalGuestCount(attendeesResult.data.total_guest_count);
                setWaitlistCount(attendeesResult.data.waitlist_count);
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-600 mt-4">Loading event...</p>
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
                        <p className="text-stone-600 mb-6">{error || 'This event may have been removed or doesn\'t exist.'}</p>
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

    const { date, time } = formatDateTime(event.date_time);
    const totalSpotsUsed = (event.attendee_count || 0) + (event.total_guest_count || 0);
    const spotsRemaining = event.capacity ? event.capacity - totalSpotsUsed : null;

    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            {/* Hero Section */}
            <div className="bg-white border-b border-stone-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    {/* Breadcrumb */}
                    <Link
                        href={`/groups/${event.group_id}`}
                        className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {event.group_name}
                    </Link>

                    {/* Hero content */}
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        {/* Featured Image */}
                        {event.image_url && (
                            <div className="lg:w-96 flex-shrink-0">
                                <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-stone-100 shadow-md">
                                    <img
                                        src={event.image_url}
                                        alt={event.title}
                                        className="w-full h-full object-cover"
                                        style={{ objectPosition: event.image_position || 'center' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                            {/* Status badges */}
                            {(event.status === 'cancelled' || isPastEvent) && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {event.status === 'cancelled' && (
                                        <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full">
                                            Cancelled
                                        </span>
                                    )}
                                    {isPastEvent && event.status !== 'cancelled' && (
                                        <span className="px-3 py-1 text-sm font-medium text-stone-600 bg-stone-100 rounded-full">
                                            Past Event
                                        </span>
                                    )}
                                </div>
                            )}

                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 mb-3 font-display">
                                {event.title}
                            </h1>

                            {/* Date/Time/Location quick info */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-3 text-stone-700">
                                    <span className="text-xl">📅</span>
                                    <div>
                                        <span className="font-medium">{date}</span>
                                        <span className="text-stone-400 mx-2">•</span>
                                        <span>{time}</span>
                                    </div>
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-3 text-stone-700">
                                        <span className="text-xl">📍</span>
                                        <span>{event.location}</span>
                                    </div>
                                )}
                            </div>

                            {/* Hosted by with avatar */}
                            <div className="flex items-center gap-3 mb-4">
                                {hosts.length > 0 ? (
                                    <>
                                        {/* Host avatar(s) */}
                                        <div className="flex -space-x-2">
                                            {hosts.slice(0, 2).map((h, i) => (
                                                h.avatar_url ? (
                                                    <img
                                                        key={h.user_id}
                                                        src={h.avatar_url}
                                                        alt={h.name}
                                                        className="w-8 h-8 rounded-full object-cover border-2 border-white"
                                                        style={{ zIndex: 2 - i }}
                                                    />
                                                ) : (
                                                    <div
                                                        key={h.user_id}
                                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center border-2 border-white"
                                                        style={{ zIndex: 2 - i }}
                                                    >
                                                        <span className="text-sm font-medium text-amber-800">
                                                            {h.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                        <p className="text-stone-500">
                                            Hosted by{' '}
                                            <span className="font-medium text-stone-700">
                                                {hosts[0].name}
                                                {hosts.length > 1 && ` +${hosts.length - 1} other${hosts.length > 2 ? 's' : ''}`}
                                            </span>
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-stone-500">
                                        Hosted by <span className="font-medium text-stone-700">{event.creator_name}</span>
                                    </p>
                                )}
                            </div>

                            {/* Status Badges */}
                            <div className="flex flex-wrap items-center gap-3">
                                {event.status === 'cancelled' && (
                                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">Cancelled</span>
                                )}
                                {isPastEvent && event.status !== 'cancelled' && (
                                    <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-sm">Ended</span>
                                )}
                                {rsvp && rsvp.status !== 'not_going' && !isPastEvent && event.status !== 'cancelled' && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        rsvp.status === 'attending'
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-yellow-50 text-yellow-700'
                                    }`}>
                                        {rsvp.status === 'attending' ? "You're going" : `Waitlist #${rsvp.waitlist_position}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Full Width */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="space-y-6">
                        {/* Menu Link Card */}
                        {event.menu_link && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <span className="text-2xl">🍽️</span>
                                    </div>
                                    <div className="flex-1">
                                        <a
                                            href={event.menu_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-amber-700 hover:text-amber-800 transition"
                                        >
                                            View Menu →
                                        </a>
                                        {event.preorder_cutoff && (
                                            <p className="text-sm text-amber-600">
                                                {isCutoffPassed
                                                    ? 'Pre-orders closed'
                                                    : `Order by ${new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {event.description && (
                            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-stone-900 mb-4 font-display">About this event</h2>
                                <div
                                    className="text-stone-600 prose prose-sm max-w-none prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(event.description)
                                    }}
                                />
                            </div>
                        )}

                        {/* Pre-order Form - visible to attendees when pre-orders are enabled */}
                        {event.preorders_enabled && rsvp && (
                            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-stone-900 mb-4 font-display">Your Order</h2>
                                {isCutoffPassed ? (
                                    <div>
                                        {rsvp.food_order || rsvp.dietary_notes ? (
                                            <div className="space-y-2">
                                                {rsvp.food_order && (
                                                    <div>
                                                        <span className="text-sm font-medium text-stone-700">Order: </span>
                                                        <span className="text-stone-600">{rsvp.food_order}</span>
                                                    </div>
                                                )}
                                                {rsvp.dietary_notes && (
                                                    <div>
                                                        <span className="text-sm font-medium text-stone-700">Notes: </span>
                                                        <span className="text-stone-600">{rsvp.dietary_notes}</span>
                                                    </div>
                                                )}
                                                <p className="text-sm text-stone-500 mt-2">
                                                    Pre-order deadline has passed. Contact a host if you need to make changes.
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-stone-500">
                                                Pre-order deadline has passed. You did not submit an order.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitOrder} className="space-y-4">
                                        <div>
                                            <label htmlFor="foodOrder" className="block text-sm font-medium text-stone-700 mb-1">
                                                Your Food Order
                                            </label>
                                            <textarea
                                                id="foodOrder"
                                                value={foodOrder}
                                                onChange={(e) => setFoodOrder(e.target.value)}
                                                placeholder="e.g., Chicken Caesar Salad, no croutons"
                                                rows={2}
                                                maxLength={500}
                                                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="dietaryNotes" className="block text-sm font-medium text-stone-700 mb-1">
                                                Dietary Notes / Allergies
                                            </label>
                                            <input
                                                type="text"
                                                id="dietaryNotes"
                                                value={dietaryNotes}
                                                onChange={(e) => setDietaryNotes(e.target.value)}
                                                placeholder="e.g., Vegetarian, nut allergy"
                                                maxLength={200}
                                                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                            />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="submit"
                                                disabled={orderLoading}
                                                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md disabled:opacity-50"
                                            >
                                                {orderLoading ? 'Saving...' : 'Save Order'}
                                            </button>
                                            {orderSuccess && (
                                                <span className="text-sm text-green-600 font-medium">{orderSuccess}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-stone-500">
                                            {event.menu_link && (
                                                <>
                                                    <a href={event.menu_link} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">
                                                        View the menu
                                                    </a>
                                                    {' '}to see what's available.{' '}
                                                </>
                                            )}
                                            {event.preorder_cutoff && (
                                                <>Order by {new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</>
                                            )}
                                        </p>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* Attendees Section - Meetup style */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-stone-900 font-display">Attendees</h2>
                                    <span className="px-2.5 py-0.5 bg-stone-100 text-stone-600 text-sm font-medium rounded-full">
                                        {attendingCount}
                                    </span>
                                    {event.capacity && (
                                        <span className={`text-sm ${spotsRemaining === 0 ? 'text-red-600 font-medium' : 'text-stone-400'}`}>
                                            {spotsRemaining === 0 ? 'Full' : `${spotsRemaining} spots left`}
                                        </span>
                                    )}
                                </div>
                                {canViewAttendees && (attendingCount > 0 || waitlistCount > 0) && (
                                    <Link
                                        href={`/events/${event.id}/attendees`}
                                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                    >
                                        See all
                                    </Link>
                                )}
                            </div>

                            {canViewAttendees ? (
                                <>
                                    {attending.length > 0 || hosts.length > 0 ? (
                                        <div className="flex flex-wrap gap-6 sm:gap-8">
                                            {/* Build display list: hosts first, then others */}
                                            {(() => {
                                                const displayList: Array<{ user_id: number; name: string; avatar_url: string | null | undefined; isHost: boolean; guest_count: number }> = [];

                                                // Add hosts first
                                                hosts.forEach(host => {
                                                    const hostAttendee = attending.find(a => a.user_id === host.user_id);
                                                    displayList.push({
                                                        user_id: host.user_id,
                                                        name: host.name,
                                                        avatar_url: host.avatar_url,
                                                        isHost: true,
                                                        guest_count: hostAttendee?.guest_count || 0
                                                    });
                                                });

                                                // Add non-host attendees
                                                attending
                                                    .filter(a => !hosts.some(h => h.user_id === a.user_id))
                                                    .forEach(person => {
                                                        displayList.push({
                                                            user_id: person.user_id,
                                                            name: person.name,
                                                            avatar_url: person.avatar_url,
                                                            isHost: false,
                                                            guest_count: person.guest_count
                                                        });
                                                    });

                                                const showIndividually = displayList.slice(0, 4);
                                                const remaining = displayList.slice(4);

                                                return (
                                                    <>
                                                        {/* Show first 4 as large cards */}
                                                        {showIndividually.map(person => {
                                                            const attendee = attending.find(a => a.user_id === person.user_id);
                                                            return (
                                                                <button
                                                                    key={person.user_id}
                                                                    onClick={() => attendee && setSelectedAttendee(attendee)}
                                                                    className="flex flex-col items-center text-center hover:opacity-80 transition"
                                                                >
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
                                                                        {person.isHost && (
                                                                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
                                                                                Host
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-stone-900">
                                                                        {person.name}
                                                                    </span>
                                                                    <span className="text-xs text-stone-500">
                                                                        {person.isHost ? 'Event Host' : 'Member'}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}

                                                        {/* Show remaining as cluster */}
                                                        {remaining.length > 0 && (
                                                            <Link
                                                                href={`/events/${event.id}/attendees`}
                                                                className="flex flex-col items-center text-center hover:opacity-80 transition"
                                                            >
                                                                <div className="relative w-20 h-20 mb-2">
                                                                    {/* 2x2 grid of small avatars */}
                                                                    <div className="grid grid-cols-2 gap-1 w-full h-full">
                                                                        {remaining.slice(0, 3).map((person, i) => (
                                                                            person.avatar_url ? (
                                                                                <img
                                                                                    key={person.user_id}
                                                                                    src={person.avatar_url}
                                                                                    alt={person.name}
                                                                                    className="w-full h-full rounded-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    key={person.user_id}
                                                                                    className="w-full h-full rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center"
                                                                                >
                                                                                    <span className="text-xs font-medium text-amber-600">
                                                                                        {person.name.charAt(0).toUpperCase()}
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        ))}
                                                                        {remaining.length > 3 && (
                                                                            <div className="w-full h-full rounded-full bg-amber-500 flex items-center justify-center">
                                                                                <span className="text-xs font-bold text-white">
                                                                                    +{remaining.length - 3}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {remaining.length <= 3 && remaining.length < 4 && (
                                                                            Array.from({ length: 4 - remaining.length }).map((_, i) => (
                                                                                <div key={`empty-${i}`} className="w-full h-full" />
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm font-medium text-stone-900">
                                                                    +{remaining.length} more
                                                                </span>
                                                                {waitlistCount > 0 && (
                                                                    <span className="text-xs text-yellow-600">
                                                                        {waitlistCount} on waitlist
                                                                    </span>
                                                                )}
                                                            </Link>
                                                        )}

                                                        {/* Show waitlist separately if no cluster */}
                                                        {remaining.length === 0 && waitlistCount > 0 && (
                                                            <Link
                                                                href={`/events/${event.id}/attendees`}
                                                                className="flex flex-col items-center justify-center text-center hover:opacity-80 transition"
                                                            >
                                                                <div className="w-20 h-20 rounded-full bg-yellow-50 border-2 border-dashed border-yellow-300 flex items-center justify-center mb-2">
                                                                    <span className="text-lg font-bold text-yellow-600">
                                                                        {waitlistCount}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-medium text-stone-900">
                                                                    Waitlist
                                                                </span>
                                                            </Link>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <p className="text-stone-500">No attendees yet. Be the first to RSVP!</p>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-stone-500 mb-2">
                                        {attendingCount > 0
                                            ? `${attendingCount} ${attendingCount === 1 ? 'person is' : 'people are'} going`
                                            : 'No attendees yet'}
                                    </p>
                                    <p className="text-sm text-stone-400">
                                        Join this group to see who's attending
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Discussion Section */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-stone-900 mb-4 font-display">
                                Discussion ({commentCount})
                            </h2>

                            {/* Members can view and participate in discussion */}
                            {canViewComments ? (
                                <>
                                    {/* Add Comment Form - for attendees, waitlist, hosts, and organisers */}
                                    {user && (rsvp && (rsvp.status === 'attending' || rsvp.status === 'waitlist') || canEdit) ? (
                                        <form onSubmit={handleAddComment} className="mb-6">
                                            <div className="flex gap-3">
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={user.name}
                                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-medium text-amber-600">
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
                                                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition"
                                                    />
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-xs text-stone-400">
                                                            {newComment.length}/280
                                                        </span>
                                                        <button
                                                            type="submit"
                                                            disabled={commentLoading || !newComment.trim()}
                                                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {commentLoading ? 'Posting...' : 'Post'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    ) : user && isGroupMember && !canEdit ? (
                                        <div className="mb-6 p-4 bg-stone-50 rounded-xl text-center">
                                            <p className="text-sm text-stone-600">
                                                RSVP to join the discussion
                                            </p>
                                        </div>
                                    ) : null}

                                    {/* Comments List */}
                                    {comments.length > 0 ? (
                                        <div className="space-y-4">
                                            {comments.map(comment => (
                                                <div key={comment.id} className="flex gap-3">
                                                    {comment.user_avatar_url ? (
                                                        <img
                                                            src={comment.user_avatar_url}
                                                            alt={comment.user_name}
                                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-sm font-medium text-amber-600">
                                                                {comment.user_name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-stone-900 text-sm">
                                                                {comment.user_name}
                                                            </span>
                                                            <span className="text-xs text-stone-400">
                                                                {formatCommentDate(comment.created_at)}
                                                            </span>
                                                            {comment.can_delete && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    disabled={deletingComment === comment.id}
                                                                    className="text-xs text-stone-400 hover:text-red-600 transition disabled:opacity-50"
                                                                    title="Delete comment"
                                                                >
                                                                    {deletingComment === comment.id ? '...' : 'Delete'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-stone-700 text-sm mt-1 whitespace-pre-wrap break-words">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-stone-500 text-center py-4">
                                            {(rsvp && (rsvp.status === 'attending' || rsvp.status === 'waitlist')) || canEdit
                                                ? 'No comments yet. Be the first to start the discussion!'
                                                : 'No comments yet.'}
                                        </p>
                                    )}
                                </>
                            ) : (
                                /* Non-members only see count */
                                <div className="text-center py-6">
                                    <div className="text-4xl mb-3">💬</div>
                                    <p className="text-stone-500 mb-2">
                                        {commentCount > 0
                                            ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`
                                            : 'No comments yet'}
                                    </p>
                                    <p className="text-sm text-stone-400">
                                        {user
                                            ? 'Join this group to view and participate in the discussion'
                                            : <>
                                                <Link href="/login" className="text-amber-600 hover:text-amber-700">Log in</Link>
                                                {' '}and join this group to view the discussion
                                              </>
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                </div>
            </div>

            {/* Profile Modal - Focus on the face */}
            {selectedAttendee && (
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
                    </div>
                </div>
            )}

            {/* Bottom RSVP Section */}
            {event && !isPastEvent && event.status !== 'cancelled' && (
                <div className="bg-white border-t border-stone-200 py-8 px-4 sm:px-8">
                    <div className="max-w-2xl mx-auto">
                        {!user ? (
                            /* Not logged in */
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-stone-900 font-display mb-2">Want to attend?</h3>
                                <p className="text-stone-500 mb-6">Log in to RSVP to this event</p>
                                <Link
                                    href="/login"
                                    className="inline-block px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg text-lg"
                                >
                                    Log in to RSVP
                                </Link>
                            </div>
                        ) : !isGroupMember ? (
                            /* Not a group member */
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-stone-900 font-display mb-2">Want to attend?</h3>
                                <p className="text-stone-500 mb-6">Join the group first to RSVP to events</p>
                                <Link
                                    href={`/groups/${event.group_id}`}
                                    className="inline-block px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg text-lg"
                                >
                                    Join Group to RSVP
                                </Link>
                            </div>
                        ) : rsvp && rsvp.status !== 'not_going' ? (
                            /* Already RSVP'd (attending or waitlist) */
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
                                    rsvp.status === 'attending'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                }`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {rsvp.status === 'attending'
                                        ? "You're going"
                                        : `Waitlist #${rsvp.waitlist_position}`
                                    }
                                </div>

                                {rsvp.status === 'attending' && event.allow_guests && (
                                    <select
                                        value={selectedGuestCount}
                                        onChange={(e) => handleUpdateGuests(parseInt(e.target.value, 10))}
                                        disabled={rsvpLoading}
                                        className="px-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 bg-white text-stone-700"
                                    >
                                        {Array.from({ length: (event.max_guests_per_rsvp || 1) + 1 }, (_, i) => (
                                            <option key={i} value={i}>{i === 0 ? 'Just me' : `+ ${i} guest${i > 1 ? 's' : ''}`}</option>
                                        ))}
                                    </select>
                                )}

                                <button
                                    onClick={() => handleRsvp('leave')}
                                    disabled={rsvpLoading}
                                    className="px-6 py-2.5 text-stone-500 hover:text-stone-700 font-medium transition disabled:opacity-50"
                                >
                                    {rsvpLoading ? 'Updating...' : "Can't make it"}
                                </button>
                            </div>
                        ) : (
                            /* Not RSVP'd - show join options */
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                {event.allow_guests && (
                                    <select
                                        value={selectedGuestCount}
                                        onChange={(e) => setSelectedGuestCount(parseInt(e.target.value, 10))}
                                        disabled={rsvpLoading}
                                        className="px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 bg-white text-stone-700"
                                    >
                                        {Array.from({ length: (event.max_guests_per_rsvp || 1) + 1 }, (_, i) => (
                                            <option key={i} value={i}>{i === 0 ? 'Just me' : `Me + ${i} guest${i > 1 ? 's' : ''}`}</option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    onClick={() => handleRsvp('join', selectedGuestCount)}
                                    disabled={rsvpLoading}
                                    className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50"
                                >
                                    {rsvpLoading ? 'Updating...' : spotsRemaining === 0 ? 'Join Waitlist' : 'Count me in'}
                                </button>
                                {event.capacity && (
                                    <span className="text-sm text-stone-400">
                                        {spotsRemaining === 0 ? 'Full' : `${spotsRemaining} spots left`}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Footer />
        </main>
    );
}
