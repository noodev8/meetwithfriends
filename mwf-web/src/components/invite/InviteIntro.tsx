'use client';

/*
=======================================================================================================================================
InviteIntro Component
=======================================================================================================================================
Shows the invite landing screen with group/event details and a CTA button.
Displays different content based on invite type (event vs group) and auth state.
=======================================================================================================================================
*/

import Link from 'next/link';
import { InviteData } from '@/lib/api/invite';
import { User } from '@/types';

interface InviteIntroProps {
    invite: InviteData;
    user: User | null;
    isAccepting: boolean;
    onAccept: () => void;
    onLogout: () => void;
}

// Strip HTML tags and truncate to a max length
function stripHtml(html: string, maxLength = 120): string {
    const text = html.replace(/<[^>]*>/g, '').trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '...';
}

export default function InviteIntro({ invite, user, isAccepting, onAccept, onLogout }: InviteIntroProps) {
    const { type, invite: details } = invite;
    const isEvent = type === 'event' && details.event;

    // Format date for event invites
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Check if user is already a member/RSVPed
    const alreadyJoined = invite.user_status?.is_group_member && (!isEvent || invite.user_status?.is_event_rsvp);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 font-display">
                        {isEvent ? details.event!.title : details.group.name}
                    </h1>
                    <p className="text-slate-500 mt-2">
                        {isEvent
                            ? <>You have been invited to the event by <span className="font-semibold text-slate-700">{details.inviter_name}</span></>
                            : <>You have been invited to join the group by <span className="font-semibold text-slate-700">{details.inviter_name}</span></>
                        }
                    </p>
                </div>

                {/* Details card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
                    {isEvent ? (
                        // Event details
                        <div className="space-y-4">
                            {/* Group name */}
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{details.group.name}</span>
                            </div>

                            {/* Date & time */}
                            <div className="flex items-center gap-2 text-slate-700">
                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <div>
                                    <p className="font-medium">{formatDate(details.event!.date_time)}</p>
                                    <p className="text-sm text-slate-500">{formatTime(details.event!.date_time)}</p>
                                </div>
                            </div>

                            {/* Location */}
                            {details.event!.location && (
                                <div className="flex items-center gap-2 text-slate-700">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{details.event!.location}</span>
                                </div>
                            )}

                            {/* Spots remaining */}
                            {details.event!.spots_remaining !== null && (
                                <div className="flex items-center gap-2 text-slate-700">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span>
                                        {details.event!.spots_remaining > 0
                                            ? `${details.event!.spots_remaining} spot${details.event!.spots_remaining === 1 ? '' : 's'} remaining`
                                            : 'No spots remaining (waitlist available)'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Group details
                        <div className="space-y-4">
                            {/* Member count */}
                            <div className="flex items-center gap-2 text-slate-700">
                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{details.group.member_count} member{details.group.member_count === 1 ? '' : 's'}</span>
                            </div>

                            {/* Description */}
                            {details.group.description && (
                                <p className="text-slate-600">{stripHtml(details.group.description)}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Auth status & CTA */}
                <div className="space-y-4">
                    {user ? (
                        // Logged in
                        <>
                            <div className="text-center text-sm text-slate-500">
                                Joining as <span className="font-medium text-slate-700">{user.name}</span>
                                {' '}
                                <button
                                    onClick={onLogout}
                                    className="text-rose-600 hover:text-rose-700"
                                >
                                    Not you? Log out
                                </button>
                            </div>

                            {alreadyJoined ? (
                                <div className="text-center">
                                    <p className="text-green-600 font-medium mb-3">
                                        {isEvent ? 'You\'re already attending this event!' : 'You\'re already a member of this group!'}
                                    </p>
                                    <a
                                        href={isEvent ? `/events/${details.event!.id}` : `/groups/${details.group.id}`}
                                        className="block w-full py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-orange-500 transition text-center"
                                    >
                                        {isEvent ? 'View Event' : 'View Group'}
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={onAccept}
                                    disabled={isAccepting}
                                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAccepting
                                        ? 'Joining...'
                                        : isEvent
                                            ? 'Accept Invitation'
                                            : 'Join Group'}
                                </button>
                            )}
                        </>
                    ) : (
                        // Not logged in
                        <button
                            onClick={onAccept}
                            disabled={isAccepting}
                            className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isEvent ? 'Accept Invitation' : 'Join Group'}
                        </button>
                    )}
                </div>

                {/* Footer branding */}
                <p className="text-center text-sm text-slate-400 mt-8">
                    Powered by <Link href="/" className="font-medium hover:text-slate-500">Meet With Friends</Link>
                </p>
            </div>
        </main>
    );
}
