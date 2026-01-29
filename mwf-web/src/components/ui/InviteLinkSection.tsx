'use client';

/*
=======================================================================================================================================
InviteLinkSection Component
=======================================================================================================================================
Displays and manages magic invite links for events and groups.
Shows link status, allows copying, regenerating, and disabling/enabling.
Only visible to organisers and hosts.
=======================================================================================================================================
*/

import { useState, useEffect } from 'react';
import {
    MagicLink,
    getOrCreateMagicLink as getEventMagicLink,
    regenerateMagicLink as regenerateEventMagicLink,
    disableMagicLink as disableEventMagicLink,
    enableMagicLink as enableEventMagicLink,
} from '@/lib/api/events';
import {
    getOrCreateGroupMagicLink,
    regenerateGroupMagicLink,
    disableGroupMagicLink,
    enableGroupMagicLink,
} from '@/lib/api/groups';

interface InviteLinkSectionProps {
    type: 'event' | 'group';
    id: number;
    token: string;
}

export default function InviteLinkSection({ type, id, token }: InviteLinkSectionProps) {
    const [magicLink, setMagicLink] = useState<MagicLink | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [showDisableModal, setShowDisableModal] = useState(false);

    // =======================================================================
    // Select API functions based on type
    // =======================================================================
    const regenerateMagicLink = type === 'event' ? regenerateEventMagicLink : regenerateGroupMagicLink;
    const disableMagicLink = type === 'event' ? disableEventMagicLink : disableGroupMagicLink;
    const enableMagicLink = type === 'event' ? enableEventMagicLink : enableGroupMagicLink;

    // =======================================================================
    // Fetch or create magic link on mount
    // =======================================================================
    useEffect(() => {
        async function fetchMagicLink() {
            const fetchFn = type === 'event' ? getEventMagicLink : getOrCreateGroupMagicLink;
            const result = await fetchFn(token, id);
            if (result.success && result.data) {
                setMagicLink(result.data);
            } else {
                setError(result.error || 'Failed to load invite link');
            }
            setLoading(false);
        }
        fetchMagicLink();
    }, [token, id, type]);

    // =======================================================================
    // Copy link to clipboard
    // =======================================================================
    const handleCopy = async () => {
        if (!magicLink) return;
        try {
            await navigator.clipboard.writeText(magicLink.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = magicLink.url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // =======================================================================
    // Regenerate link (new token, reset count)
    // =======================================================================
    const handleRegenerate = async () => {
        setActionLoading(true);
        setShowRegenerateModal(false);
        const result = await regenerateMagicLink(token, id);
        if (result.success && result.data) {
            setMagicLink(result.data);
        } else {
            setError(result.error || 'Failed to regenerate link');
        }
        setActionLoading(false);
    };

    // =======================================================================
    // Disable link
    // =======================================================================
    const handleDisable = async () => {
        setActionLoading(true);
        setShowDisableModal(false);
        const result = await disableMagicLink(token, id);
        if (result.success && magicLink) {
            setMagicLink({ ...magicLink, is_active: false });
        } else {
            setError(result.error || 'Failed to disable link');
        }
        setActionLoading(false);
    };

    // =======================================================================
    // Enable link
    // =======================================================================
    const handleEnable = async () => {
        setActionLoading(true);
        const result = await enableMagicLink(token, id);
        if (result.success && result.data && magicLink) {
            setMagicLink({
                ...magicLink,
                is_active: true,
                expires_at: result.data.expires_at,
            });
        } else {
            setError(result.error || 'Failed to enable link');
        }
        setActionLoading(false);
    };

    // =======================================================================
    // Check if link is expired
    // =======================================================================
    const isExpired = magicLink?.expires_at
        ? new Date(magicLink.expires_at) < new Date()
        : false;

    // =======================================================================
    // Format expiry date
    // =======================================================================
    const formatExpiry = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4 font-display">Invite People</h2>
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading invite link...</span>
                </div>
            </div>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error && !magicLink) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4 font-display">Invite People</h2>
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 font-display">Invite People</h2>

            {magicLink && magicLink.is_active && !isExpired ? (
                // =======================================================================
                // Active link state
                // =======================================================================
                <>
                    <p className="text-sm text-slate-600 mb-3">
                        Share this link to invite people to the {type === 'event' ? 'event' : 'group'}:
                    </p>

                    {/* Link display box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 overflow-hidden">
                        <p className="text-sm text-slate-700 font-mono break-all">
                            {magicLink.url}
                        </p>
                    </div>

                    {/* Expiry info */}
                    <p className="text-xs text-slate-500 mb-4">
                        Expires: {formatExpiry(magicLink.expires_at)}
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleCopy}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50"
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowRegenerateModal(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate
                        </button>
                        <button
                            onClick={() => setShowDisableModal(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Disable
                        </button>
                    </div>
                </>
            ) : magicLink && !magicLink.is_active ? (
                // =======================================================================
                // Disabled link state
                // =======================================================================
                <>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-slate-600">
                            Invite link is disabled
                        </p>
                    </div>
                    <button
                        onClick={handleEnable}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50"
                    >
                        {actionLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Enabling...
                            </>
                        ) : (
                            'Enable'
                        )}
                    </button>
                </>
            ) : magicLink && isExpired ? (
                // =======================================================================
                // Expired link state
                // =======================================================================
                <>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-slate-600">
                            Invite link has expired
                        </p>
                    </div>
                    <button
                        onClick={handleRegenerate}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50"
                    >
                        {actionLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Regenerating...
                            </>
                        ) : (
                            'Regenerate'
                        )}
                    </button>
                </>
            ) : null}

            {/* Error message */}
            {error && magicLink && (
                <p className="text-sm text-red-600 mt-3">{error}</p>
            )}

            {/* Regenerate confirmation modal */}
            {showRegenerateModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowRegenerateModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 font-display">
                                Regenerate invite link?
                            </h3>
                            <button
                                onClick={() => setShowRegenerateModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">
                            The current link will stop working. Anyone with the old link will see &quot;This link is no longer valid&quot;.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRegenerateModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRegenerate}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition font-medium"
                            >
                                Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disable confirmation modal */}
            {showDisableModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowDisableModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 font-display">
                                Disable invite link?
                            </h3>
                            <button
                                onClick={() => setShowDisableModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                            Anyone who clicks this link will see &quot;This link is no longer active&quot;.
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            You can re-enable it later.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDisableModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisable}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium"
                            >
                                Disable
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
