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
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
    contactOrganiser,
    broadcastMessage,
    GroupWithCount,
    GroupMembership,
    GroupMember,
} from '@/lib/api/groups';
import { getAllEvents, EventWithDetails } from '@/lib/api/events';

import SidebarLayout from '@/components/layout/SidebarLayout';
import EventCard from '@/components/ui/EventCard';
import { getGroupTheme, getGroupInitials } from '@/lib/groupThemes';

// Number of pending members to show before "View all" link
const PENDING_PREVIEW_LIMIT = 3;

export default function GroupDetailPage() {
    const { user, token } = useAuth();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteCode = searchParams.get('code') || undefined;
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
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [contactLoading, setContactLoading] = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [broadcastLoading, setBroadcastLoading] = useState(false);

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
    // Fetch pending members (for organisers only)
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

            const result = await getGroup(Number(params.id), token || undefined, inviteCode);
            if (result.success && result.data) {
                setGroup(result.data.group);
                setMembership(result.data.membership);
            } else {
                setError(result.error || 'Group not found');
            }
            setLoading(false);
        }
        fetchGroup();
    }, [params.id, token, inviteCode]);

    // =======================================================================
    // Fetch pending members when user is organiser
    // =======================================================================
    useEffect(() => {
        if (isOrganiser) {
            fetchPendingMembers();
        }
    }, [isOrganiser, fetchPendingMembers]);

    // =======================================================================
    // Fetch all members for sidebar preview (only for active members)
    // =======================================================================
    useEffect(() => {
        if (membership?.status === 'active') {
            fetchAllMembers();
        }
    }, [membership?.status, fetchAllMembers]);

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
        const result = await joinGroup(token, group.id, inviteCode);
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
        const url = `${window.location.origin}/groups/${group?.id}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // =======================================================================
    // Handle contact organiser
    // =======================================================================
    const handleContactOrganiser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !group || !contactMessage.trim()) return;

        setContactLoading(true);
        const result = await contactOrganiser(token, group.id, contactMessage.trim());
        setContactLoading(false);

        if (result.success) {
            setContactMessage('');
            setShowContactModal(false);
        }
    };

    // Check if user can contact organiser (active member who is not the organiser)
    const canContactOrganiser = membership?.status === 'active' && membership?.role !== 'organiser';

    // =======================================================================
    // Handle broadcast message (organiser only)
    // =======================================================================
    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !group || !broadcastMsg.trim()) return;

        setBroadcastLoading(true);
        const result = await broadcastMessage(token, group.id, broadcastMsg.trim());
        setBroadcastLoading(false);

        if (result.success) {
            setBroadcastMsg('');
            setShowBroadcastModal(false);
        } else {
            alert(result.error || 'Failed to send broadcast');
        }
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !group) {
        return (
            <SidebarLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-slate-600 mb-4">{error || 'Group not found'}</p>
                    <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
                        Back to dashboard
                    </Link>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Group detail view
    // =======================================================================
    return (
        <SidebarLayout>

            {/* Hero Section */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        {/* Group Theme Gradient with Initials */}
                        {(() => {
                            const theme = getGroupTheme(group.theme_color);
                            return (
                                <div className={`w-full lg:w-96 h-48 sm:h-56 lg:h-64 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                    <span className="text-6xl sm:text-7xl text-white/80 font-display font-bold">
                                        {getGroupInitials(group.name)}
                                    </span>
                                </div>
                            );
                        })()}

                        {/* Group Info */}
                        <div className="flex-1 flex flex-col justify-center">
                            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
                                {group.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600 mb-4">
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    {group.visibility === 'unlisted' ? (
                                        <>
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            Invite only
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {group.join_policy === 'auto' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                )}
                                            </svg>
                                            {group.join_policy === 'auto' ? 'Open to all' : 'Approval required'}
                                        </>
                                    )}
                                </span>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap items-center gap-3">
                                {isOrganiser && (
                                    <>
                                        <Link
                                            href={`/groups/${group.id}/edit`}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Edit Group
                                        </Link>
                                        <button
                                            onClick={() => setShowBroadcastModal(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                            </svg>
                                            Broadcast
                                        </button>
                                    </>
                                )}
                                {canManageMembers && (
                                    <Link
                                        href={`/groups/${group.id}/events/create`}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition shadow-sm"
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
                        {/* Pending Members Alert - Only visible to organisers */}
                        {isOrganiser && pendingMembers.length > 0 && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-display text-lg font-semibold text-slate-800 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Pending Requests
                                        <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-sm rounded-full">
                                            {pendingMembers.length}
                                        </span>
                                    </h2>
                                    {pendingMembers.length > PENDING_PREVIEW_LIMIT && (
                                        <Link
                                            href={`/groups/${group.id}/members?tab=pending`}
                                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            View all
                                        </Link>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {pendingMembers.slice(0, PENDING_PREVIEW_LIMIT).map(member => (
                                        <div key={member.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                                            {member.avatar_url ? (
                                                <div className="relative w-10 h-10">
                                                    <Image
                                                        src={member.avatar_url}
                                                        alt={member.name}
                                                        fill
                                                        className="rounded-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-indigo-600">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 truncate">{member.name}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApproveMember(member.id)}
                                                    disabled={processingMember === member.id}
                                                    className="px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectMember(member.id)}
                                                    disabled={processingMember === member.id}
                                                    className="px-4 py-2.5 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition disabled:opacity-50"
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
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                                <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">About</h2>
                                <div
                                    className="prose prose-slate prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                                />
                            </div>
                        )}

                        {/* Upcoming Events Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-display text-xl font-bold text-slate-800">
                                    Upcoming Events
                                    {events.length > 0 && (
                                        <span className="ml-2 text-slate-400 font-normal text-lg">{events.length}</span>
                                    )}
                                </h2>
                                {events.length > 0 && (
                                    <Link
                                        href={`/groups/${group.id}/events`}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                    >
                                        See all
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                )}
                            </div>

                            {events.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {events.map(event => (
                                        <EventCard key={event.id} event={event} from={`group-${params.id}`} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-600 font-medium">No upcoming events</p>
                                    {canManageMembers && (
                                        <p className="text-slate-500 text-sm mt-1">
                                            Create an event to get your group together!
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Past events link */}
                            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                                <Link
                                    href={`/groups/${group.id}/past-events`}
                                    className="text-sm text-slate-400 hover:text-slate-600 transition"
                                >
                                    View past events
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <aside className="lg:flex-[1.2] space-y-4">
                        {/* Join/Status Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            {!user ? (
                                <button
                                    onClick={() => router.push('/login')}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm"
                                >
                                    Log in to join
                                </button>
                            ) : membership ? (
                                membership.status === 'pending' ? (
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-slate-800">Request Pending</p>
                                        <p className="text-sm text-slate-500 mt-1">Waiting for organiser approval</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-slate-800">
                                            {membership.role === 'organiser' ? 'Organiser' : membership.role === 'host' ? 'Host' : 'Member'}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-1">You're part of this group</p>
                                    </div>
                                )
                            ) : (
                                <button
                                    onClick={handleJoinGroup}
                                    disabled={joining}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {joining ? 'Joining...' : group.join_policy === 'auto' ? 'Join Group' : 'Request to Join'}
                                </button>
                            )}
                        </div>

                        {/* Organiser Card */}
                        {organiser && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                <h3 className="font-display font-semibold text-slate-800 mb-3">Organiser</h3>
                                <div className="flex items-center gap-3">
                                    {organiser.avatar_url ? (
                                        <div className="relative w-12 h-12">
                                            <Image
                                                src={organiser.avatar_url}
                                                alt={organiser.name}
                                                fill
                                                className="rounded-full object-cover ring-2 ring-indigo-100"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center ring-2 ring-indigo-100">
                                            <span className="text-lg font-medium text-indigo-600">
                                                {organiser.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800">{organiser.name}</p>
                                        <p className="text-sm text-slate-500">Group organiser</p>
                                    </div>
                                </div>
                                {canContactOrganiser && (
                                    <button
                                        onClick={() => setShowContactModal(true)}
                                        className="w-full mt-4 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Contact
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Members Preview Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-display font-semibold text-slate-800">
                                    Members
                                    <span className="ml-2 text-slate-400 font-normal">{group.member_count}</span>
                                </h3>
                                {membership?.status === 'active' && (
                                    <Link
                                        href={`/groups/${group.id}/members`}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        See all
                                    </Link>
                                )}
                            </div>
                            {membership?.status === 'active' ? (
                                allMembers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {allMembers.slice(0, 12).map(member => (
                                            member.avatar_url ? (
                                                <div key={member.id} className="relative w-10 h-10" title={member.name}>
                                                    <Image
                                                        src={member.avatar_url}
                                                        alt={member.name}
                                                        fill
                                                        className="rounded-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    key={member.id}
                                                    title={member.name}
                                                    className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center"
                                                >
                                                    <span className="text-sm font-medium text-indigo-600">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )
                                        ))}
                                        {group.member_count > 12 && (
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <span className="text-xs font-medium text-slate-500">
                                                    +{group.member_count - 12}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">No members yet</p>
                                )
                            ) : (
                                <p className="text-sm text-slate-500">Join the group to see members</p>
                            )}
                        </div>

                        {/* Share/Invite Card - Hidden for unlisted groups unless organiser */}
                        {(group.visibility !== 'unlisted' || isOrganiser) && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                <h3 className="font-display font-semibold text-slate-800 mb-3">
                                    {group.visibility === 'unlisted' ? 'Invite People' : 'Share'}
                                </h3>
                                {group.visibility === 'unlisted' && (
                                    <p className="text-sm text-slate-500 mb-3">
                                        Share this link to invite people to your group.
                                    </p>
                                )}
                                <button
                                    onClick={handleCopyLink}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-700"
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
                        )}

                        {/* Leave group - tucked away at bottom */}
                        {membership?.status === 'active' && membership?.role !== 'organiser' && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={() => setShowLeaveModal(true)}
                                    className="text-xs text-slate-400 hover:text-slate-700 transition"
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
                        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                            Leave {group?.name}?
                        </h3>
                        <p className="text-sm text-slate-600 mb-6">
                            You'll lose access to events and discussions. You can rejoin later if the group allows it.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLeaveModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium"
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

            {/* Contact Organiser Modal */}
            {showContactModal && organiser && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => !contactLoading && setShowContactModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 font-display">
                                Contact {organiser.name}
                            </h3>
                            <button
                                onClick={() => setShowContactModal(false)}
                                disabled={contactLoading}
                                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleContactOrganiser} className="p-6 space-y-5">
                                <p className="text-sm text-slate-600">
                                    Send a message to the group organiser. They will receive it via email and can reply directly to you.
                                </p>

                                {/* Show sender's email so they know it will be shared */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Your email
                                    </label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        Your email will be shared so they can reply
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="contactMessage" className="block text-sm font-medium text-slate-700">
                                            Your message
                                        </label>
                                        <span className={`text-xs ${contactMessage.length > 900 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {contactMessage.length}/1000
                                        </span>
                                    </div>
                                    <textarea
                                        id="contactMessage"
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        placeholder="Hi, I have a question about..."
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
                                        onClick={() => setShowContactModal(false)}
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
                    </div>
                </div>
            )}

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => !broadcastLoading && setShowBroadcastModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 font-display">
                                Broadcast to Members
                            </h3>
                            <button
                                onClick={() => setShowBroadcastModal(false)}
                                disabled={broadcastLoading}
                                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleBroadcast} className="p-6 space-y-5">
                            <p className="text-sm text-slate-600">
                                Send a message to all group members. Members who have disabled broadcasts will not receive this message.
                            </p>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="broadcastMessage" className="block text-sm font-medium text-slate-700">
                                        Your message
                                    </label>
                                    <span className={`text-xs ${broadcastMsg.length > 1800 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {broadcastMsg.length}/2000
                                    </span>
                                </div>
                                <textarea
                                    id="broadcastMessage"
                                    value={broadcastMsg}
                                    onChange={(e) => setBroadcastMsg(e.target.value)}
                                    placeholder="Hello everyone..."
                                    rows={6}
                                    maxLength={2000}
                                    minLength={10}
                                    required
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition text-base"
                                />
                                <p className="text-xs text-slate-400 mt-2">Minimum 10 characters</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBroadcastModal(false)}
                                    disabled={broadcastLoading}
                                    className="flex-1 px-5 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={broadcastLoading || broadcastMsg.trim().length < 10}
                                    className="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                >
                                    {broadcastLoading ? 'Sending...' : 'Send Broadcast'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </SidebarLayout>
    );
}
