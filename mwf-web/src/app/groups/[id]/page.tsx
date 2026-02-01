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
import InviteLinkSection from '@/components/ui/InviteLinkSection';
import { getGroupTheme, getGroupInitials } from '@/lib/groupThemes';
import AppDownloadBanner from '@/components/ui/AppDownloadBanner';

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
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [contactLoading, setContactLoading] = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastMessageText, setBroadcastMessageText] = useState('');
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [showProfileImageModal, setShowProfileImageModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // =======================================================================
    // Constants
    // =======================================================================
    const DESCRIPTION_CHAR_LIMIT = 200;

    // =======================================================================
    // Check if user can manage members (organiser or host)
    // =======================================================================
    const canManageMembers = membership?.status === 'active' &&
        (membership?.role === 'organiser' || membership?.role === 'host');

    // Check if user is the organiser (can edit group settings)
    const isOrganiser = membership?.status === 'active' && membership?.role === 'organiser';

    // Sanitize HTML description for safe rendering (links open in new tab)
    const sanitizedDescription = useMemo(() => {
        if (!group?.description) return '';
        if (typeof window === 'undefined') return group.description;
        // Add hook to make all links open in new tab
        DOMPurify.addHook('afterSanitizeAttributes', (node) => {
            if (node.tagName === 'A') {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });
        const result = DOMPurify.sanitize(group.description);
        DOMPurify.removeHook('afterSanitizeAttributes');
        return result;
    }, [group?.description]);

    // Strip HTML tags for plain text display and character counting
    const plainTextDescription = useMemo(() => {
        if (!group?.description) return '';
        return group.description
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }, [group?.description]);

    const isLongDescription = plainTextDescription.length > DESCRIPTION_CHAR_LIMIT;

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
    // Fetch all members for sidebar preview
    // =======================================================================
    useEffect(() => {
        if (group) {
            fetchAllMembers();
        }
    }, [group, fetchAllMembers]);

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
            // Check if profile image is required
            if (result.return_code === 'PROFILE_IMAGE_REQUIRED') {
                setShowProfileImageModal(true);
            } else {
                alert(result.error || 'Failed to join group');
            }
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
            router.push('/your-events');
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
    // Handle broadcast message
    // =======================================================================
    const [broadcastSuccess, setBroadcastSuccess] = useState(false);

    const handleBroadcastMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !group || !broadcastMessageText.trim()) return;

        setBroadcastLoading(true);
        const result = await broadcastMessage(token, group.id, broadcastMessageText.trim());
        setBroadcastLoading(false);

        if (result.success) {
            setBroadcastMessageText('');
            setBroadcastSuccess(true);
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
                    <Link href="/your-events" className="text-indigo-600 hover:text-indigo-700">
                        Back to your events
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

            <AppDownloadBanner />

            {/* Main Content */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Left Column - Content */}
                    <div className="flex-1 lg:flex-[3] space-y-6">
                        {/* Members & Events */}
                        <div className="grid grid-cols-2 gap-4">
                            <Link
                                href={`/groups/${group.id}/members`}
                                className="group bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">{group.member_count}</p>
                                        <p className="text-sm sm:text-base font-semibold text-slate-600 mt-0.5">Members</p>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href={`/groups/${group.id}/events`}
                                className="group bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">{events.length}</p>
                                        <p className="text-sm sm:text-base font-semibold text-slate-600 mt-0.5">Events</p>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        </div>

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
                                        <div key={member.id} className="bg-white rounded-xl p-3">
                                            <div className="flex items-center gap-3">
                                                {member.avatar_url ? (
                                                    <div className="relative w-10 h-10 flex-shrink-0">
                                                        <Image
                                                            src={member.avatar_url}
                                                            alt={member.name}
                                                            fill
                                                            className="rounded-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-indigo-600">
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-800">{member.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3 ml-[52px]">
                                                <button
                                                    onClick={() => handleApproveMember(member.id)}
                                                    disabled={processingMember === member.id}
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectMember(member.id)}
                                                    disabled={processingMember === member.id}
                                                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition disabled:opacity-50"
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
                                {isDescriptionExpanded || !isLongDescription ? (
                                    <div
                                        className="prose prose-slate prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                                    />
                                ) : (
                                    <div className="relative">
                                        <div
                                            className="prose prose-slate prose-sm max-w-none max-h-20 overflow-hidden"
                                            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                                    </div>
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

                    </div>

                    {/* Right Column - Sidebar */}
                    <aside className="lg:flex-[1.2]">
                        <div className="bg-white rounded-2xl border border-slate-200">
                            {/* Join/Status */}
                            <div className="p-5">
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
                                            <p className="text-sm text-slate-500 mt-1">Waiting for admin approval</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <p className="font-semibold text-slate-800">
                                                {membership.role === 'organiser' ? 'Admin' : (membership.role === 'host' && group.all_members_host) ? 'Member' : membership.role === 'host' ? 'Host' : 'Member'}
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

                            {/* Action links */}
                            {(canManageMembers || canContactOrganiser) && (
                                <div className="border-t border-slate-100 px-5 py-4 space-y-1">
                                    {canManageMembers && token && (
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition text-left"
                                        >
                                            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            <span className="text-sm font-medium text-slate-700">Invite People</span>
                                        </button>
                                    )}
                                    {canContactOrganiser && (
                                        <button
                                            onClick={() => setShowContactModal(true)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition text-left"
                                        >
                                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-medium text-slate-700">Contact Admin</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Footer links */}
                            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
                                <Link
                                    href={`/groups/${group.id}/past-events`}
                                    className="text-sm text-slate-400 hover:text-indigo-600 transition"
                                >
                                    Past events
                                </Link>
                                {membership?.status === 'active' && membership?.role !== 'organiser' && (
                                    <button
                                        onClick={() => setShowLeaveModal(true)}
                                        className="text-sm text-slate-400 hover:text-slate-600 transition"
                                    >
                                        Leave group
                                    </button>
                                )}
                            </div>
                        </div>
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
                                    Send a message to the group admin. They will receive it via email and can reply directly to you.
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
                    onClick={() => {
                        if (!broadcastLoading) {
                            setShowBroadcastModal(false);
                            setBroadcastSuccess(false);
                        }
                    }}
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
                                onClick={() => {
                                    setShowBroadcastModal(false);
                                    setBroadcastSuccess(false);
                                }}
                                disabled={broadcastLoading}
                                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {broadcastSuccess ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-slate-900">Message Sent</h4>
                            </div>
                        ) : (
                            <form onSubmit={handleBroadcastMessage} className="p-6 space-y-5">
                                <p className="text-sm text-slate-600">
                                    Send a message to all group members who have broadcasts enabled.
                                </p>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="broadcastMessage" className="block text-sm font-medium text-slate-700">
                                            Your message
                                        </label>
                                        <span className={`text-xs ${broadcastMessageText.length > 1800 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {broadcastMessageText.length}/2000
                                        </span>
                                    </div>
                                    <textarea
                                        id="broadcastMessage"
                                        value={broadcastMessageText}
                                        onChange={(e) => setBroadcastMessageText(e.target.value)}
                                        placeholder="Hi everyone, I wanted to let you know..."
                                        rows={6}
                                        maxLength={2000}
                                        minLength={10}
                                        required
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition text-base"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Minimum 10 characters. URLs will be clickable in the email.</p>
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
                                        disabled={broadcastLoading || broadcastMessageText.trim().length < 10}
                                        className="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                    >
                                        {broadcastLoading ? 'Sending...' : 'Send Broadcast'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Profile Image Required Modal */}
            {showProfileImageModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowProfileImageModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                                Profile Image Required
                            </h3>
                            <p className="text-slate-600 text-center mb-6">
                                This group requires members to have a profile photo. Please add one to your profile before joining.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowProfileImageModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <Link
                                    href="/profile"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition text-center"
                                >
                                    Go to Profile
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite People Modal */}
            {showInviteModal && canManageMembers && token && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowInviteModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 font-display">Invite People</h3>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <InviteLinkSection type="group" id={group.id} token={token} bare />
                        </div>
                    </div>
                </div>
            )}

        </SidebarLayout>
    );
}
