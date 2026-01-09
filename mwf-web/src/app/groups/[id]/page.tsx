'use client';

/*
=======================================================================================================================================
Group Detail Page
=======================================================================================================================================
Displays a single group's details with a modern two-column layout.
Hero image, main content on left, sidebar on right with organiser info, members, and actions.
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
    leaveGroup,
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
const PENDING_PREVIEW_LIMIT = 3;

export default function GroupDetailPage() {
    const { user, token } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [membership, setMembership] = useState<GroupMembership | null>(null);
    const [pendingMembers, setPendingMembers] = useState<GroupMember[]>([]);
    const [allMembers, setAllMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [processingMember, setProcessingMember] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [copied, setCopied] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);

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
    // Fetch all members for preview
    // =======================================================================
    const fetchAllMembers = useCallback(async () => {
        if (!params.id) return;

        const result = await getGroupMembers(Number(params.id), token || undefined, 'active');
        if (result.success && result.data) {
            setAllMembers(result.data.members);
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
    // Fetch all members for sidebar preview
    // =======================================================================
    useEffect(() => {
        fetchAllMembers();
    }, [fetchAllMembers]);

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
            setMembership({
                status: result.data.status,
                role: 'member',
            });
            if (result.data.status === 'active') {
                setGroup(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);
                // Refresh members list to update the avatar grid
                fetchAllMembers();
            }
        } else {
            alert(result.error || 'Failed to join group');
        }
    };

    // =======================================================================
    // Handle leave group (called after modal confirmation)
    // =======================================================================
    const handleLeaveGroup = async () => {
        if (!token || !group) return;

        setLeaving(true);
        const result = await leaveGroup(token, group.id);
        setLeaving(false);
        setShowLeaveModal(false);

        if (result.success) {
            router.push('/dashboard');
        } else {
            alert(result.error || 'Failed to leave group');
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
            setPendingMembers(prev => prev.filter(m => m.id !== membershipId));
            setGroup(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);
            fetchAllMembers();
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
            setPendingMembers(prev => prev.filter(m => m.id !== membershipId));
        } else {
            alert(result.error || 'Failed to reject member');
        }
    };

    // =======================================================================
    // Handle copy link
    // =======================================================================
    const handleCopyLink = async () => {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // =======================================================================
    // Find organiser from members
    // =======================================================================
    const organiser = allMembers.find(m => m.role === 'organiser');

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !group) {
        return (
            <main className="min-h-screen flex flex-col bg-stone-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-stone-600 mb-4">{error || 'Group not found'}</p>
                    <Link href="/dashboard" className="text-amber-600 hover:text-amber-700">
                        Back to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Group detail view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            {/* Hero Section */}
            <div className="bg-white border-b border-stone-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        {/* Group Image */}
                        {group.image_url ? (
                            <div className="w-full lg:w-96 h-48 sm:h-56 lg:h-64 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                                <img
                                    src={group.image_url}
                                    alt={group.name}
                                    className="w-full h-full object-cover"
                                    style={{ objectPosition: group.image_position || 'center' }}
                                />
                            </div>
                        ) : (
                            <div className="w-full lg:w-96 h-48 sm:h-56 lg:h-64 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-6xl sm:text-7xl text-white/80 font-display font-bold">
                                    {group.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}

                        {/* Group Info */}
                        <div className="flex-1 flex flex-col justify-center">
                            <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-800 mb-3">
                                {group.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-stone-600 mb-4">
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    {group.join_policy === 'auto' ? 'Public group' : 'Private group'}
                                </span>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap items-center gap-3">
                                {isOrganiser && (
                                    <Link
                                        href={`/groups/${group.id}/edit`}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Manage Group
                                    </Link>
                                )}
                                {canManageMembers && (
                                    <Link
                                        href={`/groups/${group.id}/events/create`}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Create Event
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Left Column - Main Content */}
                    <div className="flex-1 lg:flex-[3] space-y-6">
                        {/* Pending Members Alert - Only visible to organisers/hosts */}
                        {canManageMembers && pendingMembers.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-display text-lg font-semibold text-stone-800 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Pending Requests
                                        <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-sm rounded-full">
                                            {pendingMembers.length}
                                        </span>
                                    </h2>
                                    {pendingMembers.length > PENDING_PREVIEW_LIMIT && (
                                        <Link
                                            href={`/groups/${group.id}/members?tab=pending`}
                                            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                        >
                                            View all
                                        </Link>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {pendingMembers.slice(0, PENDING_PREVIEW_LIMIT).map(member => (
                                        <div key={member.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                                            {member.avatar_url ? (
                                                <img
                                                    src={member.avatar_url}
                                                    alt={member.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-amber-600">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-stone-800 truncate">{member.name}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApproveMember(member.id)}
                                                    disabled={processingMember === member.id}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectMember(member.id)}
                                                    disabled={processingMember === member.id}
                                                    className="px-3 py-1.5 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300 transition disabled:opacity-50"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* About Section */}
                        {sanitizedDescription && (
                            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
                                <h2 className="font-display text-lg font-semibold text-stone-800 mb-4">About</h2>
                                <div
                                    className="prose prose-stone prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                                />
                            </div>
                        )}

                        {/* Upcoming Events Section */}
                        <div>
                            <h2 className="font-display text-xl font-bold text-stone-800 mb-4">
                                Upcoming Events
                                {events.length > 0 && (
                                    <span className="ml-2 text-stone-400 font-normal text-lg">{events.length}</span>
                                )}
                            </h2>

                            {events.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {events.map(event => {
                                        const eventDate = new Date(event.date_time);
                                        // Use event image, fall back to group image
                                        const imageUrl = event.image_url || group.image_url;

                                        return (
                                            <Link
                                                key={event.id}
                                                href={`/events/${event.id}`}
                                                className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                                            >
                                                {/* Image header */}
                                                <div className="relative h-36 bg-stone-100">
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={event.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            style={{ objectPosition: event.image_url ? (event.image_position || 'center') : 'center' }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                            <svg className="w-10 h-10 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}

                                                    {/* Status badges overlay */}
                                                    <div className="absolute top-3 left-3 flex gap-2">
                                                        {event.rsvp_status && (
                                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${
                                                                event.rsvp_status === 'attending'
                                                                    ? 'text-green-800 bg-green-100'
                                                                    : 'text-amber-800 bg-amber-100'
                                                            }`}>
                                                                {event.rsvp_status === 'attending' ? 'Going' : 'Waitlist'}
                                                            </span>
                                                        )}
                                                        {event.status === 'cancelled' && (
                                                            <span className="px-2.5 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full shadow-sm">
                                                                Cancelled
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="p-4">
                                                    <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                                                        {event.title}
                                                    </h3>
                                                    <p className="text-sm text-stone-500 mt-1">
                                                        {eventDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {event.location && (
                                                        <p className="text-stone-500 text-sm mt-1 flex items-center gap-1.5 line-clamp-1">
                                                            <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            {event.location}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                            {event.attendee_count || 0} going
                                                        </span>
                                                        {event.capacity && (
                                                            <span>{event.capacity - (event.attendee_count || 0)} spots left</span>
                                                        )}
                                                        {(event.waitlist_count || 0) > 0 && (
                                                            <span>{event.waitlist_count} waitlist</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-stone-600 font-medium">No upcoming events</p>
                                    {canManageMembers && (
                                        <p className="text-stone-500 text-sm mt-1">
                                            Create an event to get your group together!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <aside className="lg:flex-[1.2] space-y-4">
                        {/* Join/Status Card */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-5">
                            {!user ? (
                                <button
                                    onClick={() => router.push('/login')}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                                >
                                    Log in to join
                                </button>
                            ) : membership ? (
                                membership.status === 'pending' ? (
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-stone-800">Request Pending</p>
                                        <p className="text-sm text-stone-500 mt-1">Waiting for organiser approval</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-stone-800">
                                            {membership.role === 'organiser' ? 'Organiser' : membership.role === 'host' ? 'Host' : 'Member'}
                                        </p>
                                        <p className="text-sm text-stone-500 mt-1">You're part of this group</p>
                                    </div>
                                )
                            ) : (
                                <button
                                    onClick={handleJoinGroup}
                                    disabled={joining}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {joining ? 'Joining...' : group.join_policy === 'auto' ? 'Join Group' : 'Request to Join'}
                                </button>
                            )}
                        </div>

                        {/* Organiser Card */}
                        {organiser && (
                            <div className="bg-white rounded-2xl border border-stone-200 p-5">
                                <h3 className="font-display font-semibold text-stone-800 mb-3">Organiser</h3>
                                <div className="flex items-center gap-3">
                                    {organiser.avatar_url ? (
                                        <img
                                            src={organiser.avatar_url}
                                            alt={organiser.name}
                                            className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-100"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ring-2 ring-amber-100">
                                            <span className="text-lg font-medium text-amber-600">
                                                {organiser.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-stone-800">{organiser.name}</p>
                                        <p className="text-sm text-stone-500">Group organiser</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Members Preview Card */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-display font-semibold text-stone-800">
                                    Members
                                    <span className="ml-2 text-stone-400 font-normal">{group.member_count}</span>
                                </h3>
                                <Link
                                    href={`/groups/${group.id}/members`}
                                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                >
                                    See all
                                </Link>
                            </div>
                            {allMembers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {allMembers.slice(0, 12).map(member => (
                                        member.avatar_url ? (
                                            <img
                                                key={member.id}
                                                src={member.avatar_url}
                                                alt={member.name}
                                                title={member.name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                key={member.id}
                                                title={member.name}
                                                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center"
                                            >
                                                <span className="text-sm font-medium text-amber-600">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )
                                    ))}
                                    {group.member_count > 12 && (
                                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                                            <span className="text-xs font-medium text-stone-500">
                                                +{group.member_count - 12}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-stone-500">No members yet</p>
                            )}
                        </div>

                        {/* Share Card */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-5">
                            <h3 className="font-display font-semibold text-stone-800 mb-3">Share</h3>
                            <button
                                onClick={handleCopyLink}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 transition text-stone-700"
                            >
                                {copied ? (
                                    <>
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Link copied!
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy link
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Leave group - tucked away at bottom */}
                        {membership?.status === 'active' && membership?.role !== 'organiser' && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={() => setShowLeaveModal(true)}
                                    className="text-xs text-stone-400 hover:text-stone-600 transition"
                                >
                                    Leave group
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            {/* Leave Group Confirmation Modal */}
            {showLeaveModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowLeaveModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-stone-900 font-display mb-2">
                            Leave {group?.name}?
                        </h3>
                        <p className="text-sm text-stone-600 mb-6">
                            You'll lose access to events and discussions. You can rejoin later if the group allows it.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLeaveModal(false)}
                                className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLeaveGroup}
                                disabled={leaving}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium disabled:opacity-50"
                            >
                                {leaving ? 'Leaving...' : 'Leave'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
