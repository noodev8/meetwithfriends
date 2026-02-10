'use client';

/*
=======================================================================================================================================
Event Order Page
=======================================================================================================================================
Dedicated page for placing/editing a food pre-order for an event.
Guards: must be logged in, preorders must be enabled, cutoff must not have passed (for editing).
Menu is viewable without RSVP; placing an order requires RSVP.
Also hosts the "View Orders" summary modal with copy, PDF download, and host per-attendee editing.
=======================================================================================================================================
*/

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getEvent,
    getAttendees,
    getHosts,
    submitOrder,
    updateOrder,
    rsvpEvent,
    sendPreorderReminder,
    EventWithDetails,
    RsvpStatus,
    Attendee,
} from '@/lib/api/events';
import { EventHost } from '@/types';
import SidebarLayout from '@/components/layout/SidebarLayout';

export default function EventOrderPage() {
    const { user, token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [foodOrder, setFoodOrder] = useState('');
    const [dietaryNotes, setDietaryNotes] = useState('');
    const [orderLoading, setOrderLoading] = useState(false);

    // Attendee/host data for order summary
    const [attending, setAttending] = useState<Attendee[]>([]);
    const [hosts, setHosts] = useState<EventHost[]>([]);

    // Permission flags
    const [canManageAttendees, setCanManageAttendees] = useState(false);
    const [isGroupMember, setIsGroupMember] = useState(false);

    // Order summary modal state
    const [showOrderSummary, setShowOrderSummary] = useState(false);
    const [copiedOrders, setCopiedOrders] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Pre-order reminder state
    const [reminderSending, setReminderSending] = useState(false);
    const [reminderSent, setReminderSent] = useState(false);

    // Host order editing state
    const [editingAttendeeId, setEditingAttendeeId] = useState<number | null>(null);
    const [editFoodOrder, setEditFoodOrder] = useState('');
    const [editDietaryNotes, setEditDietaryNotes] = useState('');
    const [orderSaving, setOrderSaving] = useState(false);

    // RSVP state
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const orderFormRef = useRef<HTMLDivElement>(null);
    const foodOrderInputRef = useRef<HTMLTextAreaElement>(null);

    // =======================================================================
    // Fetch event details, attendees, and hosts
    // =======================================================================
    useEffect(() => {
        async function fetchData() {
            if (authLoading) return;

            if (!params.id) {
                setError('Event not found');
                setLoading(false);
                return;
            }

            if (!token) {
                router.push('/login');
                return;
            }

            const eventId = Number(params.id);

            const [eventResult, attendeesResult, hostsResult] = await Promise.all([
                getEvent(eventId, token),
                getAttendees(eventId, token),
                getHosts(eventId),
            ]);

            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
                setRsvp(eventResult.data.rsvp);
                setFoodOrder(eventResult.data.rsvp?.food_order || '');
                setDietaryNotes(eventResult.data.rsvp?.dietary_notes || '');
                setCanManageAttendees(eventResult.data.can_edit);
                setIsGroupMember(eventResult.data.is_group_member);
            } else {
                setError(eventResult.error || 'Event not found');
            }

            if (attendeesResult.success && attendeesResult.data) {
                setAttending(attendeesResult.data.attending);
            }

            if (hostsResult.success && hostsResult.data) {
                setHosts(hostsResult.data);
            }

            setLoading(false);
        }
        fetchData();
    }, [params.id, token, authLoading, router]);

    // =======================================================================
    // Check if preorder cutoff has passed
    // =======================================================================
    const isCutoffPassed = event?.preorder_cutoff
        ? new Date(event.preorder_cutoff) < new Date()
        : false;

    const isPastEvent = event ? new Date(event.date_time).getTime() + 4 * 60 * 60 * 1000 < Date.now() : false;

    // =======================================================================
    // Capacity and waitlist logic
    // =======================================================================
    const totalSpotsUsed = (event?.attendee_count || 0) + (event?.total_guest_count || 0);
    const spotsRemaining = event?.capacity ? event.capacity - totalSpotsUsed : null;
    const isEventFull = spotsRemaining !== null && spotsRemaining <= 0;
    const canJoinWaitlist = isEventFull && event?.waitlist_enabled !== false;

    // =======================================================================
    // Handle RSVP from order page
    // =======================================================================
    const handleRsvp = async () => {
        if (!token || !event) return;
        setRsvpLoading(true);
        const result = await rsvpEvent(token, event.id, 'join', 0);
        setRsvpLoading(false);

        if (result.success && result.data) {
            setRsvp(result.data.rsvp);
            // Refresh event data for updated counts
            const eventResult = await getEvent(event.id, token);
            if (eventResult.success && eventResult.data) {
                setEvent(eventResult.data.event);
            }
            // If confirmed (not waitlisted), scroll to order form and focus input
            if (result.data.rsvp?.status === 'attending') {
                setTimeout(() => {
                    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Focus the textarea after scroll animation
                    setTimeout(() => {
                        foodOrderInputRef.current?.focus();
                    }, 400);
                }, 100);
            }
        } else {
            alert(result.error || 'Failed to RSVP');
        }
    };

    // =======================================================================
    // Handle submit order
    // =======================================================================
    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !event) return;

        setOrderLoading(true);
        const result = await submitOrder(token, event.id, foodOrder.trim() || null, dietaryNotes.trim() || null);
        setOrderLoading(false);

        if (result.success) {
            router.push(`/events/${event.id}`);
        } else {
            alert(result.error || 'Failed to submit order');
        }
    };

    // =======================================================================
    // Format date/time
    // =======================================================================
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }),
            time: date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        };
    };

    // =======================================================================
    // Generate formatted order summary text
    // =======================================================================
    const generateOrderSummary = () => {
        const lines: string[] = [];

        if (event?.group_name) {
            lines.push(event.group_name);
        }
        if (hosts.length > 0) {
            lines.push(`Host: ${hosts[0].name}`);
        }
        lines.push(event?.title || 'Event');
        if (event?.date_time) {
            const { date, time } = formatDateTime(event.date_time);
            lines.push(`${date} at ${time}`);
        }
        if (event?.location) {
            lines.push(event.location);
        }
        lines.push('');
        lines.push(`--- Orders (${attending.length} guests) ---`);
        lines.push('');

        attending.forEach((person) => {
            lines.push(`\u2014 ${person.name}`);
            if (person.food_order) {
                lines.push(person.food_order);
            } else {
                lines.push('No order submitted');
            }
            if (person.dietary_notes) {
                lines.push(`Notes: ${person.dietary_notes}`);
            }
            lines.push('');
        });

        lines.push('---');
        lines.push('Powered by meetwithfriends.net');

        return lines.join('\n').trim();
    };

    // =======================================================================
    // Copy orders to clipboard
    // =======================================================================
    const handleCopyOrders = async () => {
        const text = generateOrderSummary();
        try {
            await navigator.clipboard.writeText(text);
            setCopiedOrders(true);
            setTimeout(() => setCopiedOrders(false), 2000);
        } catch {
            alert('Failed to copy to clipboard');
        }
    };

    // =======================================================================
    // Download pre-orders PDF
    // =======================================================================
    const handleDownloadPDF = async () => {
        if (!token || !event) return;

        setPdfLoading(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/events/${event.id}/preorders/pdf`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const data = await response.json();
                alert(data.message || 'Failed to generate PDF');
                setPdfLoading(false);
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `preorders-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            alert('Failed to download PDF');
        }
        setPdfLoading(false);
    };

    // =======================================================================
    // Handle host saving an attendee's order
    // =======================================================================
    const handleSaveOrder = async () => {
        if (!token || !event || editingAttendeeId === null) return;

        setOrderSaving(true);
        const result = await updateOrder(token, event.id, editingAttendeeId, editFoodOrder, editDietaryNotes);
        setOrderSaving(false);

        if (result.success) {
            setAttending(prev => prev.map(a =>
                a.user_id === editingAttendeeId
                    ? { ...a, food_order: editFoodOrder || null, dietary_notes: editDietaryNotes || null }
                    : a
            ));
            setEditingAttendeeId(null);
        } else {
            alert(result.error || 'Failed to save order');
        }
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading || authLoading) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 mt-4">Loading...</p>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Error state
    // =======================================================================
    if (error || !event) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found</h1>
                        <p className="text-slate-600 mb-6">{error || 'This event may have been removed.'}</p>
                        <Link
                            href="/your-events"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                        >
                            Back to your events
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Access guard: not logged in
    // =======================================================================
    if (!user) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Log in required</h1>
                        <p className="text-slate-600 mb-6">You need to be logged in to place an order.</p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Access guard: preorders not enabled
    // =======================================================================
    if (!event.preorders_enabled) {
        return (
            <SidebarLayout>
                <div className="bg-slate-50 border-b border-slate-200">
                    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to event
                        </Link>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Pre-orders not available</h1>
                        <p className="text-slate-600 mb-6">Pre-orders are not enabled for this event.</p>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                        >
                            Back to event
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    const canOrder = rsvp && rsvp.status !== 'not_going';

    // =======================================================================
    // Access guard: event cancelled
    // =======================================================================
    if (event.status === 'cancelled') {
        return (
            <SidebarLayout>
                <div className="bg-slate-50 border-b border-slate-200">
                    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to event
                        </Link>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🚫</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Event cancelled
                        </h1>
                        <p className="text-slate-600 mb-6">
                            This event has been cancelled. Orders can no longer be placed.
                        </p>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                        >
                            Back to event
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    const { date, time } = formatDateTime(event.date_time);
    const hasMenuImages = event.menu_images && event.menu_images.length > 0;
    const hasMenuLink = !hasMenuImages && !!event.menu_link;

    return (
        <SidebarLayout>
            {/* Header with breadcrumb */}
            <div className="bg-slate-50 border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Link
                                href={`/events/${event.id}`}
                                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to event
                            </Link>

                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mb-2">
                                {canOrder ? 'Your Order' : 'Menu'}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-sm">
                                <span>{event.title}</span>
                                <span className="text-slate-300">&middot;</span>
                                <span>{date} at {time}</span>
                                {event.preorder_cutoff && (
                                    <>
                                        <span className="text-slate-300">&middot;</span>
                                        <span className="text-slate-500 font-medium">
                                            Order by {new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* View Orders button for group members */}
                        {isGroupMember && event.preorders_enabled && (
                            <button
                                onClick={() => setShowOrderSummary(true)}
                                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span className="hidden sm:inline">All Orders</span>
                                <span className="sm:hidden">All Orders</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto w-full">
                <div className="space-y-6">

                    {/* Menu section (always visible) */}
                    {(hasMenuImages || hasMenuLink) && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Menu</h2>

                            {/* RSVP button at top of menu card */}
                            {(!rsvp || rsvp.status === 'not_going') && !isPastEvent && (
                                <div className="mb-6 pb-6 border-b border-slate-200">
                                    {!isEventFull ? (
                                        <button
                                            onClick={handleRsvp}
                                            disabled={rsvpLoading}
                                            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Joining...' : 'Count me in'}
                                        </button>
                                    ) : canJoinWaitlist ? (
                                        <button
                                            onClick={handleRsvp}
                                            disabled={rsvpLoading}
                                            className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-md disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Joining...' : 'Join the waitlist'}
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full px-6 py-3 bg-slate-300 text-slate-500 font-medium rounded-xl cursor-not-allowed"
                                        >
                                            Event Full
                                        </button>
                                    )}
                                    <p className="text-center text-sm text-slate-500 mt-2">
                                        {!isEventFull
                                            ? 'RSVP to place your pre-order'
                                            : canJoinWaitlist
                                                ? 'Join the waitlist. You can order when confirmed.'
                                                : 'This event has reached capacity'}
                                    </p>
                                </div>
                            )}

                            {hasMenuImages && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {event.menu_images!.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 transition group"
                                        >
                                            <Image
                                                src={url}
                                                alt={`Menu page ${idx + 1}`}
                                                fill
                                                sizes="(min-width: 640px) 50vw, 100vw"
                                                priority={idx === 0}
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                                            {event.menu_images && event.menu_images.length > 1 && (
                                                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                                                    {idx + 1}/{event.menu_images.length}
                                                </span>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            )}
                            {hasMenuLink && (
                                <a
                                    href={event.menu_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition"
                                >
                                    View Menu
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            )}
                            {hasMenuImages && (
                                <p className="text-xs text-slate-500 mt-3">Click to view full size</p>
                            )}

                            {/* RSVP button at bottom of menu card */}
                            {(!rsvp || rsvp.status === 'not_going') && !isPastEvent && (
                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    {!isEventFull ? (
                                        <button
                                            onClick={handleRsvp}
                                            disabled={rsvpLoading}
                                            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Joining...' : 'Count me in'}
                                        </button>
                                    ) : canJoinWaitlist ? (
                                        <button
                                            onClick={handleRsvp}
                                            disabled={rsvpLoading}
                                            className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-md disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Joining...' : 'Join the waitlist'}
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full px-6 py-3 bg-slate-300 text-slate-500 font-medium rounded-xl cursor-not-allowed"
                                        >
                                            Event Full
                                        </button>
                                    )}
                                    <p className="text-center text-sm text-slate-500 mt-2">
                                        {!isEventFull
                                            ? 'RSVP to place your pre-order'
                                            : canJoinWaitlist
                                                ? 'Join the waitlist. You can order when confirmed.'
                                                : 'This event has reached capacity'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Order section — depends on RSVP and cutoff status */}
                    {!canOrder ? (
                        /* Not attending — show RSVP options */
                        <div ref={orderFormRef} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Your Order</h2>
                            <div className="text-center py-4">
                                {!isEventFull ? (
                                    <>
                                        <p className="text-slate-600 mb-4">RSVP to this event to place your pre-order.</p>
                                        <button
                                            onClick={handleRsvp}
                                            disabled={rsvpLoading}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Joining...' : 'Count me in'}
                                        </button>
                                    </>
                                ) : canJoinWaitlist ? (
                                    <>
                                        <p className="text-slate-600 mb-4">This event is full, but you can join the waitlist. You can order when confirmed.</p>
                                        <button
                                            onClick={handleRsvp}
                                            disabled={rsvpLoading}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-md disabled:opacity-50"
                                        >
                                            {rsvpLoading ? 'Joining...' : 'Join the waitlist'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-slate-600 mb-4">This event has reached capacity.</p>
                                        <button
                                            disabled
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-300 text-slate-500 font-medium rounded-xl cursor-not-allowed"
                                        >
                                            Event Full
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : rsvp?.status === 'waitlist' ? (
                        /* On waitlist — show disabled form with message */
                        <div ref={orderFormRef} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Your Order</h2>
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-amber-800 text-center">
                                    You&apos;re on the waitlist. You can place your order when you&apos;re confirmed for the event.
                                </p>
                            </div>
                        </div>
                    ) : isCutoffPassed ? (
                        /* Cutoff passed — read-only order view */
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Your Order</h2>
                            {rsvp!.food_order || rsvp!.dietary_notes ? (
                                <div className="space-y-3">
                                    {rsvp!.food_order && (
                                        <div>
                                            <span className="text-sm font-medium text-slate-700">Order: </span>
                                            <span className="text-slate-600">{rsvp!.food_order}</span>
                                        </div>
                                    )}
                                    {rsvp!.dietary_notes && (
                                        <div>
                                            <span className="text-sm font-medium text-slate-700">Notes: </span>
                                            <span className="text-slate-600">{rsvp!.dietary_notes}</span>
                                        </div>
                                    )}
                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                        <p className="text-sm text-amber-700">
                                            The order deadline has closed. Contact a host if you need to make changes.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <p className="text-sm text-slate-600">
                                        The order deadline has passed. You did not submit an order.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Before cutoff — order form */
                        <div ref={orderFormRef} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Your Order</h2>

                            <form onSubmit={handleSubmitOrder} className="space-y-5">
                                {/* Order textarea */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="foodOrder" className="block text-sm font-medium text-slate-700">
                                            Your Order
                                        </label>
                                        <span className={`text-xs ${foodOrder.length > 450 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {foodOrder.length}/500
                                        </span>
                                    </div>
                                    <textarea
                                        ref={foodOrderInputRef}
                                        id="foodOrder"
                                        value={foodOrder}
                                        onChange={(e) => setFoodOrder(e.target.value)}
                                        placeholder="e.g., Chicken Caesar Salad, no croutons"
                                        rows={4}
                                        maxLength={500}
                                        autoCapitalize="sentences"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition text-base"
                                    />
                                </div>

                                {/* Notes textarea */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="dietaryNotes" className="block text-sm font-medium text-slate-700">
                                            Notes / Preferences
                                        </label>
                                        <span className={`text-xs ${dietaryNotes.length > 180 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {dietaryNotes.length}/200
                                        </span>
                                    </div>
                                    <textarea
                                        id="dietaryNotes"
                                        value={dietaryNotes}
                                        onChange={(e) => setDietaryNotes(e.target.value)}
                                        placeholder="e.g., Vegetarian, nut allergy, extra spicy"
                                        rows={2}
                                        maxLength={200}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none transition text-base"
                                    />
                                </div>

                                {/* Save button */}
                                <button
                                    type="submit"
                                    disabled={orderLoading}
                                    className="w-full px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                                >
                                    {orderLoading ? 'Saving...' : 'Save Order'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Summary Modal */}
            {showOrderSummary && event && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => { setShowOrderSummary(false); setEditingAttendeeId(null); }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                            <h3 className="text-lg font-bold text-slate-900 font-display">Orders</h3>
                            <button
                                onClick={() => { setShowOrderSummary(false); setEditingAttendeeId(null); }}
                                className="p-1 text-slate-400 hover:text-slate-600 transition"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Order list - scrollable */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {attending.length > 0 ? (
                                <div className="space-y-4">
                                    {attending.map((person) => (
                                        <div key={person.user_id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                                            {editingAttendeeId === person.user_id ? (
                                                /* Inline edit form for host */
                                                <div>
                                                    <p className="font-semibold text-slate-900 mb-2">{person.name}</p>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
                                                            <input
                                                                type="text"
                                                                value={editFoodOrder}
                                                                onChange={(e) => setEditFoodOrder(e.target.value)}
                                                                placeholder="e.g., Chicken Caesar Salad"
                                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                                                            <input
                                                                type="text"
                                                                value={editDietaryNotes}
                                                                onChange={(e) => setEditDietaryNotes(e.target.value)}
                                                                placeholder="e.g., No nuts, gluten free"
                                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleSaveOrder}
                                                                disabled={orderSaving}
                                                                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                                                            >
                                                                {orderSaving ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingAttendeeId(null)}
                                                                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Read-only order display */
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-semibold text-slate-900">{person.name}</p>
                                                        {canManageAttendees && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingAttendeeId(person.user_id);
                                                                    setEditFoodOrder(person.food_order || '');
                                                                    setEditDietaryNotes(person.dietary_notes || '');
                                                                }}
                                                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex-shrink-0"
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                    {person.food_order ? (
                                                        <p className="text-slate-700 mt-1">{person.food_order}</p>
                                                    ) : (
                                                        <p className="text-slate-400 italic mt-1">No order submitted</p>
                                                    )}
                                                    {person.dietary_notes && (
                                                        <p className="text-sm text-violet-600 mt-1">
                                                            Notes: {person.dietary_notes}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 py-8">No attendees yet</p>
                            )}
                        </div>

                        {/* Footer with action buttons */}
                        <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Copy button */}
                                <button
                                    onClick={handleCopyOrders}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition"
                                >
                                    {copiedOrders ? (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy
                                        </>
                                    )}
                                </button>

                                {/* PDF button - only for hosts/organisers */}
                                {canManageAttendees && (
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={pdfLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white font-medium rounded-xl hover:bg-slate-700 transition disabled:opacity-50"
                                    >
                                        {pdfLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                                PDF
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Remind button - only for hosts/organisers when attendees haven't ordered */}
                                {canManageAttendees && !isPastEvent && !isCutoffPassed && attending.some(a => !a.food_order) && (
                                    <button
                                        onClick={async () => {
                                            if (!token || reminderSent) return;
                                            setReminderSending(true);
                                            const result = await sendPreorderReminder(token, Number(params.id));
                                            setReminderSending(false);
                                            if (result.success) {
                                                setReminderSent(true);
                                            }
                                        }}
                                        disabled={reminderSending || reminderSent}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition disabled:opacity-50"
                                    >
                                        {reminderSending ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Sending...
                                            </>
                                        ) : reminderSent ? (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Sent!
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Remind
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SidebarLayout>
    );
}
