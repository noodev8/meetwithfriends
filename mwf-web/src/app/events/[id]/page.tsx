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
    // Handle manage attendee action
    // =======================================================================
    const handleManageAttendee = async (userId: number, action: 'remove' | 'demote' | 'promote') => {
        if (!token || !event) return;

        setManagingUser(userId);
        const result = await manageAttendee(token, event.id, userId, action);
        setManagingUser(null);

        if (result.success) {
            // Refresh attendees (pass token to get full list)
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

                            {/* Hosts */}
                            <p className="text-stone-500 mb-4">
                                Hosted by{' '}
                                {hosts.length > 0
                                    ? hosts.map((h, i) => (
                                        <span key={h.user_id} className="font-medium text-stone-700">
                                            {h.name}
                                            {i < hosts.length - 2 && ', '}
                                            {i === hosts.length - 2 && ' and '}
                                        </span>
                                    ))
                                    : <span className="font-medium text-stone-700">{event.creator_name}</span>
                                }
                            </p>

                            {/* RSVP Section */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Attendance info */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-full text-sm">
                                    <span className="font-semibold text-stone-900">{event.attendee_count}</span>
                                    <span className="text-stone-600">going</span>
                                    {event.capacity && (
                                        <>
                                            <span className="text-stone-300">•</span>
                                            <span className="text-stone-600">{spotsRemaining} left</span>
                                        </>
                                    )}
                                </div>

                                {/* RSVP Status Badge */}
                                {rsvp && (
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
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
                                        <label htmlFor="guestCount" className="text-sm text-stone-600">Guests:</label>
                                        <select
                                            id="guestCount"
                                            value={selectedGuestCount}
                                            onChange={(e) => handleUpdateGuests(parseInt(e.target.value, 10))}
                                            disabled={rsvpLoading}
                                            className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 bg-white"
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
                                                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                                            >
                                                Log in to RSVP
                                            </Link>
                                        ) : !isGroupMember ? (
                                            <Link
                                                href={`/groups/${event.group_id}`}
                                                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                                                title="Join this group to RSVP"
                                            >
                                                Join Group
                                            </Link>
                                        ) : rsvp ? (
                                            <button
                                                onClick={() => handleRsvp('leave')}
                                                disabled={rsvpLoading}
                                                className="px-6 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition disabled:opacity-50"
                                            >
                                                {rsvpLoading ? 'Updating...' : 'Cancel RSVP'}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {event.allow_guests && (
                                                    <div className="flex items-center gap-2">
                                                        <label htmlFor="joinGuestCount" className="text-sm text-stone-600">Guests:</label>
                                                        <select
                                                            id="joinGuestCount"
                                                            value={selectedGuestCount}
                                                            onChange={(e) => setSelectedGuestCount(parseInt(e.target.value, 10))}
                                                            disabled={rsvpLoading}
                                                            className="px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 bg-white"
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
                                                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md disabled:opacity-50"
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
                                    <span className="text-stone-500">Event ended</span>
                                )}
                            </div>

                            {/* Edit/Cancel/Step down buttons */}
                            {(canEdit || (event.status === 'cancelled' && canManageAttendees) || (isHost && hosts.length > 1)) && (
                                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-stone-200">
                                    {canEdit && (
                                        <>
                                            <Link
                                                href={`/events/${event.id}/edit`}
                                                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition text-sm font-medium"
                                            >
                                                Edit Event
                                            </Link>
                                            <button
                                                onClick={handleCancelEvent}
                                                disabled={cancelLoading}
                                                className="text-sm text-stone-400 hover:text-red-600 transition disabled:opacity-50"
                                            >
                                                {cancelLoading ? 'Cancelling...' : 'Cancel event'}
                                            </button>
                                        </>
                                    )}
                                    {event.status === 'cancelled' && canManageAttendees && (
                                        <button
                                            onClick={handleRestoreEvent}
                                            disabled={restoreLoading}
                                            className="text-sm text-stone-400 hover:text-green-600 transition disabled:opacity-50"
                                        >
                                            {restoreLoading ? 'Restoring...' : 'Restore event'}
                                        </button>
                                    )}
                                    {isHost && hosts.length > 1 && (
                                        <button
                                            onClick={handleStepDown}
                                            disabled={hostActionLoading}
                                            className="text-sm text-stone-400 hover:text-orange-600 transition disabled:opacity-50"
                                        >
                                            {hostActionLoading ? 'Stepping down...' : 'Step down as host'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Left Column - Event Details */}
                    <div className="flex-1 space-y-6">
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

                        {/* Discussion Section */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-stone-900 mb-4 font-display">
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
                                            No comments yet. Be the first to start the discussion!
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

                    {/* Right Column - Sidebar */}
                    <div className="lg:w-80 space-y-6">
                        {/* Attendees Card - Compact View */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm lg:sticky lg:top-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-stone-900 font-display">
                                    Attendees ({attendingCount}{totalGuestCount > 0 ? ` +${totalGuestCount}` : ''})
                                </h2>
                                {canViewAttendees && (attendingCount > 0 || waitlistCount > 0) && (
                                    <Link
                                        href={`/events/${event.id}/attendees`}
                                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                    >
                                        See all
                                    </Link>
                                )}
                            </div>

                            {/* Members can view attendee preview */}
                            {canViewAttendees ? (
                                <>
                                    {attending.length > 0 || hosts.length > 0 ? (
                                        <div className="space-y-3">
                                            {/* Show hosts first */}
                                            {hosts.map(host => {
                                                const hostAttendee = attending.find(a => a.user_id === host.user_id);
                                                return (
                                                    <div
                                                        key={host.user_id}
                                                        className="flex items-center gap-3"
                                                    >
                                                        <button
                                                            onClick={() => hostAttendee && setSelectedAttendee(hostAttendee)}
                                                            className="flex-shrink-0 hover:opacity-80 transition"
                                                        >
                                                            {host.avatar_url ? (
                                                                <img
                                                                    src={host.avatar_url}
                                                                    alt={host.name}
                                                                    className="w-10 h-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-amber-600">
                                                                        {host.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </button>
                                                        <div className="min-w-0">
                                                            <button
                                                                onClick={() => hostAttendee && setSelectedAttendee(hostAttendee)}
                                                                className="text-sm font-medium text-stone-900 hover:text-amber-600 transition text-left block truncate"
                                                            >
                                                                {host.name}
                                                            </button>
                                                            <span className="text-xs text-amber-600 font-medium">Host</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Show up to 4 non-host attendees */}
                                            {attending
                                                .filter(a => !hosts.some(h => h.user_id === a.user_id))
                                                .slice(0, 4)
                                                .map(person => (
                                                    <div
                                                        key={person.user_id}
                                                        className="flex items-center gap-3"
                                                    >
                                                        <button
                                                            onClick={() => setSelectedAttendee(person)}
                                                            className="flex-shrink-0 hover:opacity-80 transition"
                                                        >
                                                            {person.avatar_url ? (
                                                                <img
                                                                    src={person.avatar_url}
                                                                    alt={person.name}
                                                                    className="w-10 h-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-amber-600">
                                                                        {person.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedAttendee(person)}
                                                            className="text-sm font-medium text-stone-900 truncate hover:text-amber-600 transition text-left"
                                                        >
                                                            {person.name}
                                                            {person.guest_count > 0 && (
                                                                <span className="ml-1 text-stone-400 font-normal">
                                                                    +{person.guest_count}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}

                                            {/* Show "and X more" if there are more attendees */}
                                            {attending.filter(a => !hosts.some(h => h.user_id === a.user_id)).length > 4 && (
                                                <Link
                                                    href={`/events/${event.id}/attendees`}
                                                    className="text-sm text-stone-500 hover:text-amber-600 transition pl-13"
                                                >
                                                    +{attending.filter(a => !hosts.some(h => h.user_id === a.user_id)).length - 4} more going
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-stone-500 text-sm">No attendees yet. Be the first!</p>
                                    )}

                                    {/* Waitlist summary */}
                                    {waitlistCount > 0 && (
                                        <div className="mt-4 pt-4 border-t border-stone-200">
                                            <Link
                                                href={`/events/${event.id}/attendees`}
                                                className="text-sm text-yellow-600 hover:text-yellow-700"
                                            >
                                                {waitlistCount} on waitlist
                                            </Link>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Non-members only see count */
                                <div className="text-center py-4">
                                    <div className="text-4xl mb-3">👥</div>
                                    <p className="text-stone-500 mb-2">
                                        {attendingCount > 0
                                            ? `${attendingCount} ${attendingCount === 1 ? 'person is' : 'people are'} attending`
                                            : 'No attendees yet'}
                                    </p>
                                    <p className="text-sm text-stone-400">
                                        Join this group to see who's attending
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Manage Hosts Card - only visible to hosts/organisers */}
                        {canManageAttendees && (
                            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-stone-900 font-display">
                                        Hosts ({hosts.length})
                                    </h2>
                                    <button
                                        onClick={() => setShowHostManager(!showHostManager)}
                                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                    >
                                        {showHostManager ? 'Done' : 'Manage'}
                                    </button>
                                </div>

                                {/* Current hosts list */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {hosts.map(host => (
                                        <div
                                            key={host.user_id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full"
                                        >
                                            {host.avatar_url ? (
                                                <img
                                                    src={host.avatar_url}
                                                    alt={host.name}
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
                                                    <span className="text-xs text-amber-700">
                                                        {host.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="text-sm text-amber-800">{host.name}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Add host interface */}
                                {showHostManager && (
                                    <div className="pt-4 border-t border-stone-200">
                                        <label className="block text-sm font-medium text-stone-700 mb-2">
                                            Add a host
                                        </label>
                                        <input
                                            type="text"
                                            value={hostSearchQuery}
                                            onChange={(e) => handleHostSearch(e.target.value)}
                                            placeholder="Search members..."
                                            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                        />

                                        {searchLoading && (
                                            <p className="text-sm text-stone-500 mt-2">Searching...</p>
                                        )}

                                        {!searchLoading && searchResults.length > 0 && (
                                            <div className="mt-2 border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-48 overflow-y-auto">
                                                {searchResults.map(member => (
                                                    <button
                                                        key={member.user_id}
                                                        onClick={() => handleAddHost(member.user_id)}
                                                        disabled={hostActionLoading}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 disabled:opacity-50 text-left transition"
                                                    >
                                                        {member.avatar_url ? (
                                                            <img
                                                                src={member.avatar_url}
                                                                alt={member.name}
                                                                className="w-8 h-8 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                                <span className="text-sm text-amber-600">
                                                                    {member.name.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-stone-900 truncate">{member.name}</p>
                                                        </div>
                                                        <span className="text-xs text-amber-600 font-medium">Add</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {!searchLoading && hostSearchQuery.length >= 2 && searchResults.length === 0 && (
                                            <p className="text-sm text-stone-500 mt-2">No members found</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Food Orders Card - for hosts when event has pre-orders */}
                        {canManageAttendees && event.preorders_enabled && attending.some(a => a.food_order || a.dietary_notes) && (
                            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-stone-900 mb-4 font-display">Food Orders</h2>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {attending.filter(a => a.food_order || a.dietary_notes).map(person => (
                                        <div key={person.user_id} className="p-3 bg-stone-50 rounded-lg">
                                            {editingOrderUserId === person.user_id ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editFoodOrder}
                                                        onChange={(e) => setEditFoodOrder(e.target.value)}
                                                        placeholder="Food order..."
                                                        maxLength={500}
                                                        className="w-full px-2 py-1 text-sm border border-stone-300 rounded focus:ring-2 focus:ring-amber-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editDietaryNotes}
                                                        onChange={(e) => setEditDietaryNotes(e.target.value)}
                                                        placeholder="Dietary notes..."
                                                        maxLength={200}
                                                        className="w-full px-2 py-1 text-sm border border-stone-300 rounded focus:ring-2 focus:ring-amber-500"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateOtherOrder(person.user_id)}
                                                            disabled={orderLoading}
                                                            className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                                                        >
                                                            {orderLoading ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingOrderUserId(null)}
                                                            className="px-2 py-1 text-xs text-stone-600 bg-stone-200 rounded hover:bg-stone-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-stone-900">{person.name}</span>
                                                        <button
                                                            onClick={() => startEditOrder(person)}
                                                            className="text-xs text-amber-600 hover:text-amber-700"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                    {person.food_order && (
                                                        <p className="text-sm text-stone-600">{person.food_order}</p>
                                                    )}
                                                    {person.dietary_notes && (
                                                        <p className="text-xs text-orange-600 mt-1">{person.dietary_notes}</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
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
        </main>
    );
}
