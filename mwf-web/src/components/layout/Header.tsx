'use client';

/*
=======================================================================================================================================
Header Component
=======================================================================================================================================
Shared header for all pages. Handles both authenticated and non-authenticated states.
- Logo: Links to dashboard (logged in) or landing (logged out)
- Nav: Your Events (logged in), hamburger menu (mobile)
- User Menu: Profile, Log out (logged in) or Log in, Sign up (logged out)
=======================================================================================================================================
*/

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

    // =======================================================================
    // Close menus when clicking outside
    // =======================================================================
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
            // Don't close mobile menu if clicking the hamburger button (it handles its own toggle)
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
                mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // =======================================================================
    // Close mobile menu on route change (when clicking a link)
    // =======================================================================
    const closeMobileMenu = () => setMobileMenuOpen(false);

    // =======================================================================
    // Handle logout
    // =======================================================================
    const handleLogout = () => {
        setMenuOpen(false);
        setMobileMenuOpen(false);
        logout();
        router.push('/');
    };

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 relative z-20">
            <div className="flex justify-between items-center px-4 sm:px-8 py-4 max-w-7xl mx-auto">
                {/* Logo */}
                <Link href={user ? '/your-events' : '/'}>
                    <Image
                        src="/logo.png"
                        alt="Meet With Friends"
                        width={160}
                        height={160}
                        className="h-16 sm:h-20 w-auto"
                        priority
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {/* Your Events (logged in only) */}
                    {user && (
                        <Link
                            href="/your-events"
                            className="text-slate-600 hover:text-slate-900 transition font-medium"
                        >
                            Your Events
                        </Link>
                    )}

                    {/* User Menu (logged in) */}
                    {user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition"
                            >
                                {user.avatar_url ? (
                                    <div className="relative w-8 h-8">
                                        <Image
                                            src={user.avatar_url}
                                            alt={user.name}
                                            fill
                                            className="rounded-full object-cover ring-2 ring-slate-100"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center ring-2 ring-slate-100">
                                        <span className="text-sm font-medium text-indigo-600">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <span className="font-medium">{user.name}</span>
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
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                                    <Link
                                        href="/groups/create"
                                        onClick={() => setMenuOpen(false)}
                                        className="block px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition"
                                    >
                                        Create Group
                                    </Link>
                                    <Link
                                        href="/profile"
                                        onClick={() => setMenuOpen(false)}
                                        className="block px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition"
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition"
                                    >
                                        Log out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Auth links (logged out) */
                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/register"
                                className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
                            >
                                Sign up
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Mobile Menu Button */}
                <button
                    ref={mobileMenuButtonRef}
                    className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? (
                        /* X icon */
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        /* Hamburger icon */
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div
                    ref={mobileMenuRef}
                    className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-50"
                >
                    <nav className="flex flex-col py-2">
                        {user ? (
                            <>
                                <Link
                                    href="/your-events"
                                    onClick={closeMobileMenu}
                                    className="px-4 py-3 text-slate-700 hover:bg-slate-50 transition font-medium"
                                >
                                    Your Events
                                </Link>
                                <Link
                                    href="/groups/create"
                                    onClick={closeMobileMenu}
                                    className="px-4 py-3 text-slate-700 hover:bg-slate-50 transition font-medium"
                                >
                                    Create Group
                                </Link>
                                <Link
                                    href="/profile"
                                    onClick={closeMobileMenu}
                                    className="px-4 py-3 text-slate-700 hover:bg-slate-50 transition font-medium"
                                >
                                    Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Log out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    onClick={closeMobileMenu}
                                    className="px-4 py-3 text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={closeMobileMenu}
                                    className="px-4 py-3 text-indigo-600 font-semibold hover:bg-slate-50 transition"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
