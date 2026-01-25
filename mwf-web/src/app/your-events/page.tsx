'use client';

/*
=======================================================================================================================================
Home Dashboard (My Events Page)
=======================================================================================================================================
Primary landing screen for logged-in users. Dashboard approach showing:
- Greeting with event count
- My Events section (committed events)
- My Groups section (groups user belongs to)
- Discover Groups section (groups to join)
See USER-FLOW.md for design rationale.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyRsvps, EventWithDetails } from '@/lib/api/events';
import { getMyGroups, discoverGroups, joinGroup, MyGroup, GroupWithCount } from '@/lib/api/groups';
import SidebarLayout from '@/components/layout/SidebarLayout';
import EventCard from '@/components/ui/EventCard';
import { getGroupTheme, getGroupInitials } from '@/lib/groupThemes';

const MAX_EVENTS_PREVIEW = 4;
const MAX_GROUPS_PREVIEW = 4;
const MAX_DISCOVER_PREVIEW = 4;

export default function MyEventsPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [groups, setGroups] = useState<MyGroup[]>([]);
    const [discoverableGroups, setDiscoverableGroups] = useState<GroupWithCount[]>([]);
    const [loading, setLoading] = useState(true);

    // =======================================================================
    // Redirect to landing if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/');
        }
    }, [user, isLoading, router]);

    // =======================================================================
    // Fetch all dashboard data in parallel
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (!token) return;

            const [eventsResult, groupsResult, discoverResult] = await Promise.all([
                getMyRsvps(token),
                getMyGroups(token),
                discoverGroups(token),
            ]);

            if (eventsResult.success && eventsResult.data) {
                setEvents(eventsResult.data);
            }
            if (groupsResult.success && groupsResult.data) {
                setGroups(groupsResult.data);
            }
            if (discoverResult.success && discoverResult.data) {
                setDiscoverableGroups(discoverResult.data);
            }
            setLoading(false);
        }

        if (user && token) {
            fetchData();
        }
    }, [user, token]);

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading || !user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-4">Loading...</p>
            </main>
        );
    }

    const firstName = user.name?.split(' ')[0] || 'there';
    const hasMoreEvents = events.length > MAX_EVENTS_PREVIEW;
    const hasMoreGroups = groups.length > MAX_GROUPS_PREVIEW;
    const displayEvents = hasMoreEvents ? events.slice(0, MAX_EVENTS_PREVIEW) : events;
    const displayGroups = hasMoreGroups ? groups.slice(0, MAX_GROUPS_PREVIEW) : groups;
    const displayDiscover = discoverableGroups.slice(0, MAX_DISCOVER_PREVIEW);

    // New user = no groups yet
    const isNewUser = !loading && groups.length === 0;

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 mt-4">Loading...</p>
                    </div>
                ) : isNewUser ? (
                    /* ============================================================
                       Welcome state for new users (no groups yet)
                       ============================================================ */
                    <div className="py-4 sm:py-8">
                        {/* Welcome message */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 mb-4">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mb-2">
                                Welcome, {firstName}!
                            </h1>
                            <p className="text-slate-500">
                                {discoverableGroups.length > 0
                                    ? 'Join a group below to see events and connect with others.'
                                    : 'Create a group to start organizing events with friends.'}
                            </p>
                        </div>

                        {/* Groups to Join */}
                        {discoverableGroups.length > 0 && (
                            <section className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-800">
                                        Groups to Join
                                        <span className="ml-2 text-slate-400 font-normal">{discoverableGroups.length}</span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {discoverableGroups.map(group => (
                                        <DiscoverGroupCard
                                            key={group.id}
                                            group={group}
                                            token={token!}
                                            onJoined={() => setDiscoverableGroups(prev => prev.filter(g => g.id !== group.id))}
                                        />
                                    ))}
                                </div>

                                {/* Secondary CTA */}
                                <div className="text-center mt-6">
                                    <Link
                                        href="/groups/create"
                                        className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Or create your own group
                                    </Link>
                                </div>
                            </section>
                        )}

                        {/* No groups to discover - show create CTA */}
                        {discoverableGroups.length === 0 && (
                            <div className="text-center">
                                <Link
                                    href="/groups/create"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-full transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create a Group
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ============================================================
                       Normal dashboard for users with groups
                       ============================================================ */
                    <>
                        {/* Greeting */}
                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                                Hello, {firstName}!
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {events.length === 0
                                    ? 'No events yet'
                                    : `${events.length} event${events.length === 1 ? '' : 's'} coming up`}
                            </p>
                        </div>

                        {/* My Events Section */}
                        <section className="mb-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800">My Events</h2>
                                {hasMoreEvents && (
                                    <Link
                                        href="/your-events/all"
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        View all
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                )}
                            </div>

                            {events.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                                    <div className="text-5xl mb-3">📅</div>
                                    <h3 className="text-lg font-semibold text-slate-800">No upcoming events</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {displayEvents.map(event => (
                                        <EventCard key={event.id} event={event} from="your-events" />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* My Groups Section */}
                        <section className="mb-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800">My Groups</h2>
                                {hasMoreGroups && (
                                    <Link
                                        href="/my-groups"
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        See all
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {displayGroups.map(group => (
                                    <GroupCard key={group.id} group={group} />
                                ))}
                            </div>
                        </section>

                        {/* Discover Groups Section */}
                        {displayDiscover.length > 0 && (
                            <section className="mb-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-800">Discover Groups</h2>
                                    <Link
                                        href="/explore"
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        See more
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {displayDiscover.map(group => (
                                        <DiscoverGroupCard
                                            key={group.id}
                                            group={group}
                                            token={token!}
                                            onJoined={() => setDiscoverableGroups(prev => prev.filter(g => g.id !== group.id))}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </SidebarLayout>
    );
}

// =======================================================================
// Group Card Component (for user's groups)
// =======================================================================
function GroupCard({ group }: { group: MyGroup }) {
    const theme = getGroupTheme(group.theme_color);
    const eventCount = group.upcoming_event_count || 0;

    return (
        <Link
            href={`/groups/${group.id}`}
            className="group bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradientLight} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-lg font-bold ${theme.textColor}`}>
                        {getGroupInitials(group.name)}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                            {group.name}
                        </h3>
                        {(group.role === 'organiser' || group.role === 'host') && (
                            <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${
                                group.role === 'organiser'
                                    ? 'bg-indigo-100 text-indigo-600'
                                    : 'bg-amber-100 text-amber-600'
                            }`}>
                                {group.role === 'organiser' ? 'Organiser' : 'Host'}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                        {eventCount > 0 && ` · ${eventCount} ${eventCount === 1 ? 'event' : 'events'}`}
                    </p>
                </div>
            </div>
        </Link>
    );
}

// =======================================================================
// Discover Group Card Component (with Join button)
// =======================================================================
function DiscoverGroupCard({ group, token, onJoined }: { group: GroupWithCount; token: string; onJoined: () => void }) {
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    const theme = getGroupTheme(group.theme_color);

    const handleJoin = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsJoining(true);
        const result = await joinGroup(token, group.id);
        setIsJoining(false);

        if (result.success && result.data) {
            onJoined();
            if (result.data.status === 'active') {
                router.push(`/groups/${group.id}`);
            }
        }
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradientLight} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-lg font-bold ${theme.textColor}`}>
                        {getGroupInitials(group.name)}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">
                        {group.name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                    </p>
                </div>
                <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="flex-shrink-0 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-full transition-colors"
                >
                    {isJoining ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : (
                        'Join'
                    )}
                </button>
            </div>
        </div>
    );
}
