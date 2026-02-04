'use client';

/*
=======================================================================================================================================
InviteFlow Component
=======================================================================================================================================
Main orchestrator for the invite acceptance flow. Manages a step-based state machine:
  loading → intro → signup/photo-upload/processing → accepted/redirecting (with error branch)

Handles both logged-in and new user (signup form) flows.
Intercepts PROFILE_IMAGE_REQUIRED to show a photo upload screen before retrying.

Flow differences by invite type:
  - Group invites: Show intro → accept → show "You've joined!" confirmation → redirect to group
  - Event invites: Show intro → accept (joins group only, no RSVP) → redirect directly to event
    User reviews event details and RSVPs themselves from the event page.
=======================================================================================================================================
*/

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    validateInvite,
    acceptInvite,
    acceptInviteWithSignup,
    InviteData,
} from '@/lib/api/invite';
import { updateProfile } from '@/lib/api/users';
import InviteIntro from './InviteIntro';
import InviteSignupForm from './InviteSignupForm';
import InvitePhotoUpload from './InvitePhotoUpload';
import InviteError from './InviteError';

type FlowStep = 'loading' | 'intro' | 'signup' | 'photo-upload' | 'processing' | 'accepted' | 'redirecting' | 'error';

interface InviteFlowProps {
    token: string;
    type: 'event' | 'group';
}

export default function InviteFlow({ token, type: _type }: InviteFlowProps) {
    const router = useRouter();
    const { user, token: authToken, isLoading: authLoading, login, logout, updateUser } = useAuth();

    const [step, setStep] = useState<FlowStep>('loading');
    const [invite, setInvite] = useState<InviteData | null>(null);
    const [errorCode, setErrorCode] = useState('');
    const [errorGroupId, setErrorGroupId] = useState<number | undefined>();
    const [signupError, setSignupError] = useState('');
    const [isAccepting, setIsAccepting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photoUploadOrigin, setPhotoUploadOrigin] = useState<'logged-in' | 'signup' | null>(null);
    const [pendingSignupPayload, setPendingSignupPayload] = useState<{ name: string; email: string; password: string } | null>(null);
    const [photoUploadError, setPhotoUploadError] = useState('');
    const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
    const [acceptedRsvpStatus, setAcceptedRsvpStatus] = useState<string | null>(null);
    const [acceptedRedirectTo, setAcceptedRedirectTo] = useState('');

    // =======================================================================
    // Validate invite token once auth state is resolved
    // =======================================================================
    const doValidate = useCallback(async () => {
        const result = await validateInvite(token, authToken || undefined);

        if (result.success && result.data) {
            setInvite(result.data);

            // For event invites: if already attending, redirect straight to event page
            // Otherwise show intro screen (no auto-accept - user should review event first)
            if (user && authToken && result.data.type === 'event' && result.data.invite.event) {
                if (result.data.user_status?.is_event_rsvp) {
                    setStep('redirecting');
                    localStorage.setItem('show_app_download', 'true');
                    router.push(`/events/${result.data.invite.event.id}`);
                    return;
                }
                // Not yet attending → show intro screen (user clicks "Let's take a look")
            }

            setStep('intro');
        } else {
            setErrorCode(result.return_code || 'UNKNOWN');
            setStep('error');
        }
    }, [token, authToken, user, router]);

    useEffect(() => {
        if (authLoading) return;
        doValidate();
    }, [authLoading, doValidate]);

    // =======================================================================
    // Handle "Accept" click from intro (logged-in user)
    // =======================================================================
    const handleAcceptLoggedIn = async () => {
        if (!authToken) return;

        setIsAccepting(true);
        const result = await acceptInvite(token, authToken);

        if (result.success && result.data) {
            localStorage.setItem('show_app_download', 'true');

            // For event invites: redirect directly to event page (user reviews and RSVPs there)
            // For group invites: show "accepted" confirmation screen
            if (invite?.type === 'event') {
                setStep('redirecting');
                router.push(result.data.redirect_to);
            } else {
                setAcceptedRsvpStatus(result.data.actions.rsvp_status);
                setAcceptedRedirectTo(result.data.redirect_to);
                setStep('accepted');
            }
        } else if (result.return_code === 'PROFILE_IMAGE_REQUIRED') {
            setPhotoUploadOrigin('logged-in');
            setStep('photo-upload');
        } else {
            setErrorCode(result.return_code || 'UNKNOWN');
            if (result.return_code === 'EVENT_ENDED' || result.return_code === 'EVENT_CANCELLED') {
                setErrorGroupId(invite?.invite.group.id);
            }
            setStep('error');
        }

        setIsAccepting(false);
    };

    // =======================================================================
    // Handle "Accept" click from intro (not logged in → go to signup)
    // =======================================================================
    const handleAcceptNotLoggedIn = () => {
        setStep('signup');
    };

    // =======================================================================
    // Handle accept button click (routes to correct handler)
    // =======================================================================
    const handleAccept = () => {
        if (user && authToken) {
            handleAcceptLoggedIn();
        } else {
            handleAcceptNotLoggedIn();
        }
    };

    // =======================================================================
    // Handle "Log in" click - store pending invite and redirect to login
    // =======================================================================
    const handleLogin = () => {
        localStorage.setItem('pending_invite_token', token);
        localStorage.setItem('pending_invite_type', invite?.type === 'event' ? 'e' : 'g');
        router.push('/login');
    };

    // =======================================================================
    // Handle "Log out" click
    // =======================================================================
    const handleLogout = () => {
        logout();
        // Re-validate without auth to refresh the invite data
        setStep('loading');
    };

    // =======================================================================
    // Handle signup form submission
    // =======================================================================
    const handleSignupSubmit = async (payload: { name: string; email: string; password: string }) => {
        setSignupError('');
        setIsSubmitting(true);

        const result = await acceptInviteWithSignup(token, payload);

        if (result.success && result.data) {
            // Log the user in
            login(result.data.token, result.data.user);
            localStorage.setItem('show_app_download', 'true');

            // For event invites: redirect directly to event page (user reviews and RSVPs there)
            // For group invites: show "accepted" confirmation screen
            if (invite?.type === 'event') {
                setStep('redirecting');
                router.push(result.data.redirect_to);
            } else {
                setAcceptedRsvpStatus(result.data.actions.rsvp_status);
                setAcceptedRedirectTo(result.data.redirect_to);
                setStep('accepted');
            }
        } else if (result.return_code === 'PROFILE_IMAGE_REQUIRED') {
            setPendingSignupPayload(payload);
            setPhotoUploadOrigin('signup');
            setStep('photo-upload');
        } else {
            if (result.return_code === 'EMAIL_EXISTS') {
                setSignupError('An account with this email already exists.');
            } else {
                setSignupError(result.error || 'Failed to create account');
            }
        }

        setIsSubmitting(false);
    };

    // =======================================================================
    // Handle photo upload continue (retry join with avatar)
    // =======================================================================
    const handlePhotoUploadContinue = async (avatarUrl: string) => {
        setPhotoUploadError('');
        setIsPhotoProcessing(true);

        if (photoUploadOrigin === 'logged-in' && authToken) {
            // Save photo to existing account, then retry join
            const profileResult = await updateProfile(authToken, { avatar_url: avatarUrl });
            if (profileResult.success && profileResult.data) {
                updateUser(profileResult.data);

                const retryResult = await acceptInvite(token, authToken);
                if (retryResult.success && retryResult.data) {
                    localStorage.setItem('show_app_download', 'true');

                    // For event invites: redirect directly to event page
                    // For group invites: show "accepted" confirmation screen
                    if (invite?.type === 'event') {
                        setStep('redirecting');
                        router.push(retryResult.data.redirect_to);
                    } else {
                        setAcceptedRsvpStatus(retryResult.data.actions.rsvp_status);
                        setAcceptedRedirectTo(retryResult.data.redirect_to);
                        setStep('accepted');
                    }
                } else {
                    setPhotoUploadError(retryResult.error || 'Failed to join. Please try again.');
                }
            } else {
                setPhotoUploadError(profileResult.error || 'Failed to save photo. Please try again.');
            }
        } else if (photoUploadOrigin === 'signup' && pendingSignupPayload) {
            // Retry signup with avatar included
            const retryResult = await acceptInviteWithSignup(token, {
                ...pendingSignupPayload,
                avatar_url: avatarUrl,
            });

            if (retryResult.success && retryResult.data) {
                // Ensure avatar_url is in the user object stored in AuthContext
                const userWithAvatar = retryResult.data.user.avatar_url
                    ? retryResult.data.user
                    : { ...retryResult.data.user, avatar_url: avatarUrl };
                login(retryResult.data.token, userWithAvatar);
                localStorage.setItem('show_app_download', 'true');

                // For event invites: redirect directly to event page
                // For group invites: show "accepted" confirmation screen
                if (invite?.type === 'event') {
                    setStep('redirecting');
                    router.push(retryResult.data.redirect_to);
                } else {
                    setAcceptedRsvpStatus(retryResult.data.actions.rsvp_status);
                    setAcceptedRedirectTo(retryResult.data.redirect_to);
                    setStep('accepted');
                }
            } else {
                setPhotoUploadError(retryResult.error || 'Failed to create account. Please try again.');
            }
        }

        setIsPhotoProcessing(false);
    };

    // =======================================================================
    // Render based on current step
    // =======================================================================

    if (step === 'loading') {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading invitation...</p>
                </div>
            </main>
        );
    }

    if (step === 'error') {
        return <InviteError returnCode={errorCode} groupId={errorGroupId} />;
    }

    if (step === 'accepted') {
        const isWaitlist = acceptedRsvpStatus === 'waitlist';
        const isGroupOnly = invite?.type === 'group' || !acceptedRsvpStatus;
        const eventTitle = invite?.invite.event?.title;
        const groupName = invite?.invite.group.name;

        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md text-center">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        {isGroupOnly ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 font-display mb-2">
                                    You&apos;ve joined the group!
                                </h1>
                                <p className="text-slate-600">
                                    Welcome to <span className="font-medium text-slate-800">{groupName}</span>.
                                </p>
                            </>
                        ) : isWaitlist ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 font-display mb-2">
                                    You&apos;re on the waitlist
                                </h1>
                                {eventTitle && (
                                    <p className="text-slate-800 font-medium mb-1">{eventTitle}</p>
                                )}
                                <p className="text-slate-600 text-sm">
                                    This event is currently full. If a spot opens up, you&apos;ll be moved in automatically.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 font-display mb-2">
                                    You&apos;re going!
                                </h1>
                                {eventTitle && (
                                    <p className="text-slate-800 font-medium mb-1">{eventTitle}</p>
                                )}
                                <p className="text-slate-600 text-sm">
                                    Your spot is confirmed. See you there!
                                </p>
                            </>
                        )}

                        <button
                            onClick={() => router.push(acceptedRedirectTo)}
                            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition shadow-sm"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    if (step === 'redirecting') {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">
                        {invite?.type === 'event' ? 'Taking you to the event...' : 'Taking you to the group...'}
                    </p>
                </div>
            </main>
        );
    }

    if (step === 'photo-upload' && invite) {
        return (
            <InvitePhotoUpload
                groupName={invite.invite.group.name}
                isProcessing={isPhotoProcessing}
                error={photoUploadError}
                onPhotoReady={handlePhotoUploadContinue}
            />
        );
    }

    if (step === 'signup' && invite) {
        return (
            <InviteSignupForm
                isSubmitting={isSubmitting}
                error={signupError}
                onSubmit={handleSignupSubmit}
                onLogin={handleLogin}
            />
        );
    }

    if (step === 'intro' && invite) {
        return (
            <InviteIntro
                invite={invite}
                user={user}
                isAccepting={isAccepting}
                onAccept={handleAccept}
                onLogout={handleLogout}
            />
        );
    }

    // Fallback (should not reach here)
    return null;
}
