'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { EventHost } from '@/types';
import { addHost, removeHost } from '@/lib/api/events';
import { getGroupMembers, GroupMember } from '@/lib/api/groups';

interface ManageHostsModalProps {
    eventId: number;
    groupId: number;
    hosts: EventHost[];
    onClose: () => void;
    onHostsChanged: (hosts: EventHost[]) => void;
}

export default function ManageHostsModal({
    eventId,
    groupId,
    hosts,
    onClose,
    onHostsChanged,
}: ManageHostsModalProps) {
    const { token } = useAuth();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GroupMember[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [searchOffset, setSearchOffset] = useState(0);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Action loading states
    const [addingUserId, setAddingUserId] = useState<number | null>(null);
    const [removingUserId, setRemovingUserId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const PAGE_SIZE = 20;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setSearching(true);
        setErrorMessage(null);
        const result = await getGroupMembers(groupId, token, {
            search: searchQuery || undefined,
            limit: PAGE_SIZE,
            offset: 0,
        });
        setSearching(false);
        setHasSearched(true);

        if (result.success && result.data) {
            setSearchResults(result.data.members);
            setHasMore(result.data.has_more);
            setSearchOffset(PAGE_SIZE);
        }
    };

    const handleLoadMore = async () => {
        if (!token) return;

        setSearching(true);
        const result = await getGroupMembers(groupId, token, {
            search: searchQuery || undefined,
            limit: PAGE_SIZE,
            offset: searchOffset,
        });
        setSearching(false);

        if (result.success && result.data) {
            setSearchResults(prev => [...prev, ...result.data!.members]);
            setHasMore(result.data.has_more);
            setSearchOffset(prev => prev + PAGE_SIZE);
        }
    };

    const handleAddHost = async (member: GroupMember) => {
        if (!token) return;

        setAddingUserId(member.user_id);
        setErrorMessage(null);
        const result = await addHost(token, eventId, member.user_id);
        setAddingUserId(null);

        if (result.success && result.data) {
            const newHost: EventHost = result.data.host;
            const updatedHosts = [...hosts, newHost];
            onHostsChanged(updatedHosts);
        } else {
            setErrorMessage(result.error || 'Failed to add host');
        }
    };

    const handleRemoveHost = async (hostUserId: number) => {
        if (!token) return;

        setRemovingUserId(hostUserId);
        setErrorMessage(null);
        const result = await removeHost(token, eventId, hostUserId);
        setRemovingUserId(null);

        if (result.success) {
            const updatedHosts = hosts.filter(h => h.user_id !== hostUserId);
            onHostsChanged(updatedHosts);
        } else {
            if (result.return_code === 'LAST_HOST') {
                setErrorMessage('Add another host first before removing this one.');
            } else {
                setErrorMessage(result.error || 'Failed to remove host');
            }
        }
    };

    const isHost = (userId: number) => hosts.some(h => h.user_id === userId);

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 font-display">
                        Manage Hosts
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 transition"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Error message */}
                    {errorMessage && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {errorMessage}
                        </div>
                    )}

                    {/* Current Hosts */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Current Hosts ({hosts.length})
                        </h4>
                        <div className="space-y-2">
                            {hosts.map(host => (
                                <div
                                    key={host.user_id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                                >
                                    {host.avatar_url ? (
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            <Image
                                                src={host.avatar_url}
                                                alt={host.name}
                                                fill
                                                className="rounded-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-200 to-violet-300 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm font-medium text-indigo-800">
                                                {host.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <span className="flex-1 font-medium text-slate-900 text-sm">
                                        {host.name}
                                    </span>
                                    {hosts.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveHost(host.user_id)}
                                            disabled={removingUserId === host.user_id}
                                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                        >
                                            {removingUserId === host.user_id ? 'Removing...' : 'Remove'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* Add Host - Member Search */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Add Host
                        </h4>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search group members..."
                                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50"
                            >
                                {searching ? '...' : 'Search'}
                            </button>
                        </form>

                        {/* Search Results */}
                        {hasSearched && (
                            <div className="space-y-2">
                                {searchResults.length === 0 && !searching && (
                                    <p className="text-sm text-slate-500 text-center py-4">
                                        No members found
                                    </p>
                                )}
                                {searchResults.map(member => {
                                    const memberIsHost = isHost(member.user_id);
                                    return (
                                        <div
                                            key={member.user_id}
                                            className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl"
                                        >
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
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-medium text-indigo-600">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-slate-900 text-sm block truncate">
                                                    {member.name}
                                                </span>
                                                <span className={`text-xs ${
                                                    member.role === 'organiser'
                                                        ? 'text-indigo-600'
                                                        : member.role === 'host'
                                                            ? 'text-violet-600'
                                                            : 'text-slate-400'
                                                }`}>
                                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </span>
                                            </div>
                                            {memberIsHost ? (
                                                <span className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg">
                                                    Host
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddHost(member)}
                                                    disabled={addingUserId === member.user_id}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                                                >
                                                    {addingUserId === member.user_id ? 'Adding...' : 'Add'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Load More */}
                                {hasMore && (
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={searching}
                                        className="w-full py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition disabled:opacity-50"
                                    >
                                        {searching ? 'Loading...' : 'Load More'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
