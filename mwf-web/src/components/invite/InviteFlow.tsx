'use client';

/*
=======================================================================================================================================
InviteFlow Component
=======================================================================================================================================
Main orchestrator for the invite acceptance flow. Manages a step-based state machine:
  loading → intro → signup/processing → redirecting (with error branch)

Handles both logged-in (auto-accept) and new user (signup form) flows.
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
import InviteIntro from './InviteIntro';
import InviteSignupForm from './InviteSignupForm';
import InviteError from './InviteError';

type FlowStep = 'loading' | 'intro' | 'signup' | 'processing' | 'redirecting' | 'error';

interface InviteFlowProps {
    token: string;
    type: 'event' | 'group';
}

export default function InviteFlow({ token, type: _type }: InviteFlowProps) {
    const router = useRouter();
    const { user, token: authToken, isLoading: authLoading, login, logout } = useAuth();

    const [step, setStep] = useState<FlowStep>('loading');
    const [invite, setInvite] = useState<InviteData | null>(null);
    const [errorCode, setErrorCode] = useState('');
    const [errorGroupId, setErrorGroupId] = useState<number | undefined>();
    const [signupError, setSignupError] = useState('');
    const [isAccepting, setIsAccepting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // =======================================================================
    // Validate invite token once auth state is resolved
    // =======================================================================
    const doValidate = useCallback(async () => {
        const result = await validateInvite(token, authToken || undefined);

        if (result.success && result.data) {
            setInvite(result.data);
            setStep('intro');
        } else {
            setErrorCode(result.return_code || 'UNKNOWN');
            setStep('error');
        }
    }, [token, authToken]);

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
        } else {
            // Show error if accept failed (e.g. PROFILE_IMAGE_REQUIRED)
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
