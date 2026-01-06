'use client';

/*
=======================================================================================================================================
Create Group Page
=======================================================================================================================================
Form to create a new group. Requires authentication.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createGroup } from '@/lib/api/groups';
import Header from '@/components/layout/Header';

export default function CreateGroupPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [joinPolicy, setJoinPolicy] = useState<'auto' | 'approval'>('approval');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // =======================================================================
    // Redirect to login if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Handle form submission
    // =======================================================================
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError('You must be logged in to create a group');
            return;
        }

        if (!name.trim()) {
            setError('Group name is required');
            return;
        }

        setSubmitting(true);

        const result = await createGroup(token, {
            name: name.trim(),
            description: description.trim() || undefined,
            join_policy: joinPolicy,
        });

        if (result.success && result.data) {
            router.push(`/groups/${result.data.id}`);
        } else {
            setError(result.error || 'Failed to create group');
            setSubmitting(false);
        }
    }

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || !user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Create group form
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex-1 px-8 py-8 max-w-2xl mx-auto w-full">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a Group</h1>

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

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create Group'}
                        </button>
                        <Link
                            href="/dashboard"
                            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
