'use client';

/*
=======================================================================================================================================
Group Members Page
=======================================================================================================================================
Dedicated page for viewing all active members of a group with search and "load more" pagination.
=======================================================================================================================================
*/

import Link from 'next/link';
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
import Header from '@/components/layout/Header';

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
    // Fetch members when filters change
    // =======================================================================
    useEffect(() => {
        if (group) {
            fetchMembers();
        }
    }, [group, fetchMembers]);

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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-600 mt-4">Loading...</p>
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
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-stone-600 mb-4">{error || 'Group not found'}</p>
                    <Link
                        href="/groups"
                        className="text-amber-600 hover:text-amber-700 font-medium"
                    >
                        Back to groups
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Members page view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            {/* Page Header */}
            <div className="bg-white border-b border-stone-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
                    <Link
                        href={`/groups/${group.id}`}
                        className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-3 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to {group.name}
                    </Link>

                    <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-display">
                        Members
                    </h1>
                    <p className="text-stone-500 mt-1">
                        {totalCount} member{totalCount !== 1 ? 's' : ''}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white border-b border-stone-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="flex-1 relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
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
                                className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition font-medium"
                        >
                            Search
                        </button>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition"
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
                        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-stone-600 mt-4">Loading members...</p>
                    </div>
                ) : members.length > 0 ? (
                    <>
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                            {members.map(member => (
                                <div key={member.id} className="p-4 hover:bg-stone-50 transition">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <button
                                            onClick={() => setSelectedMember(member)}
                                            className="flex-shrink-0 hover:opacity-80 transition"
                                        >
                                            {member.avatar_url ? (
                                                <img
                                                    src={member.avatar_url}
                                                    alt={member.name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
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
                                                    className="font-medium text-stone-900 hover:text-amber-600 transition text-left truncate"
                                                >
                                                    {member.name}
                                                </button>
                                                {member.role === 'organiser' && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                                        Organiser
                                                    </span>
                                                )}
                                                {member.role === 'host' && (
                                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                                        Host
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-stone-500 mt-0.5">
                                                Joined {formatJoinedDate(member.joined_at)}
                                            </p>
                                        </div>

                                        {/* Actions - only for organisers, not for themselves or other organisers */}
                                        {isOrganiser && member.user_id !== user?.id && member.role !== 'organiser' && (
                                            <div className="flex items-center gap-1">
                                                {/* Role toggle */}
                                                {member.role === 'member' ? (
                                                    <button
                                                        onClick={() => handleAssignRole(member, 'host')}
                                                        disabled={updatingRole === member.id}
                                                        className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
                                                    >
                                                        {updatingRole === member.id ? '...' : 'Give Host Role'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAssignRole(member, 'member')}
                                                        disabled={updatingRole === member.id}
                                                        className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition disabled:opacity-50"
                                                    >
                                                        {updatingRole === member.id ? '...' : 'Remove Host Role'}
                                                    </button>
                                                )}
                                                {/* Remove button */}
                                                <button
                                                    onClick={() => setMemberToRemove(member)}
                                                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    Remove
                                                </button>
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
                                    className="px-6 py-3 bg-white border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {loadingMore ? 'Loading...' : `Load more (${members.length} of ${totalCount})`}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                        <div className="text-4xl mb-3">👥</div>
                        <p className="text-stone-500">
                            {searchQuery
                                ? `No members found matching "${searchQuery}"`
                                : 'No members yet.'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
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
                            <img
                                src={selectedMember.avatar_url}
                                alt={selectedMember.name}
                                className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl object-cover shadow-2xl"
                            />
                        ) : (
                            <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center shadow-2xl">
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
                        <h3 className="text-lg font-bold text-stone-900 font-display mb-2">
                            Remove {memberToRemove.name}?
                        </h3>
                        <p className="text-sm text-stone-600 mb-6">
                            They will lose access to this group and its events. They can request to rejoin later.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMemberToRemove(null)}
                                disabled={removing}
                                className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition font-medium disabled:opacity-50"
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
        </main>
    );
}
