'use client';

/*
=======================================================================================================================================
Events Page Redirect
=======================================================================================================================================
Redirects to dashboard. Events are now shown on the dashboard.
=======================================================================================================================================
*/

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EventsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
            <p className="text-slate-500">Redirecting...</p>
        </main>
    );
}
