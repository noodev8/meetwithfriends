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
import InviteLinkSection from '@/components/ui/InviteLinkSection';
import DOMPurify from 'dompurify';
import { getCategoryConfig } from '@/lib/eventCategories';
import { FEATURE_GUESTS_ENABLED } from '@/lib/featureFlags';
import AppDownloadBanner from '@/components/ui/AppDownloadBanner';
import ManageHostsModal from '@/components/ui/ManageHostsModal';

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
    const [visibleCommentCount, setVisibleCommentCount] = useState(3);

    // Profile modal state
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);

    // Cancel RSVP confirmation modal
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Manage hosts modal state
    const [showManageHosts, setShowManageHosts] = useState(false);

    // Description expand/collapse state
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // =======================================================================
    // Constants
    // =======================================================================
    const DESCRIPTION_CHAR_LIMIT = 200;

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
            return { href: '/your-events', label: 'Your Events' };
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
    // Sanitize HTML description for safe rendering (links open in new tab)
    // =======================================================================
    const sanitizedDescription = useMemo(() => {
        if (!event?.description) return '';
        if (typeof window === 'undefined') return event.description;
        // Add hook to make all links open in new tab
        DOMPurify.addHook('afterSanitizeAttributes', (node) => {
            if (node.tagName === 'A') {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });
        const result = DOMPurify.sanitize(event.description);
        DOMPurify.removeHook('afterSanitizeAttributes');
        return result;
    }, [event?.description]);

    // Strip HTML tags for plain text display and character counting
    const plainTextDescription = useMemo(() => {
        if (!event?.description) return '';
        return event.description
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }, [event?.description]);

    const isLongDescription = plainTextDescription.length > DESCRIPTION_CHAR_LIMIT;

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
            setComments(prev => [result.data!, ...prev]);
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
                            href="/your-events"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                        >
                            Back to your events
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
                                        {canEdit && !isPastEvent && event.status !== 'cancelled' && (
                                            <button
                                                onClick={() => setShowManageHosts(true)}
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors ml-2"
                                            >
                                                Manage
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-slate-500">
                                            Hosted by <span className="font-medium text-slate-700">{event.creator_name}</span>
                                        </p>
                                        {canEdit && !isPastEvent && event.status !== 'cancelled' && (
                                            <button
                                                onClick={() => setShowManageHosts(true)}
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors ml-2"
                                            >
                                                Manage
                                            </button>
                                        )}
                                    </>
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

                            {/* Pre-order Banner — above the fold CTA */}
                            {event.preorders_enabled && !isPastEvent && event.status !== 'cancelled' && (
                                <div className="mt-5">
                                    {!rsvp || rsvp.status === 'not_going' ? (
                                        /* Not attending — neutral banner with View Menu link */
                                        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-slate-50 to-indigo-50">
                                            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        Menu available for this event
                                                    </p>
                                                </div>
                                                <Link
                                                    href={`/events/${event.id}/order`}
                                                    className="w-full sm:w-auto flex-shrink-0 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors text-center"
                                                >
                                                    View Menu
                                                </Link>
                                            </div>
                                        </div>
                                    ) : isCutoffPassed ? (
                                        /* Cutoff passed — slate banner with view link */
                                        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100">
                                            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700">
                                                            {rsvp.food_order || rsvp.dietary_notes ? 'Order submitted — deadline passed' : 'Order deadline passed'}
                                                        </p>
                                                        {rsvp.food_order && (
                                                            <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-sm">
                                                                {rsvp.food_order}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/events/${event.id}/order`}
                                                    className="w-full sm:w-auto flex-shrink-0 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors text-center"
                                                >
                                                    View Order & Menu
                                                </Link>
                                            </div>
                                        </div>
                                    ) : rsvp.food_order || rsvp.dietary_notes ? (
                                        /* Has order — green confirmation banner */
                                        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50">
                                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                                            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-emerald-800">Order submitted</p>
                                                        {rsvp.food_order && (
                                                            <p className="text-xs text-emerald-600/80 truncate max-w-xs sm:max-w-sm">
                                                                {rsvp.food_order}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/events/${event.id}/order`}
                                                    className="w-full sm:w-auto flex-shrink-0 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors text-center"
                                                >
                                                    Edit Order
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        /* No order yet — indigo/violet prompt banner */
                                        <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50">
                                            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                                            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm font-semibold text-indigo-800">
                                                        Menu available — place your pre-order
                                                    </p>
                                                </div>
                                                <Link
                                                    href={`/events/${event.id}/order`}
                                                    className="w-full sm:w-auto flex-shrink-0 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg shadow-sm transition-all text-center"
                                                >
                                                    Place Order
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AppDownloadBanner />

            {/* Main Content - Full Width */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="space-y-6">
                        {/* Description */}
                        {sanitizedDescription && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900 mb-4 font-display">About this event</h2>
                                {isDescriptionExpanded || !isLongDescription ? (
                                    <div
                                        className="text-slate-600 prose prose-sm max-w-none prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
                                        dangerouslySetInnerHTML={{
                                            __html: sanitizedDescription
                                        }}
                                    />
                                ) : (
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        {plainTextDescription.substring(0, DESCRIPTION_CHAR_LIMIT)}...
                                    </p>
                                )}
                                {isLongDescription && (
                                    <button
                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        {isDescriptionExpanded ? 'Show less' : 'Read more'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Invite People Section - visible to hosts and organisers */}
                        {canEdit && !isPastEvent && event.status !== 'cancelled' && token && (
                            <InviteLinkSection type="event" id={event.id} token={token} />
                        )}

                        {/* Attendees Section - Meetup style */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-slate-900 font-display">Attendees</h2>
                                    <span className="text-sm text-slate-500">
                                        {attendingCount} going
                                        {event.capacity && (
                                            <span className={spotsRemaining === 0 ? (event.waitlist_enabled !== false ? 'text-amber-600 font-medium' : 'text-red-600 font-medium') : 'text-slate-400'}>
                                                {' '}· {spotsRemaining === 0 ? (event.waitlist_enabled !== false ? 'Waitlist open' : 'Event full') : `${spotsRemaining} spots left`}
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
                                                                {waitlistCount > 0 && event.waitlist_enabled !== false && (
                                                                    <span className="text-xs text-yellow-600">
                                                                        {waitlistCount} on waitlist
                                                                    </span>
                                                                )}
                                                            </Link>
                                                        )}

                                                        {/* Show waitlist separately if no cluster */}
                                                        {remaining.length === 0 && waitlistCount > 0 && event.waitlist_enabled !== false && (
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
                                            {comments.slice(0, visibleCommentCount).map(comment => (
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
                                            {visibleCommentCount < comments.length && (
                                                <button
                                                    onClick={() => setVisibleCommentCount(prev => Math.min(prev + 10, comments.length))}
                                                    className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition py-1"
                                                >
                                                    Show more comments ({comments.length - visibleCommentCount} remaining)
                                                </button>
                                            )}
                                            {visibleCommentCount > 3 && (
                                                <button
                                                    onClick={() => setVisibleCommentCount(3)}
                                                    className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition py-1"
                                                >
                                                    Show less
                                                </button>
                                            )}
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

                                {FEATURE_GUESTS_ENABLED && rsvp.status === 'attending' && event.allow_guests && (
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
                                    Can&apos;t make it
                                </button>
                            </div>
                        ) : (
                            /* Not RSVP'd - show join options */
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                {FEATURE_GUESTS_ENABLED && event.allow_guests && (
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
                                {spotsRemaining === 0 && event.waitlist_enabled === false ? (
                                    <button
                                        disabled
                                        className="px-8 py-3 bg-slate-400 text-white font-semibold rounded-xl cursor-not-allowed opacity-75"
                                    >
                                        Event Full
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleRsvp('join', selectedGuestCount)}
                                        disabled={rsvpLoading}
                                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg disabled:opacity-50"
                                    >
                                        {rsvpLoading ? 'Updating...' : spotsRemaining === 0 ? 'Join Waitlist' : 'Count me in'}
                                    </button>
                                )}
                                <span className="text-sm text-slate-500">
                                    {attendingCount} going
                                    {event.capacity && (
                                        <span className={spotsRemaining === 0 ? (event.waitlist_enabled !== false ? 'text-amber-600' : 'text-red-600') : 'text-slate-400'}>
                                            {' '}· {spotsRemaining === 0 ? (event.waitlist_enabled !== false ? 'Waitlist open' : 'Event full') : `${spotsRemaining} spots left`}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manage Hosts Modal */}
            {showManageHosts && event && (
                <ManageHostsModal
                    eventId={event.id}
                    groupId={event.group_id}
                    hosts={hosts}
                    onClose={() => setShowManageHosts(false)}
                    onHostsChanged={(updatedHosts) => setHosts(updatedHosts)}
                />
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

        </SidebarLayout>
    );
}
