'use client';

/*
=======================================================================================================================================
Sidebar Layout Component
=======================================================================================================================================
Main layout wrapper for authenticated pages. Includes:
- Left sidebar with logo and navigation
- Top header with search and user profile
- Main content area
=======================================================================================================================================
*/

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Footer from './Footer';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// Navigation items configuration
const navItems = [
    { name: 'Dashboard', href: '/your-events', icon: 'dashboard' },
    { name: 'Groups', href: '/my-groups', icon: 'groups' },
    { name: 'Discover', href: '/explore', icon: 'explore' },
];

// Icon component for navigation
function NavIcon({ name, className }: { name: string; className?: string }) {
    const icons: Record<string, React.ReactNode> = {
        dashboard: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        events: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        groups: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        ),
        explore: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
        settings: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        profile: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        logout: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        ),
        help: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };
    return icons[name] || null;
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    // Check if a nav item is active
    const isActive = (href: string) => {
        if (href === '/your-events') return pathname === '/your-events';
        return pathname.startsWith(href);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar - Hidden on mobile */}
            <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col">
                {/* Logo */}
                <div className="p-6">
                    <Link href="/your-events" className="text-xl font-bold text-slate-800 tracking-tight">
                        Meet With Friends
                    </Link>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                isActive(item.href)
                                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            <NavIcon name={item.icon} className="w-5 h-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* Bottom section: Help, Logout, User info */}
                {user && (
                    <div className="border-t border-slate-100">
                        {/* Help & Logout links */}
                        <div className="px-4 py-3 space-y-1">
                            <Link
                                href="/help"
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                    isActive('/help')
                                        ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                <NavIcon name="help" className="w-5 h-5" />
                                Help
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            >
                                <NavIcon name="logout" className="w-5 h-5" />
                                Log out
                            </button>
                        </div>

                        {/* User info - clickable to go to profile */}
                        <div className="px-4 pb-4">
                            <Link
                                href="/profile"
                                className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                {user.avatar_url ? (
                                    <div className="relative w-10 h-10">
                                        <Image
                                            src={user.avatar_url}
                                            alt={user.name}
                                            fill
                                            className="rounded-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <span className="text-sm font-medium text-indigo-600">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile header - only visible on mobile */}
                <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-3 text-slate-600 hover:text-slate-900 transition"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>

                    {/* Mobile logo */}
                    <Link href="/your-events" className="font-bold text-slate-800">
                        Meet With Friends
                    </Link>

                    {/* Spacer for balance */}
                    <div className="w-10"></div>
                </header>

                {/* Mobile navigation menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden bg-white border-b border-slate-200 shadow-lg">
                        <nav className="p-4 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isActive(item.href)
                                            ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <NavIcon name={item.icon} className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            ))}
                            <div className="border-t border-slate-100 pt-2 mt-2">
                                <Link
                                    href="/groups/create"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-600 hover:bg-slate-50"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Group
                                </Link>
                                <Link
                                    href="/profile"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isActive('/profile')
                                            ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <NavIcon name="profile" className="w-5 h-5" />
                                    Profile
                                </Link>
                                <Link
                                    href="/help"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isActive('/help')
                                            ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <NavIcon name="help" className="w-5 h-5" />
                                    Help
                                </Link>
                                <button
                                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-600 hover:bg-slate-50"
                                >
                                    <NavIcon name="logout" className="w-5 h-5" />
                                    Log out
                                </button>
                            </div>
                        </nav>
                    </div>
                )}

                {/* Page content */}
                <main className="flex-1 overflow-y-auto flex flex-col">
                    <div className="flex-1">
                        {children}
                    </div>
                    <Footer />
                </main>
            </div>
        </div>
    );
}
