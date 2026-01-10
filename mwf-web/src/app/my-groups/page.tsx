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
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-display">Your Groups</h1>
                        <p className="text-stone-500 mt-1">Groups you organise or are a member of</p>
                    </div>
                    <Link
                        href="/groups/create"
                        className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Group
                    </Link>
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-stone-600 font-medium mb-2">No groups yet</p>
                        <p className="text-stone-500 text-sm mb-6">Create your own group or browse existing ones to join</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/groups/create"
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all"
                            >
                                Create Group
                            </Link>
                            <Link
                                href="/groups"
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-stone-300 text-stone-700 font-medium rounded-full hover:bg-stone-50 transition"
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
                            className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
                        >
                            Browse all groups
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                )}
            </div>

            <Footer />
        </main>
    );
}

// =======================================================================
// Group Card Component
// =======================================================================
function GroupCard({ group }: { group: MyGroup }) {
    const upcomingCount = group.upcoming_event_count || 0;

    return (
        <Link
            href={`/groups/${group.id}`}
            className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
        >
            {group.image_url ? (
                <div className="h-32 bg-stone-100">
                    <img
                        src={group.image_url}
                        alt={group.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            ) : (
                <div className="h-32 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                    <span className="text-4xl text-amber-300 group-hover:scale-110 transition-transform">
                        {group.name.charAt(0).toUpperCase()}
                    </span>
                </div>
            )}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                        {group.name}
                    </h3>
                    {group.role === 'organiser' && (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                            Organiser
                        </span>
                    )}
                    {group.role === 'host' && (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                            Host
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-stone-400">
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {group.member_count} members
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
        </Link>
    );
}
