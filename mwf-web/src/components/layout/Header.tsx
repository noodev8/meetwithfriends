'use client';

/*
=======================================================================================================================================
Header Component
=======================================================================================================================================
Shared header for all pages. Handles both authenticated and non-authenticated states.
- Logo: Links to dashboard (logged in) or landing (logged out)
- Nav: Groups, Events
- User Menu: Profile, Log out (logged in) or Log in, Sign up (logged out)
=======================================================================================================================================
*/

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // =======================================================================
    // Close menu when clicking outside
    // =======================================================================
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // =======================================================================
    // Handle logout
    // =======================================================================
    const handleLogout = () => {
        setMenuOpen(false);
        logout();
    };

    return (
        <header className="flex justify-between items-center px-8 py-4 bg-white border-b">
            {/* Logo */}
            <Link href={user ? '/dashboard' : '/'} className="text-xl font-bold text-blue-600">
                Meet With Friends
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-8">
                <Link
                    href="/groups"
                    className="text-gray-600 hover:text-gray-900 transition"
                >
                    Groups
                </Link>
                <Link
                    href="/events"
                    className="text-gray-600 hover:text-gray-900 transition"
                >
                    Events
                </Link>

                {/* User Menu (logged in) */}
                {user ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition"
                        >
                            <span>{user.name}</span>
                            <svg
                                className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                                <Link
                                    href="/profile"
                                    onClick={() => setMenuOpen(false)}
                                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Auth links (logged out) */
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-gray-600 hover:text-gray-900 transition"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/register"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Sign up
                        </Link>
                    </div>
                )}
            </nav>
        </header>
    );
}
