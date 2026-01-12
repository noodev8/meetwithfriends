'use client';

/*
=======================================================================================================================================
Event Detail Page
=======================================================================================================================================
Shows event details, RSVP functionality, and attendee list.
=======================================================================================================================================
*/

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getEvent,
    getAttendees,
    rsvpEvent,
    updateRsvp,
    submitOrder,
    contactHost,
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
import SidebarLayout from '@/components/layout/SidebarLayout';
import DOMPurify from 'dompurify';
import { getCategoryConfig } from '@/lib/eventCategories';

export default function EventDetailPage() {
    const { user, token } = useAuth();
    const params = useParams();
    const searchParams = useSearchParams();
    const fromParam = searchParams.get('from');

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
    const [hosts, setHosts] = useState<EventHost[]>([]);
    const [isGroupMember, setIsGroupMember] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [attending, setAttending] = useState<Attendee[]>([]);
    const [, setWaitlist] = useState<Attendee[]>([]);
    const [attendingCount, setAttendingCount] = useState(0);
    const [waitlistCount, setWaitlistCount] = useState(0);
    const [canViewAttendees, setCanViewAttendees] = useState(false);
    const [selectedGuestCount, setSelectedGuestCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [rsvpLoading, setRsvpLoading] = useState(false);
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
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Profile modal state
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);

    // Cancel RSVP confirmation modal
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Contact host modal state
    const [showContactHostModal, setShowContactHostModal] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [contactLoading, setContactLoading] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);

    // =======================================================================
    // Compute back link based on navigation source
    // =======================================================================
    const backLink = useMemo(() => {
        if (!fromParam) {
            // Default: back to group
            return event ? {
                href: `/groups/${event.group_id}`,
                label: event.group_name
            } : null;
        }

        if (fromParam === 'dashboard') {
            return { href: '/dashboard', label: 'Dashboard' };
        }

        if (fromParam === 'your-events') {
            return { href: '/your-events', label: 'Your Events' };
        }

        // Handle group-{id} format
        if (fromParam.startsWith('group-') && !fromParam.includes('-events')) {
            const groupId = fromParam.replace('group-', '');
            return {
                href: `/groups/${groupId}`,
                label: event?.group_name || 'Group'
            };
        }

        // Handle group-{id}-events format
        if (fromParam.startsWith('group-') && fromParam.endsWith('-events')) {
            const groupId = fromParam.replace('group-', '').replace('-events', '');
            return {
                href: `/groups/${groupId}/events`,
                label: event ? `${event.group_name} Events` : 'Group Events'
            };
        }

        // Fallback to group
        return event ? {
            href: `/groups/${event.group_id}`,
            label: event.group_name
        } : null;
    }, [fromParam, event]);

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
                setIsGroupMember(eventResult.data.is_group_member);
                setCanEdit(eventResult.data.can_edit);
            } else {
                setError(eventResult.error || 'Event not found');
            }

            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
                setWaitlist(attendeesResult.data.waitlist);
                setAttendingCount(attendeesResult.data.attending_count);
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
            setShowOrderModal(false);
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
    // Handle contact host
    // =======================================================================
    const handleContactHost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !event || !contactMessage.trim()) return;

        setContactLoading(true);
        const result = await contactHost(token, event.id, contactMessage.trim());
        setContactLoading(false);

        if (result.success) {
            setContactSuccess(true);
            setContactMessage('');
            setTimeout(() => {
                setShowContactHostModal(false);
                setContactSuccess(false);
            }, 2000);
        } else {
            alert(result.error || 'Failed to send message');
        }
    };

    // Check if user can contact hosts (attendee or waitlist)
    const canContactHost = rsvp && (rsvp.status === 'attending' || rsvp.status === 'waitlist');

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 mt-4">Loading event...</p>
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
                        <p className="text-slate-600 mb-6">{error || 'This event may have been removed or doesn\'t exist.'}</p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    const { date, time } = formatDateTime(event.date_time);
    const totalSpotsUsed = (event.attendee_count || 0) + (event.total_guest_count || 0);
    const spotsRemaining = event.capacity ? event.capacity - totalSpotsUsed : null;

    return (
        <SidebarLayout>
            {/* Hero Section - Card Style with Category Gradient */}
            <div className="bg-slate-50 border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    {/* Breadcrumb - dynamic back link based on navigation source */}
                    {backLink && (
                        <Link
                            href={backLink.href}
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {backLink.label}
                        </Link>
                    )}

                    {/* Hero Card with Gradient Header */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {/* Category Gradient Header */}
                        {(() => {
                            const categoryConfig = getCategoryConfig(event.category);
                            return (
                                <div className={`relative h-32 sm:h-40 bg-gradient-to-r ${categoryConfig.gradient}`}>
                                    {/* Large emoji */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-7xl sm:text-8xl opacity-80">{categoryConfig.emoji}</span>
                                    </div>
                                    {/* Status badges overlay */}
                                    {(event.status === 'cancelled' || isPastEvent) && (
                                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                            {event.status === 'cancelled' && (
                                                <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full shadow-sm">
                                                    Cancelled
                                                </span>
                                            )}
                                            {isPastEvent && event.status !== 'cancelled' && (
                                                <span className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-100 rounded-full shadow-sm">
                                                    Past Event
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Event Info Content */}
                        <div className="p-6 sm:p-8">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 font-display">
                                {event.title}
                            </h1>

                            {/* Date/Time/Location quick info */}
                            <div className="space-y-2 mb-5">
                                <div className="flex items-center gap-3 text-slate-700">
                                    <span className="text-xl">📅</span>
                                    <div>
                                        <span className="font-medium">{date}</span>
                                        <span className="text-slate-400 mx-2">•</span>
                                        <span>{time}</span>
                                    </div>
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <span className="text-xl">📍</span>
                                        <span>{event.location}</span>
                                    </div>
                                )}
                            </div>

                            {/* Hosted by with avatar */}
                            <div className="flex items-center gap-3 mb-5">
                                {hosts.length > 0 ? (
                                    <>
                                        {/* Host avatar(s) */}
                                        <div className="flex -space-x-2">
                                            {hosts.slice(0, 2).map((h, i) => (
                                                h.avatar_url ? (
                                                    <div key={h.user_id} className="relative w-8 h-8" style={{ zIndex: 2 - i }}>
                                                        <Image
                                                            src={h.avatar_url}
                                                            alt={h.name}
                                                            fill
                                                            className="rounded-full object-cover border-2 border-white"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={h.user_id}
                                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-200 to-violet-300 flex items-center justify-center border-2 border-white"
                                                        style={{ zIndex: 2 - i }}
                                                    >
                                                        <span className="text-sm font-medium text-indigo-800">
                                                            {h.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                        <p className="text-slate-500">
                                            Hosted by{' '}
                                            <span className="font-medium text-slate-700">
                                                {hosts[0].name}
                                                {hosts.length > 1 && ` +${hosts.length - 1} other${hosts.length > 2 ? 's' : ''}`}
                                            </span>
                                        </p>
                                        {canContactHost && (
                                            <button
                                                onClick={() => setShowContactHostModal(true)}
                                                className="ml-auto px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition flex items-center gap-1.5"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Contact
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-slate-500">
                                        Hosted by <span className="font-medium text-slate-700">{event.creator_name}</span>
                                    </p>
                                )}
                            </div>

                            {/* Status Badges and Edit */}
                            <div className="flex flex-wrap items-center gap-3">
                                {rsvp && rsvp.status !== 'not_going' && !isPastEvent && event.status !== 'cancelled' && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        rsvp.status === 'attending'
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-yellow-50 text-yellow-700'
                                    }`}>
                                        {rsvp.status === 'attending' ? "You're going" : `Waitlist #${rsvp.waitlist_position}`}
                                    </span>
                                )}
                                {canEdit && !isPastEvent && (
                                    <Link
                                        href={`/events/${event.id}/edit`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </Link>
                                )}
                                {canEdit && (
                                    <Link
                                        href={`/groups/${event.group_id}/events/create?from=${event.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Duplicate
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Full Width */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="space-y-6">
                        {/* Description */}
                        {event.description && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900 mb-4 font-display">About this event</h2>
                                <div
                                    className="text-slate-600 prose prose-sm max-w-none prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(event.description)
                                    }}
                                />
                            </div>
                        )}

                        {/* Pre-order Section - visible to attendees when pre-orders are enabled */}
                        {event.preorders_enabled && rsvp && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-slate-900 font-display">Your Order</h2>
                                    {orderSuccess && (
                                        <span className="text-sm text-green-600 font-medium">{orderSuccess}</span>
                                    )}
                                </div>
                                {isCutoffPassed ? (
                                    <div>
                                        {rsvp.food_order || rsvp.dietary_notes ? (
                                            <div className="space-y-2">
                                                {rsvp.food_order && (
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700">Order: </span>
                                                        <span className="text-slate-600">{rsvp.food_order}</span>
                                                    </div>
                                                )}
                                                {rsvp.dietary_notes && (
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700">Notes: </span>
                                                        <span className="text-slate-600">{rsvp.dietary_notes}</span>
                                                    </div>
                                                )}
                                                <p className="text-sm text-slate-500 mt-2">
                                                    Order deadline has passed. Contact a host if you need to make changes.
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-slate-500">
                                                Order deadline has passed. You did not submit an order.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {/* Show current order summary or prompt */}
                                        {rsvp.food_order || rsvp.dietary_notes ? (
                                            <div className="space-y-2 mb-4">
                                                {rsvp.food_order && (
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700">Order: </span>
                                                        <span className="text-slate-600">{rsvp.food_order}</span>
                                                    </div>
                                                )}
                                                {rsvp.dietary_notes && (
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700">Notes: </span>
                                                        <span className="text-slate-600">{rsvp.dietary_notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 mb-4">
                                                You haven&apos;t submitted an order yet.
                                            </p>
                                        )}

                                        {/* Edit/Add button and Menu link */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                onClick={() => setShowOrderModal(true)}
                                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                                            >
                                                {rsvp.food_order || rsvp.dietary_notes ? 'Edit Order' : 'Add Order'}
                                            </button>
                                            {event.menu_link && (
                                                <a
                                                    href={event.menu_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2.5 text-indigo-600 hover:text-indigo-700 font-medium transition"
                                                >
                                                    View Menu →
                                                </a>
                                            )}
                                        </div>

                                        {/* Deadline info */}
                                        {event.preorder_cutoff && (
                                            <p className="text-sm text-slate-500 mt-3">
                                                Order by {new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Order Modal */}
                        {showOrderModal && event && (
                            <div
                                className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) setShowOrderModal(false);
                                }}
                            >
                                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-900 font-display">Your Order</h3>
                                        <button
                                            onClick={() => setShowOrderModal(false)}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmitOrder} className="p-6 space-y-5">
                                        {/* Menu link */}
                                        {event.menu_link && (
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                                <a
                                                    href={event.menu_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-700 hover:text-indigo-800 font-medium flex items-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    View the menu
                                                </a>
                                            </div>
                                        )}

                                        {/* Order textarea */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label htmlFor="modalFoodOrder" className="block text-sm font-medium text-slate-700">
                                                    Your Order
                                                </label>
                                                <span className={`text-xs ${foodOrder.length > 450 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {foodOrder.length}/500
                                                </span>
                                            </div>
                                            <textarea
                                                id="modalFoodOrder"
                                                value={foodOrder}
                                                onChange={(e) => setFoodOrder(e.target.value)}
                                                placeholder="e.g., Chicken Caesar Salad, no croutons"
                                                rows={4}
                                                maxLength={500}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition text-base"
                                            />
                                        </div>

                                        {/* Notes textarea */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label htmlFor="modalDietaryNotes" className="block text-sm font-medium text-slate-700">
                                                    Notes / Preferences
                                                </label>
                                                <span className={`text-xs ${dietaryNotes.length > 180 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {dietaryNotes.length}/200
                                                </span>
                                            </div>
                                            <textarea
                                                id="modalDietaryNotes"
                                                value={dietaryNotes}
                                                onChange={(e) => setDietaryNotes(e.target.value)}
                                                placeholder="e.g., Vegetarian, nut allergy, extra spicy"
                                                rows={2}
                                                maxLength={200}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition text-base"
                                            />
                                        </div>

                                        {/* Deadline notice */}
                                        {event.preorder_cutoff && (
                                            <p className="text-sm text-indigo-600">
                                                Order by {new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowOrderModal(false)}
                                                className="flex-1 px-5 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={orderLoading}
                                                className="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                            >
                                                {orderLoading ? 'Saving...' : 'Save Order'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Attendees Section - Meetup style */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-slate-900 font-display">Attendees</h2>
                                    <span className="text-sm text-slate-500">
                                        {attendingCount} going
                                        {event.capacity && (
                                            <span className={spotsRemaining === 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                                                {' '}· {spotsRemaining === 0 ? 'Waitlist open' : `${spotsRemaining} spots left`}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                {canViewAttendees && (attendingCount > 0 || waitlistCount > 0) && (
                                    <Link
                                        href={`/events/${event.id}/attendees`}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        See all
                                    </Link>
                                )}
                            </div>

                            {canViewAttendees ? (
                                <>
                                    {attending.length > 0 || hosts.length > 0 ? (
                                        <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8">
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
                                                                            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                                                                                <Image
                                                                                    src={person.avatar_url}
                                                                                    alt={person.name}
                                                                                    fill
                                                                                    className="rounded-full object-cover"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                                                                                <span className="text-xl sm:text-2xl font-medium text-indigo-600">
                                                                                    {person.name.charAt(0).toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {person.isHost && (
                                                                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded">
                                                                                Host
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-slate-900">
                                                                        {person.name}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500">
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
                                                                        {remaining.slice(0, 3).map((person) => (
                                                                            person.avatar_url ? (
                                                                                <div key={person.user_id} className="relative w-full h-full">
                                                                                    <Image
                                                                                        src={person.avatar_url}
                                                                                        alt={person.name}
                                                                                        fill
                                                                                        className="rounded-full object-cover"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <div
                                                                                    key={person.user_id}
                                                                                    className="w-full h-full rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center"
                                                                                >
                                                                                    <span className="text-xs font-medium text-indigo-600">
                                                                                        {person.name.charAt(0).toUpperCase()}
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        ))}
                                                                        {remaining.length > 3 && (
                                                                            <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center">
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
                                                                <span className="text-sm font-medium text-slate-900">
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
                                                                <span className="text-sm font-medium text-slate-900">
                                                                    Waitlist
                                                                </span>
                                                            </Link>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500">No attendees yet. Be the first to RSVP!</p>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-slate-500 mb-2">
                                        {attendingCount > 0
                                            ? `${attendingCount} going${event.capacity ? ` · ${spotsRemaining} spots left` : ''}`
                                            : 'No attendees yet'}
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Join this group to see who's attending
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Discussion Section */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 font-display">
                                Discussion
                            </h2>

                            {/* Members can view and participate in discussion */}
                            {canViewComments ? (
                                <>
                                    {/* Add Comment Form - for attendees, waitlist, hosts, and organisers */}
                                    {user && (rsvp && (rsvp.status === 'attending' || rsvp.status === 'waitlist') || canEdit) ? (
                                        <form onSubmit={handleAddComment} className="mb-6">
                                            <div className="flex gap-3">
                                                {user.avatar_url ? (
                                                    <div className="relative w-10 h-10 flex-shrink-0">
                                                        <Image
                                                            src={user.avatar_url}
                                                            alt={user.name}
                                                            fill
                                                            className="rounded-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-medium text-indigo-600">
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
                                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition"
                                                    />
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-xs text-slate-400">
                                                            {newComment.length}/280
                                                        </span>
                                                        <button
                                                            type="submit"
                                                            disabled={commentLoading || !newComment.trim()}
                                                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {commentLoading ? 'Posting...' : 'Post'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    ) : user && isGroupMember && !canEdit ? (
                                        <div className="mb-6 p-4 bg-slate-50 rounded-xl text-center">
                                            <p className="text-sm text-slate-600">
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
                                                        <div className="relative w-10 h-10 flex-shrink-0">
                                                            <Image
                                                                src={comment.user_avatar_url}
                                                                alt={comment.user_name}
                                                                fill
                                                                className="rounded-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-sm font-medium text-indigo-600">
                                                                {comment.user_name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-slate-900 text-sm">
                                                                {comment.user_name}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {formatCommentDate(comment.created_at)}
                                                            </span>
                                                            {comment.can_delete && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    disabled={deletingComment === comment.id}
                                                                    className="text-xs text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                                                                    title="Delete comment"
                                                                >
                                                                    {deletingComment === comment.id ? '...' : 'Delete'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-700 text-sm mt-1 whitespace-pre-wrap break-words">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-center py-4">
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
                                    <p className="text-slate-500 mb-2">
                                        {commentCount > 0
                                            ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`
                                            : 'No comments yet'}
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        {user
                                            ? 'Join this group to view and participate in the discussion'
                                            : <>
                                                <Link href="/login" className="text-indigo-600 hover:text-indigo-700">Log in</Link>
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
                            <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80">
                                <Image
                                    src={selectedAttendee.avatar_url}
                                    alt={selectedAttendee.name}
                                    fill
                                    className="rounded-2xl object-cover shadow-2xl"
                                />
                            </div>
                        ) : (
                            <div className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-2xl bg-gradient-to-br from-indigo-200 to-violet-300 flex items-center justify-center shadow-2xl">
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
                <div className="bg-white border-t border-slate-200 py-8 px-4 sm:px-8">
                    <div className="max-w-2xl mx-auto">
                        {!user ? (
                            /* Not logged in */
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900 font-display mb-2">Want to attend?</h3>
                                <p className="text-slate-500 mb-6">Log in to RSVP to this event</p>
                                <Link
                                    href="/login"
                                    className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg text-lg"
                                >
                                    Log in to RSVP
                                </Link>
                            </div>
                        ) : !isGroupMember ? (
                            /* Not a group member */
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900 font-display mb-2">Want to attend?</h3>
                                <p className="text-slate-500 mb-6">Join the group first to RSVP to events</p>
                                <Link
                                    href={`/groups/${event.group_id}`}
                                    className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg text-lg"
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
                                        className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 bg-white text-slate-700"
                                    >
                                        {Array.from({ length: (event.max_guests_per_rsvp || 1) + 1 }, (_, i) => (
                                            <option key={i} value={i}>{i === 0 ? 'Just me' : `+ ${i} guest${i > 1 ? 's' : ''}`}</option>
                                        ))}
                                    </select>
                                )}

                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    disabled={rsvpLoading}
                                    className="px-6 py-2.5 text-slate-500 hover:text-slate-700 font-medium transition disabled:opacity-50"
                                >
                                    Can't make it
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
                                        className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 bg-white text-slate-700"
                                    >
                                        {Array.from({ length: (event.max_guests_per_rsvp || 1) + 1 }, (_, i) => (
                                            <option key={i} value={i}>{i === 0 ? 'Just me' : `Me + ${i} guest${i > 1 ? 's' : ''}`}</option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    onClick={() => handleRsvp('join', selectedGuestCount)}
                                    disabled={rsvpLoading}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg disabled:opacity-50"
                                >
                                    {rsvpLoading ? 'Updating...' : spotsRemaining === 0 ? 'Join Waitlist' : 'Count me in'}
                                </button>
                                <span className="text-sm text-slate-500">
                                    {attendingCount} going
                                    {event.capacity && (
                                        <span className={spotsRemaining === 0 ? 'text-amber-600' : 'text-slate-400'}>
                                            {' '}· {spotsRemaining === 0 ? 'Waitlist open' : `${spotsRemaining} spots left`}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cancel RSVP Confirmation Modal */}
            {showCancelModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowCancelModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                            Cancel your RSVP?
                        </h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Are you sure you can't make it to this event?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium"
                            >
                                Keep RSVP
                            </button>
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    handleRsvp('leave');
                                }}
                                disabled={rsvpLoading}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium disabled:opacity-50"
                            >
                                {rsvpLoading ? 'Cancelling...' : "Can't make it"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Host Modal */}
            {showContactHostModal && hosts.length > 0 && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => !contactLoading && setShowContactHostModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 font-display">
                                Contact {hosts.length === 1 ? hosts[0].name : 'Hosts'}
                            </h3>
                            <button
                                onClick={() => setShowContactHostModal(false)}
                                disabled={contactLoading}
                                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {contactSuccess ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-lg font-semibold text-slate-900">Message sent!</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    {hosts.length === 1 ? `${hosts[0].name} will` : 'The hosts will'} receive your message via email.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleContactHost} className="p-6 space-y-5">
                                <p className="text-sm text-slate-600">
                                    Send a message to {hosts.length === 1 ? 'the event host' : 'all event hosts'}. They will receive it via email and can reply directly to you.
                                </p>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="contactHostMessage" className="block text-sm font-medium text-slate-700">
                                            Your message
                                        </label>
                                        <span className={`text-xs ${contactMessage.length > 900 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {contactMessage.length}/1000
                                        </span>
                                    </div>
                                    <textarea
                                        id="contactHostMessage"
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        placeholder="Hi, I have a question about the event..."
                                        rows={6}
                                        maxLength={1000}
                                        minLength={10}
                                        required
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition text-base"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Minimum 10 characters</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowContactHostModal(false)}
                                        disabled={contactLoading}
                                        className="flex-1 px-5 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={contactLoading || contactMessage.trim().length < 10}
                                        className="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                    >
                                        {contactLoading ? 'Sending...' : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

        </SidebarLayout>
    );
}
