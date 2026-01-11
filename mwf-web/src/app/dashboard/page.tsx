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
import SidebarLayout from '@/components/layout/SidebarLayout';

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
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 mb-6">
                    <span className="text-4xl">👋</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
                    Welcome, {firstName}!
                </h1>
                <p className="text-lg text-slate-600 max-w-md mx-auto">
                    {discoverableGroups.length > 0
                        ? "Join an existing group or create your own to get started."
                        : "Ready to bring your crew together? Start by creating your first group."
                    }
                </p>

                {/* Primary CTA */}
                <Link
                    href="/groups/create"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-lg font-semibold rounded-full hover:from-indigo-600 hover:to-violet-600 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] mt-6"
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
                        <h2 className="font-display text-xl font-bold text-slate-800">
                            Groups to Join
                            <span className="ml-2 text-slate-400 font-normal text-lg">{discoverableGroups.length}</span>
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
                                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-stone-700 font-medium rounded-full hover:bg-slate-50 transition"
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
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-left">
                    <h2 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How it works
                    </h2>
                    <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <span className="text-indigo-600 font-bold text-sm">1</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-800 text-sm">Join or create a group</h3>
                                <p className="text-slate-500 text-sm mt-0.5">For your dinner club, hiking crew, or any regular meetup</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <span className="text-indigo-600 font-bold text-sm">2</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-800 text-sm">Invite your people</h3>
                                <p className="text-slate-500 text-sm mt-0.5">Share the link and they can join instantly</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <span className="text-indigo-600 font-bold text-sm">3</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-800 text-sm">Plan events together</h3>
                                <p className="text-slate-500 text-sm mt-0.5">Create events, collect RSVPs, and actually meet up</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =======================================================================
// Group Card Component (larger - for discover section)
// =======================================================================
function GroupCard({ group }: { group: MyGroup | GroupWithCount }) {
    const upcomingCount = ('upcoming_event_count' in group ? group.upcoming_event_count : 0) || 0;
    const memberCount = group.member_count || 0;

    return (
        <Link
            href={`/groups/${group.id}`}
            className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
        >
            {/* Header: Icon + Name */}
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-indigo-600">
                        {group.name.charAt(0).toUpperCase()}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {group.name}
                    </h3>
                    {upcomingCount > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-600 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {upcomingCount} upcoming
                        </span>
                    )}
                </div>
            </div>

            {/* Footer: Member count */}
            <div className="flex items-center pt-4 border-t border-slate-100">
                <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-500">
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
            </div>
        </Link>
    );
}

// =======================================================================
// Event Card Component - Compact style inspired by modern dashboards
// =======================================================================
function EventCard({ event }: { event: EventWithDetails }) {
    const isFull = event.capacity != null && (event.attendee_count || 0) >= event.capacity;
    const attendeeCount = event.attendee_count || 0;

    return (
        <Link
            href={`/events/${event.id}`}
            className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
        >
            {/* Header: Category badge + status badges */}
            <div className="flex justify-between items-start mb-3">
                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                    {event.group_name}
                </span>
                <div className="flex gap-1.5">
                    {/* Status badges */}
                    {(event.rsvp_status === 'attending' || event.rsvp_status === 'waitlist') && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            event.rsvp_status === 'attending'
                                ? 'text-green-700 bg-green-100'
                                : 'text-violet-700 bg-violet-100'
                        }`}>
                            {event.rsvp_status === 'attending' ? 'Going' : 'Waitlist'}
                        </span>
                    )}
                    {event.status === 'cancelled' && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                            Cancelled
                        </span>
                    )}
                    {isFull && event.status !== 'cancelled' && event.rsvp_status !== 'attending' && event.rsvp_status !== 'waitlist' && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
                            Waitlist open
                        </span>
                    )}
                </div>
            </div>

            {/* Title */}
            <h4 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                {event.title}
            </h4>

            {/* Date & Time */}
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(event.date_time).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                })}, {new Date(event.date_time).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>

            {/* Location */}
            {event.location && (
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-4 line-clamp-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                </div>
            )}

            {/* Footer: Attendee count */}
            <div className="flex items-center pt-4 border-t border-slate-100">
                <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-500">
                    {attendeeCount} going
                    {event.capacity && event.capacity > attendeeCount && (
                        <span className="text-slate-400 ml-2">· {event.capacity - attendeeCount} spots left</span>
                    )}
                </span>
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
            <h2 className="font-display text-xl font-bold text-slate-800">{title}</h2>
            {action && actionHref && (
                <Link
                    href={actionHref}
                    className="text-indigo-600 hover:text-indigo-600 font-medium text-sm flex items-center gap-1 group"
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
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
        <SidebarLayout>
            <div className="px-4 lg:px-8 py-6 sm:py-8 max-w-6xl w-full">
                {/* Loading state */}
                {loadingGroups ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : isEmptyState ? (
                    /* Empty state for new users */
                    <EmptyState userName={user.name} discoverableGroups={discoverableGroups} GroupCard={GroupCard} />
                ) : (
                    /* Dashboard with content - Two column layout */
                    <>
                        {/* Header: Welcome + New Event button */}
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                                    Hello, {user.name.split(' ')[0]}!
                                </h1>
                                <p className="text-slate-500 mt-1">
                                    {events.length > 0
                                        ? `You have ${events.length} event${events.length === 1 ? '' : 's'} coming up.`
                                        : "Here's what's happening with your groups"}
                                </p>
                            </div>
                            <Link
                                href="/groups/create"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Group
                            </Link>
                        </div>

                        {/* Two column grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left Column: Events */}
                            <div className="lg:col-span-8 space-y-8">
                                {/* Upcoming Events */}
                                <section>
                                    <SectionHeader
                                        title="Upcoming Events"
                                        action="View all"
                                        actionHref="/your-events"
                                    />
                                    {!loadingEvents && events.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {events.slice(0, 4).map((event) => (
                                                <EventCard key={event.id} event={event} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-600 font-medium">No upcoming events</p>
                                            <p className="text-slate-500 text-sm mt-1">Check your groups for new events</p>
                                        </div>
                                    )}
                                </section>

                                {/* Discover Groups - only show if there are discoverable groups */}
                                {discoverableGroups.length > 0 && (
                                    <section>
                                        <SectionHeader
                                            title="Discover Groups"
                                            action="Browse all"
                                            actionHref="/groups"
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {discoverableGroups.slice(0, 2).map((group) => (
                                                <GroupCard key={group.id} group={group} />
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Right Column: Sidebar */}
                            <div className="lg:col-span-4 space-y-6">
                                {/* Your Groups */}
                                <section>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Your Groups</h3>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                        {/* Combine groups with role tracking - organisers first */}
                                        {[
                                            ...organiserGroups.map(g => ({ ...g, role: 'organiser' as const })),
                                            ...memberGroups.map(g => ({ ...g, role: 'member' as const }))
                                        ].slice(0, 4).map((group) => (
                                            <Link
                                                key={group.id}
                                                href={`/groups/${group.id}`}
                                                className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-200 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-bold text-indigo-600">
                                                        {group.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                            {group.name}
                                                        </p>
                                                        {group.role === 'organiser' && (
                                                            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-600 rounded">
                                                                Organiser
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        {group.member_count} members
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                        <Link
                                            href="/my-groups"
                                            className="block w-full py-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors text-center mt-2"
                                        >
                                            See All Groups
                                        </Link>
                                    </div>
                                </section>

                                {/* CTA Card - Create Event */}
                                {organiserGroups.length > 0 && (
                                    <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="font-bold text-xl mb-2">+ New Event</h3>
                                            <p className="text-indigo-100 text-sm mb-5 leading-relaxed">
                                                Plan your next dinner, coffee meetup, or group activity.
                                            </p>
                                            <Link
                                                href={`/groups/${organiserGroups[0].id}/events/create`}
                                                className="inline-block bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
                                            >
                                                Get Started
                                            </Link>
                                        </div>
                                        {/* Decorative circles */}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
                                        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-black/10 rounded-full"></div>
                                    </section>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </SidebarLayout>
    );
}
