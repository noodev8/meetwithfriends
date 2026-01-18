'use client';

/*
=======================================================================================================================================
Explore Page
=======================================================================================================================================
Discover new groups to join. Shows all listed groups the user is not a member of.
Users find events by going into specific groups.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { discoverGroups, GroupWithCount } from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getGroupTheme, getGroupInitials } from '@/lib/groupThemes';

export default function ExplorePage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<GroupWithCount[]>([]);
    const [loading, setLoading] = useState(true);

    // =======================================================================
    // Redirect to landing if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Fetch discoverable groups
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (!token) return;

            const result = await discoverGroups(token);
            if (result.success && result.data) {
                setGroups(result.data);
            }
            setLoading(false);
        }

        if (user && token) {
            fetchData();
        }
    }, [user, token]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || !user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-4">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                        Discover
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Find new groups to join
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 mt-4">Loading groups...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">🔍</div>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-2">
                            No groups to discover
                        </h2>
                        <p className="text-slate-500 mb-6">
                            You&apos;re already a member of all available groups, or no public groups exist yet.
                        </p>
                        <Link
                            href="/groups/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create a Group
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {groups.map(group => (
                            <DiscoverGroupCard key={group.id} group={group} />
                        ))}
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}

// =======================================================================
// Discover Group Card Component
// =======================================================================
function DiscoverGroupCard({ group }: { group: GroupWithCount }) {
    const theme = getGroupTheme(group.theme_color);

    return (
        <Link
            href={`/groups/${group.id}`}
            className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-start gap-4">
                {/* Initial badge */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradientLight} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-lg font-bold ${theme.textColor}`}>
                        {getGroupInitials(group.name)}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {group.name}
                    </h3>

                    {/* Description - strip HTML tags */}
                    {group.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                            {group.description.replace(/<[^>]*>/g, '')}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                        </span>
                        {(group.upcoming_event_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {group.upcoming_event_count} {group.upcoming_event_count === 1 ? 'event' : 'events'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
