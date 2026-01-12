'use client';

/*
=======================================================================================================================================
Edit Group Page
=======================================================================================================================================
Form to edit group settings. Requires organiser role.
Two-column layout with form on left and tips sidebar on right.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroup, updateGroup, regenerateInviteCode, GroupWithCount } from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';
// import ImageUpload from '@/components/ui/ImageUpload'; // Hidden - using theme colors instead
import RichTextEditor from '@/components/ui/RichTextEditor';
import { THEME_OPTIONS, GroupThemeColor } from '@/lib/groupThemes';

export default function EditGroupPage() {
    const { user, token, isLoading } = useAuth();
    const params = useParams();
    const router = useRouter();

    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    // const [imageUrl, setImageUrl] = useState<string | null>(null); // Hidden - using theme colors
    // const [imagePosition, setImagePosition] = useState<'top' | 'center' | 'bottom'>('center'); // Hidden
    // const [imageSaving, setImageSaving] = useState(false); // Hidden
    const [themeColor, setThemeColor] = useState<GroupThemeColor>('indigo');
    const [joinPolicy, setJoinPolicy] = useState<'auto' | 'approval'>('approval');
    const [visibility, setVisibility] = useState<'listed' | 'unlisted'>('listed');
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [regeneratingCode, setRegeneratingCode] = useState(false);
    const [copied, setCopied] = useState(false);
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
                // setImageUrl(groupData.image_url || null); // Hidden
                // setImagePosition(groupData.image_position || 'center'); // Hidden
                setThemeColor((groupData.theme_color as GroupThemeColor) || 'indigo');
                setJoinPolicy(groupData.join_policy as 'auto' | 'approval');
                setVisibility(groupData.visibility || 'listed');
                setInviteCode(groupData.invite_code || null);
            } else {
                setError(result.error || 'Group not found');
            }

            setLoading(false);
        }

        fetchGroup();
    }, [params.id, token, user, isLoading, router]);

    /* Hidden - using theme colors instead
    // =======================================================================
    // Handle image change - auto-save to database
    // =======================================================================
    const handleImageChange = async (url: string | null) => {
        setImageUrl(url);

        if (!token || !group) return;

        setImageSaving(true);
        await updateGroup(token, group.id, { image_url: url });
        setImageSaving(false);
    };

    // =======================================================================
    // Handle image position change - auto-save to database
    // =======================================================================
    const handlePositionChange = async (position: 'top' | 'center' | 'bottom') => {
        setImagePosition(position);

        if (!token || !group) return;

        setImageSaving(true);
        await updateGroup(token, group.id, { image_position: position });
        setImageSaving(false);
    };
    */

    // =======================================================================
    // Handle regenerate invite code
    // =======================================================================
    const handleRegenerateCode = async () => {
        if (!token || !group) return;

        setRegeneratingCode(true);
        const result = await regenerateInviteCode(token, group.id);
        setRegeneratingCode(false);

        if (result.success && result.data) {
            setInviteCode(result.data.invite_code);
        } else {
            alert(result.error || 'Failed to regenerate invite code');
        }
    };

    // =======================================================================
    // Handle copy invite link
    // =======================================================================
    const handleCopyInviteLink = async () => {
        if (!group || !inviteCode) return;

        const url = `${window.location.origin}/groups/${group.id}?code=${inviteCode}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
            theme_color: themeColor,
            join_policy: joinPolicy,
            visibility: visibility,
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Error or unauthorized state
    // =======================================================================
    if (error || !group || !isOrganiser) {
        return (
            <SidebarLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-slate-600 mb-4">{error || 'Access denied'}</p>
                    <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
                        Back to dashboard
                    </Link>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Edit group form
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <Link
                        href={`/groups/${group.id}`}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to {group.name}
                    </Link>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 mb-6 sm:mb-8">Edit Group</h1>

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
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
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
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
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
                                    Group Visibility
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
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
                                            <p className="text-sm text-slate-500">Group appears in search and can be found by anyone</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
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
                                            <p className="text-sm text-slate-500">Only people with the invite link can find and join</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Invite Link Section - Only shown for unlisted groups */}
                            {visibility === 'unlisted' && inviteCode && (
                                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                    <label className="block text-sm font-medium text-indigo-800 mb-2">
                                        Invite Link
                                    </label>
                                    <p className="text-sm text-indigo-600 mb-3">
                                        Share this link to invite people to your unlisted group.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/groups/${group.id}?code=${inviteCode}`}
                                            className="flex-1 px-4 py-2.5 bg-white border border-indigo-200 rounded-lg text-sm text-slate-600 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCopyInviteLink}
                                            className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                                        >
                                            {copied ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateCode}
                                        disabled={regeneratingCode}
                                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                                    >
                                        {regeneratingCode ? 'Regenerating...' : 'Regenerate invite code'}
                                    </button>
                                    <p className="text-xs text-indigo-500 mt-1">
                                        Regenerating will invalidate the old link.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <Link
                                    href={`/groups/${group.id}`}
                                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-center"
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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="font-display text-lg font-semibold text-slate-800">Tips</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-sm">Image auto-saves</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">Your group image and position are saved automatically when changed.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-sm">Changing join policy</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">Switching to approval mode won't affect existing members, only new join requests.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-sm">Managing members</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">Use the Members page to approve requests, promote hosts, or remove members.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                <h3 className="font-display font-semibold text-slate-800 mb-3">Quick Links</h3>
                                <div className="space-y-2">
                                    <Link
                                        href={`/groups/${group.id}/members`}
                                        className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Manage Members
                                    </Link>
                                    <Link
                                        href={`/groups/${group.id}/events/create`}
                                        className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Create Event
                                    </Link>
                                    <Link
                                        href={`/groups/${group.id}`}
                                        className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Group Page
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </SidebarLayout>
    );
}
