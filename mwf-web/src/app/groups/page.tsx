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

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">All Groups</h1>
                </div>

                {loadingData ? (
                    <p className="text-gray-500">Loading groups...</p>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-lg border p-8 text-center">
                        <p className="text-gray-600 mb-4">No groups yet</p>
                        {user && (
                            <>
                                <p className="text-gray-500 mb-6">Be the first to create one!</p>
                                <Link
                                    href="/groups/create"
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-block"
                                >
                                    Create Group
                                </Link>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        {groups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="bg-white rounded-lg border hover:shadow-md transition overflow-hidden"
                            >
                                {group.image_url ? (
                                    <div className="h-40 bg-gray-200">
                                        <img
                                            src={group.image_url}
                                            alt={group.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                        <span className="text-5xl text-blue-400">
                                            {group.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                                    {group.description && (
                                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                                            {group.description}
                                        </p>
                                    )}
                                    <p className="text-gray-400 text-sm mt-2">
                                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
