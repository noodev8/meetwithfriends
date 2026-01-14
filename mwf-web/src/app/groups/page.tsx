'use client';

/*
=======================================================================================================================================
Groups List Page
=======================================================================================================================================
Displays all groups. Accessible to logged-in users.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllGroups, getMyGroups, GroupWithCount } from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getGroupTheme, getGroupInitials } from '@/lib/groupThemes';

export default function GroupsPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<GroupWithCount[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Fetch groups (excluding ones user is already in)
    // =======================================================================
    useEffect(() => {
        async function fetchGroups() {
            const [allGroupsResult, myGroupsResult] = await Promise.all([
                getAllGroups(token || undefined),
                getMyGroups(token!)
            ]);

            if (allGroupsResult.success && allGroupsResult.data) {
                // Filter out groups user is already in
                const myGroupIds = new Set(
                    (myGroupsResult.data || []).map(g => g.id)
                );
                const discoverableGroups = allGroupsResult.data.filter(
                    g => !myGroupIds.has(g.id)
                );
                setGroups(discoverableGroups);
            }
            setLoadingData(false);
        }
        if (token) {
            fetchGroups();
        }
    }, [token]);

    // Helper to strip HTML tags from description
    const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    // getColorClass removed - now using theme colors from groupThemes.ts

    // Loading state
    if (isLoading || !user) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                <div className="flex justify-between items-start mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">Discover Groups</h1>
                        <p className="text-slate-500 mt-1">Find new groups to join</p>
                    </div>
                    <Link
                        href="/groups/create"
                        className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Group
                    </Link>
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                        <p className="text-slate-600 mb-4">No new groups to discover</p>
                        <p className="text-slate-500 mb-6">You&apos;re already in all available groups, or you can create a new one!</p>
                        <Link
                            href="/groups/create"
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-violet-700 transition inline-block"
                        >
                            Create Group
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((group) => {
                            const theme = getGroupTheme(group.theme_color);
                            return (
                            <Link
                                key={group.id}
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
                                        <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                            {group.name}
                                        </h3>
                                        {group.description && (
                                            <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                                                {stripHtml(group.description)}
                                            </p>
                                        )}
                                        <p className="text-slate-400 text-sm mt-2 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                        })}
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}
