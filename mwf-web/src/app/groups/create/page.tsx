'use client';

/*
=======================================================================================================================================
Create Group Page
=======================================================================================================================================
Form to create a new group. Requires authentication.
Two-column layout on desktop: form on left, contextual tips on right.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createGroup } from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';
// import ImageUpload from '@/components/ui/ImageUpload'; // Hidden - using theme colors instead
import RichTextEditor from '@/components/ui/RichTextEditor';
import { THEME_OPTIONS, GroupThemeColor } from '@/lib/groupThemes';

// =======================================================================
// Tips data for sidebar
// =======================================================================
const tips = [
    {
        id: 'name',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
        ),
        title: 'Choosing a name',
        description: 'Pick something memorable that reflects your group\'s vibe. Location-based names like "Brookfield Socials" help people find you.',
    },
    {
        id: 'description',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
        ),
        title: 'Writing a description',
        description: 'Tell people what to expect: the types of activities, how often you meet, and who should join. Be welcoming!',
    },
    {
        id: 'image',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        title: 'Adding an image',
        description: 'Groups with images stand out. Use a photo from a past event, your local area, or something that captures your group\'s spirit.',
    },
    {
        id: 'policy',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        title: 'Join policy',
        description: 'Require approval if you want to vet new members first. Auto-approve works well for open, welcoming communities.',
    },
];

export default function CreateGroupPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    // const [imageUrl, setImageUrl] = useState<string | null>(null); // Hidden - using theme colors
    // const [imagePosition, setImagePosition] = useState<'top' | 'center' | 'bottom'>('center'); // Hidden
    const [themeColor, setThemeColor] = useState<GroupThemeColor>('indigo');
    const [joinPolicy, setJoinPolicy] = useState<'auto' | 'approval'>('approval');
    const [visibility, setVisibility] = useState<'listed' | 'unlisted'>('listed');
    const [requireProfileImage, setRequireProfileImage] = useState(false);
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
            theme_color: themeColor,
            join_policy: joinPolicy,
            visibility: visibility,
            require_profile_image: requireProfileImage,
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Create group form with tips sidebar
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 mb-6 sm:mb-8">Create a Group</h1>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Form Column */}
                    <div className="flex-1 lg:flex-[3]">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="mb-6">
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    placeholder="e.g., Brookfield Socials"
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Description
                                </label>
                                <RichTextEditor
                                    value={description}
                                    onChange={setDescription}
                                    placeholder="Tell people what your group is about..."
                                />
                            </div>

                            {/* Theme Color Selector */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Theme Color
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {THEME_OPTIONS.map((theme) => (
                                        <button
                                            key={theme.key}
                                            type="button"
                                            onClick={() => setThemeColor(theme.key)}
                                            className={`w-10 h-10 rounded-xl ${theme.bgColor} transition-all ${
                                                themeColor === theme.key
                                                    ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                                                    : 'hover:scale-105'
                                            }`}
                                            title={theme.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Join Policy
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                                        <input
                                            type="radio"
                                            name="joinPolicy"
                                            value="approval"
                                            checked={joinPolicy === 'approval'}
                                            onChange={() => setJoinPolicy('approval')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">Require Approval</p>
                                            <p className="text-sm text-slate-500">New members must be approved by an organiser</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                                        <input
                                            type="radio"
                                            name="joinPolicy"
                                            value="auto"
                                            checked={joinPolicy === 'auto'}
                                            onChange={() => setJoinPolicy('auto')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">Auto Approve</p>
                                            <p className="text-sm text-slate-500">Anyone can join immediately</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Visibility
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="listed"
                                            checked={visibility === 'listed'}
                                            onChange={() => setVisibility('listed')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">Listed</p>
                                            <p className="text-sm text-slate-500">Anyone can find and join your group</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="unlisted"
                                            checked={visibility === 'unlisted'}
                                            onChange={() => setVisibility('unlisted')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">Unlisted</p>
                                            <p className="text-sm text-slate-500">Only people with the invite link can join</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={requireProfileImage}
                                        onChange={(e) => setRequireProfileImage(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                    />
                                    <div>
                                        <p className="font-medium text-slate-800">Require Profile Image</p>
                                        <p className="text-sm text-slate-500">Members must have a profile photo before they can join</p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : 'Create Group'}
                                </button>
                                <Link
                                    href="/dashboard"
                                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition text-center"
                                >
                                    Cancel
                                </Link>
                            </div>
                        </form>
                    </div>

                    {/* Tips Sidebar - Hidden on mobile, shown on lg+ */}
                    <aside className="hidden lg:block lg:flex-[2]">
                        <div className="sticky top-8 space-y-4">
                            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200/50 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <h2 className="font-display text-lg font-semibold text-slate-800">Tips</h2>
                                </div>
                                <div className="space-y-4">
                                    {tips.map((tip) => (
                                        <div key={tip.id} className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                                {tip.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-800 text-sm">{tip.title}</h3>
                                                <p className="text-sm text-slate-600 mt-0.5">{tip.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </SidebarLayout>
    );
}
