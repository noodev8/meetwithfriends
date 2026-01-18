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
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">My Groups</h1>
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
                    <>
                        {/* Groups You Run (Organiser or Host) */}
                        {groups.filter(g => g.role === 'organiser' || g.role === 'host').length > 0 && (
                            <section className="mb-10">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">Groups You Run</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {groups
                                        .filter(g => g.role === 'organiser' || g.role === 'host')
                                        .map((group) => (
                                            <GroupCard key={group.id} group={group} />
                                        ))}
                                </div>
                            </section>
                        )}

                        {/* Groups You're In (Member only) */}
                        {groups.filter(g => g.role === 'member').length > 0 && (
                            <section className="mb-10">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">Groups You&apos;re In</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {groups
                                        .filter(g => g.role === 'member')
                                        .map((group) => (
                                            <GroupCard key={group.id} group={group} />
                                        ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

            </div>
        </SidebarLayout>
    );
}

// =======================================================================
// Group Card Component - Larger cards with description
// =======================================================================
function GroupCard({ group }: { group: MyGroup }) {
    const upcomingCount = group.upcoming_event_count || 0;
    const theme = getGroupTheme(group.theme_color);
    const isLeader = group.role === 'organiser' || group.role === 'host';

    return (
        <Link
            href={`/groups/${group.id}`}
            className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-start gap-5">
                {/* Initial badge - larger */}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${theme.gradientLight} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-2xl font-bold ${theme.textColor}`}>
                        {getGroupInitials(group.name)}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {group.name}
                    </h3>

                    {/* Role badge - more prominent */}
                    {isLeader && (
                        <div className="mt-1">
                            {group.role === 'organiser' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Organiser
                                </span>
                            )}
                            {group.role === 'host' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Host
                                </span>
                            )}
                        </div>
                    )}

                    {/* Description - strip HTML tags */}
                    {group.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mt-2">
                            {group.description.replace(/<[^>]*>/g, '')}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                        </span>
                        {upcomingCount > 0 && (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {upcomingCount} {upcomingCount === 1 ? 'event' : 'events'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
