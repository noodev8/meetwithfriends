'use client';

/*
=======================================================================================================================================
InviteError Component
=======================================================================================================================================
Displays user-friendly error messages for invalid/expired invite links.
Maps backend return codes to helpful messages with optional action links.
=======================================================================================================================================
*/

import Link from 'next/link';

interface InviteErrorProps {
    returnCode: string;
    groupId?: number;
}

const ERROR_CONFIG: Record<string, { title: string; message: string }> = {
    INVITE_NOT_FOUND: {
        title: 'Invitation Not Found',
        message: 'This invitation link is no longer valid. It may have been removed or the URL is incorrect.',
    },
    INVITE_EXPIRED: {
        title: 'Invitation Expired',
        message: 'This invitation link has expired. Please ask the admin for a new link.',
    },
    INVITE_DISABLED: {
        title: 'Invitation Disabled',
        message: 'This invitation link has been disabled by the admin.',
    },
    INVITE_LIMIT_REACHED: {
        title: 'Invitation Limit Reached',
        message: 'This invitation link has reached its maximum number of uses. Please ask the admin for a new link.',
    },
    EVENT_ENDED: {
        title: 'Event Has Ended',
        message: 'This event has already happened. You can still view the group it belongs to.',
    },
    EVENT_CANCELLED: {
        title: 'Event Cancelled',
        message: 'This event has been cancelled. You can still view the group it belongs to.',
    },
    PROFILE_IMAGE_REQUIRED: {
        title: 'Profile Photo Required',
        message: 'This group requires members to have a profile photo. Please update your profile and try again.',
    },
};

const DEFAULT_ERROR = {
    title: 'Something Went Wrong',
    message: 'We couldn\'t process this invitation. Please try again or ask the admin for a new link.',
};

export default function InviteError({ returnCode, groupId }: InviteErrorProps) {
    const config = ERROR_CONFIG[returnCode] || DEFAULT_ERROR;
    const showGroupLink = (returnCode === 'EVENT_ENDED' || returnCode === 'EVENT_CANCELLED') && groupId;

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
            <div className="w-full max-w-md text-center">
                {/* Error icon */}
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <h1 className="text-xl font-bold text-slate-800 mb-3">{config.title}</h1>
                    <p className="text-slate-600 mb-6">{config.message}</p>

                    <div className="space-y-3">
                        {showGroupLink && (
                            <Link
                                href={`/groups/${groupId}`}
                                className="block w-full py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-orange-500 transition text-center"
                            >
                                View Group
                            </Link>
                        )}
                        <Link
                            href="/"
                            className="block w-full py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition text-center"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
