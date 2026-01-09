'use client';

/*
=======================================================================================================================================
Landing Page
=======================================================================================================================================
Public landing page for strangers. Logged-in users are redirected to /dashboard.
Warm, editorial design for social gatherings of all kinds.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// =======================================================================
// Sample event data to showcase the platform - diverse activities
// =======================================================================
const sampleEvents = [
    {
        id: 1,
        title: 'Sunday Dim Sum Club',
        group: 'Sydney Foodies',
        date: 'Sun, Jan 19',
        time: '11:00 AM',
        location: 'Golden Dragon, Chinatown',
        attendees: 12,
        maxAttendees: 16,
        image: 'food',
        icon: '🥟',
        gradient: 'from-amber-400 via-orange-300 to-yellow-200',
    },
    {
        id: 2,
        title: 'Coastal Walk & Coffee',
        group: 'Morning Walkers',
        date: 'Sat, Jan 25',
        time: '7:00 AM',
        location: 'Bondi to Bronte',
        attendees: 18,
        maxAttendees: 25,
        image: 'outdoors',
        icon: '🚶',
        gradient: 'from-emerald-400 via-teal-300 to-cyan-200',
    },
    {
        id: 3,
        title: 'Thursday Pool Night',
        group: 'Cue Sports Crew',
        date: 'Thu, Jan 23',
        time: '7:30 PM',
        location: 'The Local, Newtown',
        attendees: 8,
        maxAttendees: 12,
        image: 'games',
        icon: '🎱',
        gradient: 'from-violet-400 via-purple-300 to-indigo-200',
    },
];

const categories = [
    { name: 'Dinners & Drinks', icon: '🍽️' },
    { name: 'Outdoor & Active', icon: '🥾' },
    { name: 'Games & Sports', icon: '🎱' },
    { name: 'Coffee & Casual', icon: '☕' },
    { name: 'Arts & Culture', icon: '🎨' },
    { name: 'Learning & Skills', icon: '📚' },
];

// =======================================================================
// Event Card Component
// =======================================================================
function EventCard({ event, index }: { event: typeof sampleEvents[0]; index: number }) {
    return (
        <div
            className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
            style={{
                animationDelay: `${index * 150}ms`,
            }}
        >
            {/* Image placeholder with gradient */}
            <div className={`h-40 bg-gradient-to-br ${event.gradient} relative overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">
                    {event.icon}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-stone-700">
                    {event.attendees}/{event.maxAttendees} going
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                    {event.group}
                </p>
                <h3 className="font-display text-lg font-bold text-stone-800 mb-2 group-hover:text-amber-700 transition-colors">
                    {event.title}
                </h3>
                <div className="space-y-1 text-sm text-stone-500">
                    <p className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {event.date} · {event.time}
                    </p>
                    <p className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.location}
                    </p>
                </div>
            </div>
        </div>
    );
}

// =======================================================================
// Main Landing Page
// =======================================================================
export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // =======================================================================
    // Redirect logged-in users to dashboard
    // =======================================================================
    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-amber-50">
                <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Landing page for strangers
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            {/* Subtle grain texture overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-50" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }} />

            {/* Header */}
            <header className="relative z-10 flex justify-between items-center px-4 sm:px-8 lg:px-12 py-4 bg-white/80 backdrop-blur-sm border-b border-stone-200/50">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <span className="font-display text-xl font-bold text-stone-800">
                        Meet With Friends
                    </span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link
                        href="/login"
                        className="px-3 sm:px-4 py-2 text-stone-600 hover:text-stone-900 font-medium transition"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 sm:px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md"
                    >
                        Sign up
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-50 via-orange-50/50 to-stone-50" />
                <div className="absolute top-20 -left-32 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
                <div className="absolute top-40 -right-32 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />

                <div className="relative max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 lg:py-32">
                    <div className="max-w-3xl">
                        {/* Eyebrow */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-amber-200/50 shadow-sm mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-stone-600">A simpler way to make plans</span>
                        </div>

                        {/* Headline */}
                        <h1 className={`font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 leading-[1.1] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            Real friends.
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-400">
                                Real plans.
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className={`text-lg sm:text-xl text-stone-600 mb-8 max-w-xl leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            The simple way to organise your group. Whether it's dinner, a hike, game night, or coffee — bring your people together without the group chat chaos.
                        </p>

                        {/* CTA Buttons */}
                        <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <Link
                                href="/register"
                                className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] text-center flex items-center justify-center gap-2"
                            >
                                Start Your Group
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                            <Link
                                href="/events"
                                className="px-8 py-4 bg-white text-stone-700 text-lg font-semibold rounded-full border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all text-center shadow-sm"
                            >
                                Browse Events
                            </Link>
                        </div>
                    </div>

                    {/* Hero illustration - floating activity icons */}
                    <div className="hidden lg:block absolute top-1/2 right-8 -translate-y-1/2">
                        <div className="relative w-80 h-80">
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center text-4xl transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0 rotate-6' : 'opacity-0 translate-y-8'}`}>
                                🥾
                            </div>
                            <div className={`absolute top-20 right-24 w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0 -rotate-6' : 'opacity-0 translate-y-8'}`}>
                                🎱
                            </div>
                            <div className={`absolute bottom-20 right-8 w-28 h-28 bg-white rounded-2xl shadow-lg flex items-center justify-center text-5xl transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0 rotate-3' : 'opacity-0 translate-y-8'}`}>
                                🍽️
                            </div>
                            <div className={`absolute bottom-0 right-32 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl transition-all duration-1000 delay-900 ${mounted ? 'opacity-100 translate-y-0 -rotate-12' : 'opacity-0 translate-y-8'}`}>
                                ☕
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Proposition */}
            <section className="relative border-y border-stone-200 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
                    <p className="text-center text-stone-600 text-lg">
                        Stop losing plans in group chats. <span className="text-stone-800 font-medium">One place for your crew to organise, RSVP, and show up.</span>
                    </p>
                </div>
            </section>

            {/* Example Events */}
            <section className="py-16 sm:py-24 bg-stone-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
                        <div>
                            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                                What You Could Create
                            </h2>
                            <p className="text-stone-500">
                                From casual catch-ups to regular meetups — here are some ideas
                            </p>
                        </div>
                        <span className="text-stone-400 text-sm italic">
                            Examples
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sampleEvents.map((event, i) => (
                            <EventCard key={event.id} event={event} index={i} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-16 sm:py-24 bg-white border-t border-stone-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="text-center mb-10">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                            Start a Group For...
                        </h2>
                        <p className="text-stone-500">
                            Whatever brings your crew together
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {categories.map((cat) => (
                            <Link
                                key={cat.name}
                                href="/register"
                                className="group p-4 bg-stone-50 hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 rounded-2xl border border-stone-100 hover:border-amber-200 transition-all text-center"
                            >
                                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                    {cat.icon}
                                </div>
                                <div className="font-semibold text-stone-800 text-sm">
                                    {cat.name}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 sm:py-24 bg-gradient-to-b from-stone-50 to-amber-50/50">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="text-center mb-12">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                            How It Works
                        </h2>
                        <p className="text-stone-500">
                            From idea to invite in minutes
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                        {[
                            {
                                step: '01',
                                title: 'Create Your Group',
                                description: "Start a group for your crew — whether it's your book club, hiking buddies, or dinner regulars.",
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ),
                            },
                            {
                                step: '02',
                                title: 'Plan Events',
                                description: 'Create events with all the details. Set capacity, collect RSVPs, and handle deposits when needed.',
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                ),
                            },
                            {
                                step: '03',
                                title: 'Get Together',
                                description: "No more chasing replies in group chats. Everyone knows the plan, who's coming, and where to be.",
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ),
                            },
                        ].map((item, i) => (
                            <div key={i} className="relative">
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-600">
                                            {item.icon}
                                        </div>
                                        <span className="font-display text-4xl font-bold text-stone-200">
                                            {item.step}
                                        </span>
                                    </div>
                                    <h3 className="font-display text-xl font-bold text-stone-800 mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-stone-500 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                                {/* Connector line */}
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-8 w-8 lg:w-12 h-px bg-gradient-to-r from-amber-200 to-transparent" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 sm:py-24 bg-gradient-to-br from-amber-500 via-orange-500 to-red-400 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 text-8xl">🎯</div>
                    <div className="absolute bottom-10 right-10 text-8xl">🤝</div>
                    <div className="absolute top-1/2 left-1/3 text-6xl">✨</div>
                </div>

                <div className="relative max-w-3xl mx-auto px-4 sm:px-8 text-center">
                    <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to bring your group together?
                    </h2>
                    <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                        We're just getting started. Be one of the first to create a group and make planning effortless.
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-amber-600 text-lg font-bold rounded-full hover:bg-stone-50 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                        Get Started Free
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                    <p className="text-white/70 text-sm mt-4">
                        No credit card required
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-stone-900 text-stone-400 py-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <span className="font-display font-bold text-white">
                                    Meet With Friends
                                </span>
                            </div>
                            <p className="text-sm text-stone-500">
                                Bringing people together, one event at a time.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-3">Product</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="/events" className="hover:text-white transition">Browse Events</Link></li>
                                <li><Link href="/groups" className="hover:text-white transition">Find Groups</Link></li>
                                <li><Link href="/register" className="hover:text-white transition">Create a Group</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-3">Company</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-3">Legal</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-stone-800 text-center text-sm text-stone-500">
                        © 2025 Meet With Friends. All rights reserved.
                    </div>
                </div>
            </footer>
        </main>
    );
}
