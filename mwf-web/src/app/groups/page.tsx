'use client';

/*
=======================================================================================================================================
Groups List Page
=======================================================================================================================================
Displays all groups. Accessible to both logged-in and non-logged-in users.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllGroups, GroupWithCount } from '@/lib/api/groups';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function GroupsPage() {
    const { user, token } = useAuth();
    const [groups, setGroups] = useState<GroupWithCount[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // =======================================================================
    // Fetch groups
    // =======================================================================
    useEffect(() => {
        async function fetchGroups() {
            const result = await getAllGroups(token || undefined);
            if (result.success && result.data) {
                setGroups(result.data);
            }
            setLoadingData(false);
        }
        fetchGroups();
    }, [token]);

    // Helper to strip HTML tags from description
    const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-display">Groups</h1>
                    {user && (
                        <Link
                            href="/groups/create"
                            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Group
                        </Link>
                    )}
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
                        <p className="text-stone-600 mb-4">No groups yet</p>
                        {user && (
                            <>
                                <p className="text-stone-500 mb-6">Be the first to create one!</p>
                                <Link
                                    href="/groups/create"
                                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition inline-block"
                                >
                                    Create Group
                                </Link>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {groups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                            >
                                {group.image_url ? (
                                    <div className="h-40 bg-stone-100">
                                        <img
                                            src={group.image_url}
                                            alt={group.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-40 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                                        <span className="text-5xl text-amber-300 group-hover:scale-110 transition-transform">
                                            {group.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="font-semibold text-stone-800 text-lg group-hover:text-amber-700 transition-colors">{group.name}</h3>
                                    {group.description && (
                                        <p className="text-stone-500 text-sm mt-1 line-clamp-2">
                                            {stripHtml(group.description)}
                                        </p>
                                    )}
                                    <p className="text-stone-400 text-sm mt-2">
                                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </main>
    );
}
