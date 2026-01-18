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
import { contactSupport } from '@/lib/api/support';

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
        gradient: 'from-indigo-400 via-violet-300 to-purple-200',
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
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-slate-700">
                    {event.attendees}/{event.maxAttendees} going
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                    {event.group}
                </p>
                <h3 className="font-display text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                    {event.title}
                </h3>
                <div className="space-y-1 text-sm text-slate-500">
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
    const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
    const [contactLoading, setContactLoading] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);
    const [contactError, setContactError] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactLoading(true);
        setContactError('');

        const result = await contactSupport(contactForm.name, contactForm.email, contactForm.message);

        setContactLoading(false);

        if (result.success) {
            setContactSuccess(true);
            setContactForm({ name: '', email: '', message: '' });
        } else {
            setContactError(result.error || 'Failed to send message. Please try again.');
        }
    };

    // =======================================================================
    // Redirect logged-in users to My Events (home)
    // =======================================================================
    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/your-events');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Landing page for strangers
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-slate-50">
            {/* Subtle grain texture overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-50" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }} />

            {/* Header */}
            <header className="relative z-10 flex justify-between items-center px-4 sm:px-8 lg:px-12 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
                <Link href="/" className="font-display text-xl font-bold text-slate-800">
                    Meet With Friends
                </Link>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <Link
                        href="/login"
                        className="px-3 sm:px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition whitespace-nowrap text-sm sm:text-base"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 sm:px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm hover:shadow-md whitespace-nowrap text-sm sm:text-base"
                    >
                        Sign up
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-violet-50/50 to-slate-50" />
                <div className="absolute top-20 -left-32 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
                <div className="absolute top-40 -right-32 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl" />

                <div className="relative max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 lg:py-32">
                    <div className="max-w-3xl">
                        {/* Eyebrow */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-indigo-200/50 shadow-sm mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-slate-600">A simpler way to make plans</span>
                        </div>

                        {/* Headline */}
                        <h1 className={`font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            Real friends.
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                                Real plans.
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className={`text-lg sm:text-xl text-slate-600 mb-8 max-w-xl leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            The simple way to organise your group. Whether it's dinner, a hike, game night, or coffee — bring your people together without the group chat chaos.
                        </p>

                        {/* CTA Buttons */}
                        <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <Link
                                href="/register"
                                className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-lg font-semibold rounded-full hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] text-center flex items-center justify-center gap-2"
                            >
                                Start Your Group
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                            <Link
                                href="/events"
                                className="px-8 py-4 bg-white text-slate-700 text-lg font-semibold rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-center shadow-sm"
                            >
                                Browse Events
                            </Link>
                        </div>

                        {/* Free reassurance */}
                        <p className={`mt-4 text-sm text-slate-500 flex items-center gap-2 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Free to join · No credit card required
                        </p>

                        {/* App Store Badges */}
                        <div className={`mt-6 flex flex-wrap gap-3 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {/* Google Play Badge - using official image */}
                            <a
                                href="https://play.google.com/store/apps/details?id=com.noodev8.meetwithfriends"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-[40px] hover:opacity-80 transition-opacity"
                            >
                                <img
                                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                                    alt="Get it on Google Play"
                                    className="h-[60px] -my-[10px]"
                                />
                            </a>

                            {/* App Store Badge - using official image */}
                            <div className="h-[40px] cursor-default">
                                <img
                                    src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                                    alt="Download on the App Store"
                                    className="h-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Hero illustration - Floating Icons */}
                    <div className="hidden lg:block absolute top-1/2 right-4 xl:right-12 -translate-y-1/2 w-[400px] h-[400px]">
                        {/* Background decorative ring */}
                        <div
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-indigo-200/30 transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                            style={{ animation: mounted ? 'float-gentle 14s ease-in-out infinite' : 'none' }}
                        />

                        {/* Top card - dinner (hero piece) */}
                        <div
                            className={`absolute -top-4 right-8 w-44 h-44 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                            style={{ transitionDelay: '200ms', animation: mounted ? 'float-gentle 8s ease-in-out infinite' : 'none' }}
                        >
                            <div className="relative w-full h-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-500/10 border border-white/60 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white/50 to-violet-50/80" />
                                <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-200/40 rounded-full blur-2xl" />
                                <span className="relative text-8xl">🍽️</span>
                            </div>
                        </div>

                        {/* Left card - calendar */}
                        <div
                            className={`absolute top-24 -left-4 w-36 h-36 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                            style={{ transitionDelay: '400ms', animation: mounted ? 'float-gentle 9s ease-in-out infinite 0.5s' : 'none' }}
                        >
                            <div className="relative w-full h-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg shadow-violet-500/10 border border-white/60 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 via-white/50 to-purple-50/80" />
                                <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-violet-200/40 rounded-full blur-xl" />
                                <span className="relative text-6xl">📅</span>
                            </div>
                        </div>

                        {/* Bottom card - coffee */}
                        <div
                            className={`absolute bottom-4 right-4 w-36 h-36 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                            style={{ transitionDelay: '550ms', animation: mounted ? 'float-gentle 10s ease-in-out infinite 1s' : 'none' }}
                        >
                            <div className="relative w-full h-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg shadow-amber-500/10 border border-white/60 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-white/50 to-orange-50/60" />
                                <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-200/40 rounded-full blur-xl" />
                                <span className="relative text-6xl">☕</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Proposition */}
            <section className="relative border-y border-slate-200 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
                    <p className="text-center text-slate-600 text-lg">
                        Stop losing plans in group chats. <span className="text-slate-800 font-medium">One place for your crew to organise, RSVP, and show up.</span>
                    </p>
                </div>
            </section>

            {/* Example Events */}
            <section className="py-16 sm:py-24 bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
                        <div>
                            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                                What You Could Create
                            </h2>
                            <p className="text-slate-500">
                                From casual catch-ups to regular meetups — here are some ideas
                            </p>
                        </div>
                        <span className="text-slate-400 text-sm italic">
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
            <section className="py-16 sm:py-24 bg-white border-t border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="text-center mb-10">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                            Start a Group For...
                        </h2>
                        <p className="text-slate-500">
                            Whatever brings your crew together
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {categories.map((cat) => (
                            <Link
                                key={cat.name}
                                href="/register"
                                className="group p-4 bg-slate-50 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-violet-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all text-center"
                            >
                                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                    {cat.icon}
                                </div>
                                <div className="font-semibold text-slate-800 text-sm">
                                    {cat.name}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-indigo-50/50">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="text-center mb-12">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                            How It Works
                        </h2>
                        <p className="text-slate-500">
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
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600">
                                            {item.icon}
                                        </div>
                                        <span className="font-display text-4xl font-bold text-slate-200">
                                            {item.step}
                                        </span>
                                    </div>
                                    <h3 className="font-display text-xl font-bold text-slate-800 mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-500 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                                {/* Connector line */}
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-8 w-8 lg:w-12 h-px bg-gradient-to-r from-indigo-200 to-transparent" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Human Support Section */}
            <section id="support" className="py-16 sm:py-24 bg-white border-t border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left side - Message */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200 mb-6">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <span className="text-sm font-medium text-emerald-700">Real humans, real help</span>
                            </div>
                            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-[1.1]">
                                Real people.
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600">
                                    Real support.
                                </span>
                            </h2>
                            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                                Tired of chatbots and endless FAQs? We get it. When you need help, you&apos;ll hear back from a real person within 24 hours. No tickets, no queues, no frustration.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-700">
                                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>Response within 24 hours</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-700">
                                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>UK-based team</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-700">
                                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>No chatbots, just humans</span>
                                </div>
                            </div>
                        </div>

                        {/* Right side - Contact Form */}
                        <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200">
                            <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
                                Send us a message
                            </h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Question, feedback, or just want to say hi? We&apos;d love to hear from you.
                            </p>

                            {contactSuccess ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h4 className="font-semibold text-emerald-800 mb-2">Message Sent!</h4>
                                    <p className="text-emerald-700 text-sm">
                                        Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                                    </p>
                                    <button
                                        onClick={() => setContactSuccess(false)}
                                        className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 underline"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="landing-name" className="block text-sm font-medium text-slate-700 mb-1">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                id="landing-name"
                                                required
                                                minLength={2}
                                                maxLength={100}
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                                placeholder="Your name"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="landing-email" className="block text-sm font-medium text-slate-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="landing-email"
                                                required
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                                placeholder="you@example.com"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="landing-message" className="block text-sm font-medium text-slate-700 mb-1">
                                            Message
                                        </label>
                                        <textarea
                                            id="landing-message"
                                            required
                                            rows={3}
                                            minLength={10}
                                            maxLength={1000}
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            placeholder="How can we help?"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
                                        />
                                    </div>

                                    {contactError && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                                            {contactError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={contactLoading}
                                        className="w-full bg-slate-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {contactLoading ? 'Sending...' : 'Send Message'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 relative overflow-hidden">
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
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 text-lg font-bold rounded-full hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
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
            <footer className="bg-slate-900 text-slate-400 py-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <span className="font-display font-bold text-white">
                                    Meet With Friends
                                </span>
                            </div>
                            <p className="text-sm text-slate-500">
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
                            <h4 className="font-semibold text-white mb-3">Support</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="/help" className="hover:text-white transition">Help Center</Link></li>
                                <li><a href="#support" className="hover:text-white transition">Contact Us</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-3">Legal</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
                        © 2025 Meet With Friends. All rights reserved.
                    </div>
                </div>
            </footer>
        </main>
    );
}
