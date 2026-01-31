'use client';

/*
=======================================================================================================================================
Group Members Page
=======================================================================================================================================
Dedicated page for viewing all active members of a group with search and "load more" pagination.
=======================================================================================================================================
*/

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getGroup,
    getGroupMembers,
    removeMember,
    assignRole,
    GroupWithCount,
    GroupMembership,
    GroupMember,
} from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';

// Number of members to load per batch
const PAGE_SIZE = 20;

export default function GroupMembersPage() {
    const { user, token } = useAuth();
    const params = useParams();

    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [membership, setMembership] = useState<GroupMembership | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Remove member state
    const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
    const [removing, setRemoving] = useState(false);

    // Role assignment state
    const [updatingRole, setUpdatingRole] = useState<number | null>(null);

    // Profile modal state
    const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

    // Action menu state (for kebab menu)
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    // Check if current user is the organiser
    const isOrganiser = membership?.status === 'active' && membership?.role === 'organiser';

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
    // Fetch members (resets list)
    // =======================================================================
    const fetchMembers = useCallback(async () => {
        if (!params.id) return;

        setLoading(true);
        const result = await getGroupMembers(Number(params.id), token || undefined, {
            status: 'active',
            search: searchQuery || undefined,
            limit: PAGE_SIZE,
            offset: 0,
        });

        if (result.success && result.data) {
            setMembers(result.data.members);
            setTotalCount(result.data.total_count);
            setHasMore(result.data.has_more);
        }
        setLoading(false);
    }, [params.id, token, searchQuery]);

    // =======================================================================
    // Load more members (appends to list)
    // =======================================================================
    const loadMore = async () => {
        if (!params.id || loadingMore || !hasMore) return;

        setLoadingMore(true);
        const result = await getGroupMembers(Number(params.id), token || undefined, {
            status: 'active',
            search: searchQuery || undefined,
            limit: PAGE_SIZE,
            offset: members.length,
        });

        if (result.success && result.data) {
            setMembers(prev => [...prev, ...result.data!.members]);
            setHasMore(result.data.has_more);
        }
        setLoadingMore(false);
    };

    // =======================================================================
    // Fetch members when filters change (only for active members)
    // =======================================================================
    useEffect(() => {
        if (group && membership?.status === 'active') {
            fetchMembers();
        }
    }, [group, membership?.status, fetchMembers]);

    // =======================================================================
    // Handle search submit
    // =======================================================================
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
    };

    // =======================================================================
    // Handle search clear
    // =======================================================================
    const handleClearSearch = () => {
        setSearchInput('');
        setSearchQuery('');
    };

    // =======================================================================
    // Handle remove member
    // =======================================================================
    const handleRemoveMember = async () => {
        if (!token || !group || !memberToRemove) return;

        setRemoving(true);
        const result = await removeMember(token, group.id, memberToRemove.id);
        setRemoving(false);

        if (result.success) {
            // Remove from list and update count
            setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
            setTotalCount(prev => prev - 1);
            setMemberToRemove(null);
        } else {
            alert(result.error || 'Failed to remove member');
        }
    };

    // =======================================================================
    // Handle role assignment
    // =======================================================================
    const handleAssignRole = async (member: GroupMember, newRole: 'host' | 'member') => {
        if (!token || !group) return;

        setUpdatingRole(member.id);
        const result = await assignRole(token, group.id, member.id, newRole);
        setUpdatingRole(null);

        if (result.success) {
            // Update the member's role in the list
            setMembers(prev => prev.map(m =>
                m.id === member.id ? { ...m, role: newRole } : m
            ));
        } else {
            alert(result.error || 'Failed to update role');
        }
    };

    // =======================================================================
    // Format joined date
    // =======================================================================
    const formatJoinedDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading && !group) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-4">Loading...</p>
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
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-slate-600 mb-4">{error || 'Group not found'}</p>
                    <Link
                        href="/groups"
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Back to groups
                    </Link>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Non-member state - users must be members to view the member list
    // =======================================================================
    if (membership?.status !== 'active') {
        return (
            <SidebarLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">Members Only</h2>
                    <p className="text-slate-600 mb-6 text-center max-w-sm">
                        Join the group to see who else is a member.
                    </p>
                    <Link
                        href={`/groups/${group.id}`}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-600 hover:to-violet-700 transition font-medium"
                    >
                        Back to group
                    </Link>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Members page view
    // =======================================================================
    return (
        <SidebarLayout>

            {/* Page Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
                    <Link
                        href={`/groups/${group.id}`}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-3 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to {group.name}
                    </Link>

                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                        Members
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {totalCount} member{totalCount !== 1 ? 's' : ''}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="flex-1 relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search members..."
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-600 hover:to-violet-700 transition font-medium"
                        >
                            Search
                        </button>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                            >
                                Clear
                            </button>
                        )}
                    </form>
                </div>
            </div>

            {/* Members List */}
            <div className="flex-1 px-4 sm:px-8 py-6 max-w-3xl mx-auto w-full">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-600 mt-4">Loading members...</p>
                    </div>
                ) : members.length > 0 ? (
                    <>
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                            {members.map(member => (
                                <div key={member.id} className="p-4 hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <button
                                            onClick={() => setSelectedMember(member)}
                                            className="flex-shrink-0 hover:opacity-80 transition"
                                        >
                                            {member.avatar_url ? (
                                                <div className="relative w-12 h-12">
                                                    <Image
                                                        src={member.avatar_url}
                                                        alt={member.name}
                                                        fill
                                                        className="rounded-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-200 to-violet-300 flex items-center justify-center">
                                                    <span className="text-lg font-bold text-white">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </button>

                                        {/* Name and info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedMember(member)}
                                                    className="font-medium text-slate-900 hover:text-indigo-600 transition text-left truncate"
                                                >
                                                    {member.name}
                                                </button>
                                                {member.role === 'organiser' && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                                        Admin
                                                    </span>
                                                )}
                                                {member.role === 'host' && !group?.all_members_host && (
                                                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                                                        Host
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                Joined {formatJoinedDate(member.joined_at)}
                                            </p>
                                        </div>

                                        {/* Actions - only for organisers, not for themselves or other organisers */}
                                        {isOrganiser && member.user_id !== user?.id && member.role !== 'organiser' && (
                                            <div className="relative flex-shrink-0">
                                                {/* Kebab menu button */}
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                                    aria-label="Member actions"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="5" r="2" />
                                                        <circle cx="12" cy="12" r="2" />
                                                        <circle cx="12" cy="19" r="2" />
                                                    </svg>
                                                </button>

                                                {/* Dropdown menu */}
                                                {openMenuId === member.id && (
                                                    <>
                                                        {/* Backdrop to close menu */}
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenuId(null)}
                                                        />
                                                        {/* Menu */}
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                                                            {/* Role toggle */}
                                                            {member.role === 'member' ? (
                                                                <button
                                                                    onClick={() => {
                                                                        handleAssignRole(member, 'host');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    disabled={updatingRole === member.id}
                                                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 flex items-center gap-3"
                                                                >
                                                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                                    </svg>
                                                                    {updatingRole === member.id ? 'Updating...' : 'Give Host Role'}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        handleAssignRole(member, 'member');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    disabled={updatingRole === member.id}
                                                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 flex items-center gap-3"
                                                                >
                                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                                                                    </svg>
                                                                    {updatingRole === member.id ? 'Updating...' : 'Remove Host Role'}
                                                                </button>
                                                            )}
                                                            {/* Remove member */}
                                                            <button
                                                                onClick={() => {
                                                                    setMemberToRemove(member);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-3"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Remove from Group
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {loadingMore ? 'Loading...' : `Load more (${members.length} of ${totalCount})`}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="text-4xl mb-3">👥</div>
                        <p className="text-slate-500">
                            {searchQuery
                                ? `No members found matching "${searchQuery}"`
                                : 'No members yet.'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            {selectedMember && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedMember(null)}
                >
                    <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedMember(null)}
                            className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition"
                            aria-label="Close"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {selectedMember.avatar_url ? (
                            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
                                <Image
                                    src={selectedMember.avatar_url}
                                    alt={selectedMember.name}
                                    fill
                                    className="rounded-2xl object-cover shadow-2xl"
                                />
                            </div>
                        ) : (
                            <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl bg-gradient-to-br from-indigo-200 to-violet-300 flex items-center justify-center shadow-2xl">
                                <span className="text-8xl font-bold text-white">
                                    {selectedMember.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}

                        <p className="text-center mt-4 text-xl font-medium text-white">
                            {selectedMember.name}
                        </p>
                    </div>
                </div>
            )}

            {/* Remove Member Confirmation Dialog */}
            {memberToRemove && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setMemberToRemove(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                            Remove {memberToRemove.name}?
                        </h3>
                        <p className="text-sm text-slate-600 mb-6">
                            They will lose access to this group and its events. They can request to rejoin later.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMemberToRemove(null)}
                                disabled={removing}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemoveMember}
                                disabled={removing}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium disabled:opacity-50"
                            >
                                {removing ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SidebarLayout>
    );
}
