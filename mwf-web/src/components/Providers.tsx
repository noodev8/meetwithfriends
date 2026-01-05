'use client';

/*
=======================================================================================================================================
Providers
=======================================================================================================================================
Wraps the application with all required context providers.
Separated from layout.tsx because providers need 'use client'.
=======================================================================================================================================
*/

import { AuthProvider } from '@/context/AuthContext';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
