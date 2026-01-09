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
import {
    getComments,
    addComment,
    deleteComment,
    CommentWithDetails,
} from '@/lib/api/comments';
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
    const [attendingCount, setAttendingCount] = useState(0);
    const [waitlistCount, setWaitlistCount] = useState(0);
    const [canViewAttendees, setCanViewAttendees] = useState(false);
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

                    {/* Title and RSVP row */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                {event.title}
                            </h1>
                            <p className="text-gray-500">
                                Hosted by {event.creator_name}
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
                                    {rsvp.status === 'attending' ? "You're going!" : `Waitlist #${rsvp.waitlist_position}`}
                                </span>
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
                                        <button
                                            onClick={() => handleRsvp('join')}
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

                    {/* Edit/Cancel buttons - separate row for hosts */}
                    {(canEdit || (event.status === 'cancelled' && canManageAttendees)) && (
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
                        </div>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
                            <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                        </div>
                    )}

                    {/* Attendees */}
                    <div>
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Attendees ({attendingCount})
                            </h2>

                            {/* Members can view full attendee list */}
                            {canViewAttendees ? (
                                <>
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
                                            ? `${attendingCount} ${attendingCount === 1 ? 'person is' : 'people are'} attending`
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
