'use client';

/*
=======================================================================================================================================
My Groups Page
=======================================================================================================================================
Displays all groups the user is a member of (both organiser and member roles).
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyGroups, MyGroup } from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getGroupTheme, getGroupInitials } from '@/lib/groupThemes';

export default function MyGroupsPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<MyGroup[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    // Fetch groups
    useEffect(() => {
        async function fetchGroups() {
            if (!token) return;

            const result = await getMyGroups(token);
            if (result.success && result.data) {
                setGroups(result.data);
            }
            setLoadingData(false);
        }

        if (user && token) {
            fetchGroups();
        }
    }, [user, token]);

    if (isLoading || !user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">Your Groups</h1>
                        <p className="text-slate-500 mt-1">Groups you organise or are a member of</p>
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
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-slate-600 font-medium mb-2">No groups yet</p>
                        <p className="text-slate-500 text-sm mb-6">Create your own group or browse existing ones to join</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/groups/create"
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-violet-700 transition-all"
                            >
                                Create Group
                            </Link>
                            <Link
                                href="/groups"
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-full hover:bg-slate-50 transition"
                            >
                                Browse Groups
                            </Link>
                        </div>
                    </div>
                ) : (
                    <section className="mb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groups.map((group) => (
                                <GroupCard key={group.id} group={group} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Browse more link */}
                {groups.length > 0 && (
                    <div className="text-center pt-4">
                        <Link
                            href="/groups"
                            className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                        >
                            Browse all groups
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}

// =======================================================================
// Group Card Component - Compact style with theme colors
// =======================================================================
function GroupCard({ group }: { group: MyGroup }) {
    const upcomingCount = group.upcoming_event_count || 0;
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
                    {/* Title and role */}
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {group.name}
                        </h3>
                        {group.role === 'organiser' && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-600 rounded">
                                Organiser
                            </span>
                        )}
                        {group.role === 'host' && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-600 rounded">
                                Host
                            </span>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {group.member_count}
                        </span>
                        {upcomingCount > 0 && (
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {upcomingCount} upcoming
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
