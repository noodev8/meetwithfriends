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
    // Loading state
    // =======================================================================
    if (loading && !group) {
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
    // Members page view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Page Header */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
                    {/* Breadcrumb */}
                    <div className="mb-4">
                        <Link
                            href={`/groups/${group.id}`}
                            className="text-blue-600 hover:text-blue-700"
                        >
                            &larr; Back to {group.name}
                        </Link>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Members
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {totalCount} member{totalCount !== 1 ? 's' : ''}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by name..."
                            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Search
                        </button>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                Clear
                            </button>
                        )}
                    </form>
                </div>
            </div>

            {/* Members List */}
            <div className="flex-1 px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full">
                {loading ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600">Loading members...</p>
                    </div>
                ) : members.length > 0 ? (
                    <>
                        <div className="bg-white rounded-lg border divide-y">
                            {members.map(member => (
                                <div key={member.id} className="p-4 flex items-center gap-4">
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

                                    {/* Name and info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                        <p className="text-sm text-gray-500">
                                            <span className="capitalize">{member.role}</span>
                                            <span className="mx-2">·</span>
                                            Joined {new Date(member.joined_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Remove button - only for organisers, not for themselves */}
                                    {isOrganiser && member.user_id !== user?.id && (
                                        <button
                                            onClick={() => setMemberToRemove(member)}
                                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-3 bg-white border rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingMore ? 'Loading...' : `Load more (${members.length} of ${totalCount})`}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-white rounded-lg border p-8 text-center">
                        <p className="text-gray-600">
                            {searchQuery
                                ? `No members found matching "${searchQuery}"`
                                : 'No members yet.'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                className="mt-4 text-blue-600 hover:text-blue-700"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Remove Member Confirmation Dialog */}
            {memberToRemove && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Remove Member
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to remove <strong>{memberToRemove.name}</strong> from this group?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setMemberToRemove(null)}
                                disabled={removing}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemoveMember}
                                disabled={removing}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
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
