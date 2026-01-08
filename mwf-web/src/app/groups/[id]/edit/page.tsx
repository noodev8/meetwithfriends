'use client';

/*
=======================================================================================================================================
Edit Group Page
=======================================================================================================================================
Form to edit group settings. Requires organiser role.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroup, updateGroup, GroupWithCount } from '@/lib/api/groups';
import Header from '@/components/layout/Header';

export default function EditGroupPage() {
    const { user, token, isLoading } = useAuth();
    const params = useParams();
    const router = useRouter();

    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [joinPolicy, setJoinPolicy] = useState<'auto' | 'approval'>('approval');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOrganiser, setIsOrganiser] = useState(false);

    // =======================================================================
    // Fetch group details
    // =======================================================================
    useEffect(() => {
        async function fetchGroup() {
            if (!params.id || isLoading) return;

            if (!user || !token) {
                router.replace('/login');
                return;
            }

            const result = await getGroup(Number(params.id), token);

            if (result.success && result.data) {
                const { group: groupData, membership } = result.data;

                // Check if user is the organiser
                if (!membership || membership.role !== 'organiser') {
                    router.replace(`/groups/${params.id}`);
                    return;
                }

                setIsOrganiser(true);
                setGroup(groupData);
                setName(groupData.name);
                setDescription(groupData.description || '');
                setJoinPolicy(groupData.join_policy as 'auto' | 'approval');
            } else {
                setError(result.error || 'Group not found');
            }

            setLoading(false);
        }

        fetchGroup();
    }, [params.id, token, user, isLoading, router]);

    // =======================================================================
    // Handle form submission
    // =======================================================================
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!token || !group) {
            setError('You must be logged in to edit this group');
            return;
        }

        if (!name.trim()) {
            setError('Group name is required');
            return;
        }

        setSubmitting(true);

        const result = await updateGroup(token, group.id, {
            name: name.trim(),
            description: description.trim() || null,
            join_policy: joinPolicy,
        });

        if (result.success) {
            router.push(`/groups/${group.id}`);
        } else {
            setError(result.error || 'Failed to update group');
            setSubmitting(false);
        }
    }

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || loading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Error or unauthorized state
    // =======================================================================
    if (error || !group || !isOrganiser) {
        return (
            <main className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-gray-600 mb-4">{error || 'Access denied'}</p>
                    <Link href="/groups" className="text-blue-600 hover:text-blue-700">
                        Back to groups
                    </Link>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Edit group form
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto w-full">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <Link
                        href={`/groups/${group.id}`}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        &larr; Back to {group.name}
                    </Link>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Edit Group</h1>

                <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Group Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Brookfield Socials"
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Tell people what your group is about..."
                            rows={4}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Join Policy
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="joinPolicy"
                                    value="approval"
                                    checked={joinPolicy === 'approval'}
                                    onChange={() => setJoinPolicy('approval')}
                                    className="text-blue-600"
                                />
                                <div>
                                    <p className="font-medium text-gray-900">Require Approval</p>
                                    <p className="text-sm text-gray-500">New members must be approved by an organiser</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="joinPolicy"
                                    value="auto"
                                    checked={joinPolicy === 'auto'}
                                    onChange={() => setJoinPolicy('auto')}
                                    className="text-blue-600"
                                />
                                <div>
                                    <p className="font-medium text-gray-900">Auto Approve</p>
                                    <p className="text-sm text-gray-500">Anyone can join immediately</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <Link
                            href={`/groups/${group.id}`}
                            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-center"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
