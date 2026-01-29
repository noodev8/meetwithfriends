'use client';

/*
=======================================================================================================================================
InviteFlow Component
=======================================================================================================================================
Main orchestrator for the invite acceptance flow. Manages a step-based state machine:
  loading → intro → signup/photo-upload/processing → redirecting (with error branch)

Handles both logged-in (auto-accept) and new user (signup form) flows.
Intercepts PROFILE_IMAGE_REQUIRED to show a photo upload screen before retrying.
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

type FlowStep = 'loading' | 'intro' | 'signup' | 'photo-upload' | 'processing' | 'redirecting' | 'error';

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

    // =======================================================================
    // Validate invite token once auth state is resolved
    // =======================================================================
    const doValidate = useCallback(async () => {
        const result = await validateInvite(token, authToken || undefined);

        if (result.success && result.data) {
            setInvite(result.data);

            // Auto-accept event invites for logged-in users
            if (user && authToken && result.data.type === 'event' && result.data.invite.event) {
                // Already attending → redirect straight to event page
                if (result.data.user_status?.is_event_rsvp) {
                    setStep('redirecting');
                    router.push(`/events/${result.data.invite.event.id}`);
                    return;
                }

                // Not yet attending → auto-accept
                const acceptResult = await acceptInvite(token, authToken);
                if (acceptResult.success && acceptResult.data) {
                    setStep('redirecting');
                    router.push(acceptResult.data.redirect_to);
                } else if (acceptResult.return_code === 'PROFILE_IMAGE_REQUIRED') {
                    setPhotoUploadOrigin('logged-in');
                    setStep('photo-upload');
                } else {
                    setErrorCode(acceptResult.return_code || 'UNKNOWN');
                    if (acceptResult.return_code === 'EVENT_ENDED' || acceptResult.return_code === 'EVENT_CANCELLED') {
                        setErrorGroupId(result.data.invite.group.id);
                    }
                    setStep('error');
                }
                return;
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
            setStep('redirecting');
            router.push(result.data.redirect_to);
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
            setStep('redirecting');
            router.push(result.data.redirect_to);
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
                    setStep('redirecting');
                    router.push(retryResult.data.redirect_to);
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
                setStep('redirecting');
                router.push(retryResult.data.redirect_to);
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
