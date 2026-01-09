'use client';

/*
=======================================================================================================================================
Dashboard Page
=======================================================================================================================================
Main dashboard for logged-in users. Shows organized groups, member groups, discover groups, and upcoming events.
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

// =======================================================================
// Group Card Component
// =======================================================================
function GroupCard({ group }: { group: MyGroup | GroupWithCount }) {
    const upcomingCount = ('upcoming_event_count' in group ? group.upcoming_event_count : 0) || 0;

    return (
        <Link
            href={`/groups/${group.id}`}
            className="bg-white rounded-lg border hover:shadow-md transition overflow-hidden"
        >
            {group.image_url ? (
                <div className="h-32 bg-gray-200">
                    <img
                        src={group.image_url}
                        alt={group.name}
                        className="w-full h-full object-cover"
                    />
                </div>
            ) : (
                <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <span className="text-4xl text-blue-400">
                        {group.name.charAt(0).toUpperCase()}
                    </span>
                </div>
            )}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                {group.description && (
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                        {group.description}
                    </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                    <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
                    {upcomingCount > 0 && (
                        <span>{upcomingCount} {upcomingCount === 1 ? 'event' : 'events'}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}

// =======================================================================
// Group Section Component
// =======================================================================
function GroupSection({
    title,
    groups,
    loading,
    emptyMessage,
    showCreateButton = false,
    maxGroups = 6,
}: {
    title: string;
    groups: (MyGroup | GroupWithCount)[];
    loading: boolean;
    emptyMessage: string;
    showCreateButton?: boolean;
    maxGroups?: number;
}) {
    if (loading) {
        return (
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="bg-white rounded-lg border p-6 text-center">
                    <p className="text-gray-500">{emptyMessage}</p>
                    {showCreateButton && (
                        <Link
                            href="/groups/create"
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-block"
                        >
                            Create Group
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    const displayedGroups = groups.slice(0, maxGroups);
    const hasMore = groups.length > maxGroups;

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {hasMore && (
                    <Link href="/groups" className="text-blue-600 hover:text-blue-700 text-sm">
                        See all
                    </Link>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedGroups.map((group) => (
                    <GroupCard key={group.id} group={group} />
                ))}
            </div>
        </div>
    );
}

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
    const [eventsLimit, setEventsLimit] = useState(6);

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
                // Split into organiser groups and member groups (no duplicates)
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
    // Fetch events data (only from groups user is a member of)
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Dashboard view
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
                {/* Groups Section */}
                <section className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Groups</h2>
                        <Link
                            href="/groups/create"
                            className="text-blue-600 hover:text-blue-700"
                        >
                            Create Group
                        </Link>
                    </div>

                    {/* Groups I Organise - only show if user organises any */}
                    {!loadingGroups && organiserGroups.length > 0 && (
                        <GroupSection
                            title="Groups I Organise"
                            groups={organiserGroups}
                            loading={loadingGroups}
                            emptyMessage=""
                        />
                    )}

                    {/* Groups I'm In - only show if user is member of any (non-organiser) */}
                    {!loadingGroups && memberGroups.length > 0 && (
                        <GroupSection
                            title="Groups I'm In"
                            groups={memberGroups}
                            loading={loadingGroups}
                            emptyMessage=""
                        />
                    )}

                    {/* Discover Groups - only show if there are groups to discover */}
                    {!loadingGroups && discoverableGroups.length > 0 && (
                        <GroupSection
                            title="Discover Groups"
                            groups={discoverableGroups}
                            loading={loadingGroups}
                            emptyMessage=""
                        />
                    )}
                </section>

                {/* Events Section - only show if user has events */}
                {!loadingEvents && events.length > 0 && (
                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {events.slice(0, eventsLimit).map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="bg-white rounded-lg border hover:shadow-md transition overflow-hidden"
                                >
                                    <div className="p-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-500 font-medium">
                                                {event.group_name}
                                            </p>
                                            {event.rsvp_status && (
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                    event.rsvp_status === 'attending'
                                                        ? 'text-green-700 bg-green-100'
                                                        : 'text-amber-700 bg-amber-100'
                                                }`}>
                                                    {event.rsvp_status === 'attending' ? 'Going' : 'Waitlist'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-sm text-blue-600 font-medium">
                                                {new Date(event.date_time).toLocaleDateString('en-GB', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {event.status === 'cancelled' && (
                                                <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                                    Cancelled
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mt-1">
                                            {event.title}
                                        </h3>
                                        {event.location && (
                                            <p className="text-gray-500 text-sm mt-1">
                                                {event.location}
                                            </p>
                                        )}
                                        {event.attendee_count !== undefined && (
                                            <p className="text-gray-400 text-sm mt-2">
                                                {event.attendee_count} attending
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {events.length > eventsLimit && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setEventsLimit(prev => prev + 6)}
                                    className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Show more
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
