'use client';

/*
=======================================================================================================================================
Group Detail Page
=======================================================================================================================================
Displays a single group's details. Accessible to both logged-in and non-logged-in users.
Shows join button for non-members, pending status for those awaiting approval, and role for active members.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/context/AuthContext';
import {
    getGroup,
    joinGroup,
    getGroupMembers,
    approveMember,
    rejectMember,
    GroupWithCount,
    GroupMembership,
    GroupMember,
} from '@/lib/api/groups';
import { getAllEvents, EventWithDetails } from '@/lib/api/events';

import Header from '@/components/layout/Header';

// Number of pending members to show before "View all" link
const PENDING_PREVIEW_LIMIT = 5;

export default function GroupDetailPage() {
    const { user, token } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [membership, setMembership] = useState<GroupMembership | null>(null);
    const [pendingMembers, setPendingMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [processingMember, setProcessingMember] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [events, setEvents] = useState<EventWithDetails[]>([]);

    // =======================================================================
    // Check if user can manage members (organiser or host)
    // =======================================================================
    const canManageMembers = membership?.status === 'active' &&
        (membership?.role === 'organiser' || membership?.role === 'host');

    // Check if user is the organiser (can edit group settings)
    const isOrganiser = membership?.status === 'active' && membership?.role === 'organiser';

    // Sanitize HTML description for safe rendering
    const sanitizedDescription = useMemo(() => {
        if (!group?.description) return '';
        if (typeof window === 'undefined') return group.description;
        return DOMPurify.sanitize(group.description);
    }, [group?.description]);

    // =======================================================================
    // Fetch pending members (for organisers/hosts)
    // =======================================================================
    const fetchPendingMembers = useCallback(async () => {
        if (!params.id || !token) return;

        const result = await getGroupMembers(Number(params.id), token, 'pending');
        if (result.success && result.data) {
            setPendingMembers(result.data.members);
        }
    }, [params.id, token]);

    // =======================================================================
    // Fetch group details
    // =======================================================================
    useEffect(() => {
        async function fetchGroup() {
            if (!params.id) return;

            const result = await getGroup(Number(params.id), token || undefined);
            if (result.success && result.data) {
                setGroup(result.data.group);
                setMembership(result.data.membership);
            } else {
                setError(result.error || 'Group not found');
            }
            setLoading(false);
        }
        fetchGroup();
    }, [params.id, token]);

    // =======================================================================
    // Fetch pending members when user is organiser/host
    // =======================================================================
    useEffect(() => {
        if (canManageMembers) {
            fetchPendingMembers();
        }
    }, [canManageMembers, fetchPendingMembers]);

    // =======================================================================
    // Fetch group events
    // =======================================================================
    useEffect(() => {
        async function fetchEvents() {
            if (!params.id) return;

            const result = await getAllEvents(token || undefined, Number(params.id));
            if (result.success && result.data) {
                setEvents(result.data);
            }
        }
        fetchEvents();
    }, [params.id, token]);

    // =======================================================================
    // Handle join group
    // =======================================================================
    const handleJoinGroup = async () => {
        if (!token || !group) return;

        setJoining(true);
        const result = await joinGroup(token, group.id);
        setJoining(false);

        if (result.success && result.data) {
            // Update membership state based on response
            setMembership({
                status: result.data.status,
                role: 'member',
            });
            // Update member count if they joined immediately
            if (result.data.status === 'active') {
                setGroup(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);
            }
        } else {
            // Show error - could be ALREADY_MEMBER, ALREADY_PENDING, etc.
            alert(result.error || 'Failed to join group');
        }
    };

    // =======================================================================
    // Handle approve member
    // =======================================================================
    const handleApproveMember = async (membershipId: number) => {
        if (!token || !group) return;

        setProcessingMember(membershipId);
        const result = await approveMember(token, group.id, membershipId);
        setProcessingMember(null);

        if (result.success) {
            // Remove from pending list
            setPendingMembers(prev => prev.filter(m => m.id !== membershipId));
            // Update member count
            setGroup(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);
        } else {
            alert(result.error || 'Failed to approve member');
        }
    };

    // =======================================================================
    // Handle reject member
    // =======================================================================
    const handleRejectMember = async (membershipId: number) => {
        if (!token || !group) return;

        setProcessingMember(membershipId);
        const result = await rejectMember(token, group.id, membershipId);
        setProcessingMember(null);

        if (result.success) {
            // Remove from pending list
            setPendingMembers(prev => prev.filter(m => m.id !== membershipId));
        } else {
            alert(result.error || 'Failed to reject member');
        }
    };

    // =======================================================================
    // Render membership button/badge
    // =======================================================================
    const renderMembershipAction = () => {
        // Not logged in - show login prompt
        if (!user) {
            return (
                <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Log in to join
                </button>
            );
        }

        // Has membership
        if (membership) {
            if (membership.status === 'pending') {
                return (
                    <span className="px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg">
                        Request Pending
                    </span>
                );
            }

            // Active member - show role
            const roleLabels: Record<string, string> = {
                organiser: 'Organiser',
                host: 'Host',
                member: 'Member',
            };
            return (
                <span className="px-6 py-3 bg-green-100 text-green-800 rounded-lg">
                    {roleLabels[membership.role] || 'Member'}
                </span>
            );
        }

        // No membership - show join button
        return (
            <button
                onClick={handleJoinGroup}
                disabled={joining}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {joining ? 'Joining...' : 'Join Group'}
            </button>
        );
    };

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
    if (error || !group) {
        return (
            <main className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-gray-600 mb-4">{error || 'Group not found'}</p>
                    <Link href="/groups" className="text-blue-600 hover:text-blue-700">
                        Back to groups
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Group detail view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Group Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        {group.image_url ? (
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                                <img
                                    src={group.image_url}
                                    alt={group.name}
                                    className="w-full h-full object-cover"
                                    style={{ objectPosition: group.image_position || 'center' }}
                                />
                            </div>
                        ) : (
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                                <span className="text-3xl sm:text-4xl text-blue-400">
                                    {group.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
                            {sanitizedDescription && (
                                <div
                                    className="prose prose-sm max-w-none text-gray-600 mb-4"
                                    dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                                />
                            )}
                            <p className="text-gray-500 mb-4 sm:mb-0">
                                {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                            </p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
                            {renderMembershipAction()}
                            {isOrganiser && (
                                <Link
                                    href={`/groups/${group.id}/edit`}
                                    className="text-sm text-gray-500 hover:text-gray-700 transition"
                                >
                                    Edit Group
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                {/* Pending Members Section - Only visible to organisers/hosts */}
                {canManageMembers && pendingMembers.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                            Pending Requests ({pendingMembers.length})
                        </h2>
                        <div className="bg-white rounded-lg border divide-y">
                            {pendingMembers.slice(0, PENDING_PREVIEW_LIMIT).map(member => (
                                <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Avatar */}
                                        {member.avatar_url ? (
                                            <img
                                                src={member.avatar_url}
                                                alt={member.name}
                                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg text-blue-400">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                            <p className="text-sm text-gray-500">
                                                Requested {new Date(member.joined_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 sm:flex-shrink-0">
                                        <button
                                            onClick={() => handleApproveMember(member.id)}
                                            disabled={processingMember === member.id}
                                            className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingMember === member.id ? '...' : 'Approve'}
                                        </button>
                                        <button
                                            onClick={() => handleRejectMember(member.id)}
                                            disabled={processingMember === member.id}
                                            className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingMember === member.id ? '...' : 'Reject'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {pendingMembers.length > PENDING_PREVIEW_LIMIT && (
                            <Link
                                href={`/groups/${group.id}/members`}
                                className="block text-center text-blue-600 hover:text-blue-700 mt-4"
                            >
                                View all {pendingMembers.length} pending requests
                            </Link>
                        )}
                    </div>
                )}

                {/* Members Section */}
                <div className="bg-white rounded-lg border p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="text-center sm:text-left">
                        <h2 className="text-xl font-bold text-gray-900">Members</h2>
                        <p className="text-gray-500">
                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'} in this group
                        </p>
                    </div>
                    <Link
                        href={`/groups/${group.id}/members`}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        View Members
                    </Link>
                </div>

                {/* Upcoming Events Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Upcoming Events</h2>
                    {canManageMembers && (
                        <Link
                            href={`/groups/${group.id}/events/create`}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center"
                        >
                            Create Event
                        </Link>
                    )}
                </div>
                {events.length > 0 ? (
                    <div className="space-y-4">
                        {events.map(event => {
                            const eventDate = new Date(event.date_time);
                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="block bg-white rounded-lg border p-4 sm:p-6 hover:border-blue-300 transition"
                                >
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {/* Date badge */}
                                        <div className="flex-shrink-0 text-center sm:text-left">
                                            <div className="inline-block sm:block bg-blue-50 rounded-lg p-3 sm:w-20">
                                                <p className="text-sm text-blue-600 font-medium">
                                                    {eventDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                                                </p>
                                                <p className="text-2xl font-bold text-blue-700">
                                                    {eventDate.getDate()}
                                                </p>
                                                <p className="text-sm text-blue-600">
                                                    {eventDate.toLocaleDateString('en-GB', { month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Event details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {event.title}
                                                </h3>
                                                {event.rsvp_status && (
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        event.rsvp_status === 'attending'
                                                            ? 'text-green-700 bg-green-100'
                                                            : 'text-amber-700 bg-amber-100'
                                                    }`}>
                                                        {event.rsvp_status === 'attending' ? 'Going' : 'Waitlist'}
                                                    </span>
                                                )}
                                                {event.status === 'cancelled' && (
                                                    <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                                        Cancelled
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-sm mb-2">
                                                {eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                {event.location && ` · ${event.location}`}
                                            </p>
                                            <p className="text-gray-600 text-sm">
                                                {event.attendee_count || 0} going
                                                {event.capacity && ` · ${event.capacity - (event.attendee_count || 0)} spots left`}
                                                {(event.waitlist_count || 0) > 0 && ` · ${event.waitlist_count} on waitlist`}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border p-6 sm:p-8 text-center">
                        <p className="text-gray-600">No upcoming events in this group.</p>
                        {canManageMembers && (
                            <p className="text-gray-500 mt-2 text-sm">
                                Create an event to get started!
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
