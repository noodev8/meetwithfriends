'use client';

/*
=======================================================================================================================================
Dashboard Page
=======================================================================================================================================
Main dashboard for logged-in users. Shows organized groups, member groups, discover groups, and upcoming events.
Features warm onboarding for new users with no groups yet.
Redirects to landing page if not authenticated.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyGroups, discoverGroups, MyGroup, GroupWithCount } from '@/lib/api/groups';
import { getMyEvents, EventWithDetails } from '@/lib/api/events';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// =======================================================================
// Empty State Component - Warm onboarding for new users
// =======================================================================
function EmptyState({ userName, discoverableGroups, GroupCard }: {
    userName: string;
    discoverableGroups: GroupWithCount[];
    GroupCard: React.ComponentType<{ group: GroupWithCount }>;
}) {
    const firstName = userName.split(' ')[0];
    const [showAll, setShowAll] = useState(false);
    const INITIAL_SHOW = 6;
    const groupsToShow = showAll ? discoverableGroups : discoverableGroups.slice(0, INITIAL_SHOW);
    const hasMoreGroups = discoverableGroups.length > INITIAL_SHOW;

    return (
        <div className="py-8 sm:py-12">
            {/* Welcome message */}
            <div className="max-w-2xl mx-auto text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 mb-6">
                    <span className="text-4xl">👋</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-800 mb-3">
                    Welcome, {firstName}!
                </h1>
                <p className="text-lg text-stone-600 max-w-md mx-auto">
                    {discoverableGroups.length > 0
                        ? "Join an existing group or create your own to get started."
                        : "Ready to bring your crew together? Start by creating your first group."
                    }
                </p>

                {/* Primary CTA */}
                <Link
                    href="/groups/create"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] mt-6"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create a Group
                </Link>
            </div>

            {/* Discover Groups Section */}
            {discoverableGroups.length > 0 && (
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="font-display text-xl font-bold text-stone-800">
                            Groups to Join
                            <span className="ml-2 text-stone-400 font-normal text-lg">{discoverableGroups.length}</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupsToShow.map((group) => (
                            <GroupCard key={group.id} group={group} />
                        ))}
                    </div>
                    {hasMoreGroups && !showAll && (
                        <div className="text-center mt-6">
                            <button
                                onClick={() => setShowAll(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 border border-stone-300 text-stone-700 font-medium rounded-full hover:bg-stone-50 transition"
                            >
                                Show more groups
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Quick tips */}
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 text-left">
                    <h2 className="font-display text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How it works
                    </h2>
                    <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <span className="text-amber-600 font-bold text-sm">1</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-stone-800 text-sm">Join or create a group</h3>
                                <p className="text-stone-500 text-sm mt-0.5">For your dinner club, hiking crew, or any regular meetup</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <span className="text-amber-600 font-bold text-sm">2</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-stone-800 text-sm">Invite your people</h3>
                                <p className="text-stone-500 text-sm mt-0.5">Share the link and they can join instantly</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <span className="text-amber-600 font-bold text-sm">3</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-stone-800 text-sm">Plan events together</h3>
                                <p className="text-stone-500 text-sm mt-0.5">Create events, collect RSVPs, and actually meet up</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =======================================================================
// Compact Group Thumbnail Component - for dashboard header
// =======================================================================
function CompactGroupCard({ group }: { group: MyGroup | GroupWithCount }) {
    const upcomingCount = ('upcoming_event_count' in group ? group.upcoming_event_count : 0) || 0;

    return (
        <Link
            href={`/groups/${group.id}`}
            className="group flex-shrink-0 w-28 bg-white rounded-lg border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all duration-200 overflow-hidden"
        >
            {/* Image */}
            <div className="relative h-14">
                {group.image_url ? (
                    <img
                        src={group.image_url}
                        alt={group.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                        <span className="text-lg font-bold text-amber-600">
                            {group.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
            {/* Info */}
            <div className="px-2 py-1.5">
                <h3 className="font-medium text-stone-800 text-xs truncate group-hover:text-amber-700 transition-colors">
                    {group.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-stone-400">
                    <span className="flex items-center gap-0.5">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {group.member_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {upcomingCount}
                    </span>
                </div>
            </div>
        </Link>
    );
}

// =======================================================================
// Group Card Component (larger - for discover section)
// =======================================================================
function GroupCard({ group }: { group: MyGroup | GroupWithCount }) {
    const upcomingCount = ('upcoming_event_count' in group ? group.upcoming_event_count : 0) || 0;

    return (
        <Link
            href={`/groups/${group.id}`}
            className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
        >
            {group.image_url ? (
                <div className="h-32 bg-stone-100">
                    <img
                        src={group.image_url}
                        alt={group.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            ) : (
                <div className="h-32 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                    <span className="text-4xl text-amber-300 group-hover:scale-110 transition-transform">
                        {group.name.charAt(0).toUpperCase()}
                    </span>
                </div>
            )}
            <div className="p-4">
                <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">{group.name}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-stone-400">
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {group.member_count}
                    </span>
                    {upcomingCount > 0 && (
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {upcomingCount} upcoming
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

// =======================================================================
// Event Card Component
// =======================================================================
function EventCard({ event }: { event: EventWithDetails }) {
    // Use event image, fall back to group image
    const imageUrl = event.image_url || event.group_image_url;
    const isFull = event.capacity != null && (event.attendee_count || 0) >= event.capacity;

    return (
        <Link
            href={`/events/${event.id}`}
            className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
        >
            {/* Image header */}
            <div className="relative h-36 bg-stone-100">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        style={{ objectPosition: event.image_url ? (event.image_position || 'center') : 'center' }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        <svg className="w-10 h-10 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* Status badge overlay - only show for attending or waitlist, not for not_going */}
                {(event.rsvp_status === 'attending' || event.rsvp_status === 'waitlist') && (
                    <span className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${
                        event.rsvp_status === 'attending'
                            ? 'text-green-800 bg-green-100'
                            : 'text-amber-800 bg-amber-100'
                    }`}>
                        {event.rsvp_status === 'attending' ? 'Going' : 'On waitlist'}
                    </span>
                )}

                {event.status === 'cancelled' && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full shadow-sm">
                        Cancelled
                    </span>
                )}

                {/* Full badge - top right */}
                {isFull && event.status !== 'cancelled' && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full shadow-sm">
                        Full
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                    {event.group_name}
                </p>

                <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                    {event.title}
                </h3>

                <p className="text-sm text-stone-500 mt-1">
                    {new Date(event.date_time).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                    })} · {new Date(event.date_time).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>

                {event.location && (
                    <p className="text-stone-500 text-sm mt-1 flex items-center gap-1.5 line-clamp-1">
                        <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.location}
                    </p>
                )}

                <p className="text-stone-400 text-sm mt-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {event.attendee_count || 0} attending
                </p>
            </div>
        </Link>
    );
}

// =======================================================================
// Section Header Component
// =======================================================================
function SectionHeader({
    title,
    action,
    actionHref
}: {
    title: string;
    action?: string;
    actionHref?: string;
}) {
    return (
        <div className="flex justify-between items-center mb-5">
            <h2 className="font-display text-xl font-bold text-stone-800">{title}</h2>
            {action && actionHref && (
                <Link
                    href={actionHref}
                    className="text-amber-600 hover:text-amber-700 font-medium text-sm flex items-center gap-1 group"
                >
                    {action}
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            )}
        </div>
    );
}

// =======================================================================
// Main Dashboard Component
// =======================================================================
export default function Dashboard() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();

    // Groups state
    const [organiserGroups, setOrganiserGroups] = useState<MyGroup[]>([]);
    const [memberGroups, setMemberGroups] = useState<MyGroup[]>([]);
    const [discoverableGroups, setDiscoverableGroups] = useState<GroupWithCount[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);

    // Events state
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    // =======================================================================
    // Redirect to landing if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Fetch groups data
    // =======================================================================
    useEffect(() => {
        async function fetchGroups() {
            if (!token) return;

            const [myGroupsResult, discoverResult] = await Promise.all([
                getMyGroups(token),
                discoverGroups(token)
            ]);

            if (myGroupsResult.success && myGroupsResult.data) {
                const organised = myGroupsResult.data.filter(g => g.role === 'organiser');
                const memberOf = myGroupsResult.data.filter(g => g.role !== 'organiser');
                setOrganiserGroups(organised);
                setMemberGroups(memberOf);
            }

            if (discoverResult.success && discoverResult.data) {
                setDiscoverableGroups(discoverResult.data);
            }

            setLoadingGroups(false);
        }

        if (user && token) {
            fetchGroups();
        }
    }, [user, token]);

    // =======================================================================
    // Fetch events data
    // =======================================================================
    useEffect(() => {
        async function fetchEvents() {
            if (!token) return;

            const eventsResult = await getMyEvents(token);

            if (eventsResult.success && eventsResult.data) {
                setEvents(eventsResult.data);
            }

            setLoadingEvents(false);
        }

        if (user && token) {
            fetchEvents();
        }
    }, [user, token]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || !user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </main>
        );
    }

    // Check if user has any groups
    const hasGroups = organiserGroups.length > 0 || memberGroups.length > 0;
    const isEmptyState = !loadingGroups && !hasGroups;

    // =======================================================================
    // Dashboard view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                {/* Loading state */}
                {loadingGroups ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                    </div>
                ) : isEmptyState ? (
                    /* Empty state for new users */
                    <EmptyState userName={user.name} discoverableGroups={discoverableGroups} GroupCard={GroupCard} />
                ) : (
                    /* Dashboard with content */
                    <>
                        {/* Welcome back message */}
                        <div className="mb-6">
                            <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-800">
                                Welcome back, {user.name.split(' ')[0]}
                            </h1>
                            <p className="text-stone-500 mt-1">Here's what's happening with your groups</p>
                        </div>

                        {/* Your Groups - Compact thumbnails */}
                        <section className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="font-display text-sm font-semibold text-stone-500 uppercase tracking-wide">Your Groups</h2>
                                <Link
                                    href="/groups/create"
                                    className="text-amber-600 hover:text-amber-700 font-medium text-sm flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Group
                                </Link>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-8 sm:px-8 scrollbar-hide">
                                {[...organiserGroups, ...memberGroups].map((group) => (
                                    <CompactGroupCard key={group.id} group={group} />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
                                <Link
                                    href="/my-groups"
                                    className="text-stone-500 hover:text-amber-600 transition flex items-center gap-1"
                                >
                                    Your groups
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                                <Link
                                    href="/groups"
                                    className="text-stone-500 hover:text-amber-600 transition flex items-center gap-1"
                                >
                                    All groups
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        </section>

                        {/* Upcoming Events */}
                        {!loadingEvents && events.length > 0 && (
                            <section className="mb-10">
                                <SectionHeader
                                    title="Upcoming Events"
                                    action="View all"
                                    actionHref="/your-events"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.slice(0, 6).map((event) => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* No events message */}
                        {!loadingEvents && events.length === 0 && (
                            <section className="mb-10">
                                <SectionHeader title="Upcoming Events" />
                                <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-stone-600 font-medium">No upcoming events</p>
                                    <p className="text-stone-500 text-sm mt-1">Check your groups for new events</p>
                                </div>
                            </section>
                        )}

                        {/* Discover Groups */}
                        {discoverableGroups.length > 0 && (
                            <section className="mb-10">
                                <SectionHeader
                                    title="Discover Groups"
                                    action="Browse all"
                                    actionHref="/groups"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {discoverableGroups.slice(0, 3).map((group) => (
                                        <GroupCard key={group.id} group={group} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Quick action if no events yet but has groups */}
                        {events.length === 0 && hasGroups && (
                            <section className="mb-10">
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6 sm:p-8 text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm mb-4">
                                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-display text-lg font-semibold text-stone-800 mb-2">
                                        No upcoming events yet
                                    </h3>
                                    <p className="text-stone-600 mb-4 max-w-md mx-auto">
                                        Get your group together! Create an event and start collecting RSVPs.
                                    </p>
                                    {organiserGroups.length > 0 && (
                                        <Link
                                            href={`/groups/${organiserGroups[0].id}/events/create`}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Create Event
                                        </Link>
                                    )}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            <Footer />
        </main>
    );
}
