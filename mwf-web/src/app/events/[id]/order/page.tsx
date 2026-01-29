'use client';

/*
=======================================================================================================================================
Event Order Page
=======================================================================================================================================
Dedicated page for placing/editing a food pre-order for an event.
Guards: must be logged in, must have RSVP, preorders must be enabled, cutoff must not have passed (for editing).
=======================================================================================================================================
*/

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    getEvent,
    submitOrder,
    EventWithDetails,
    RsvpStatus,
} from '@/lib/api/events';
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

    // =======================================================================
    // Fetch event details
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
            const result = await getEvent(eventId, token);

            if (result.success && result.data) {
                setEvent(result.data.event);
                setRsvp(result.data.rsvp);
                setFoodOrder(result.data.rsvp?.food_order || '');
                setDietaryNotes(result.data.rsvp?.dietary_notes || '');
            } else {
                setError(result.error || 'Event not found');
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

    const isPastEvent = event ? new Date(event.date_time) < new Date() : false;

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
                            Back to {event.title}
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

    // =======================================================================
    // Access guard: no RSVP
    // =======================================================================
    if (!rsvp || rsvp.status === 'not_going') {
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
                            Back to {event.title}
                        </Link>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">✋</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">RSVP required</h1>
                        <p className="text-slate-600 mb-6">You need to RSVP to this event before placing an order.</p>
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-md"
                        >
                            Go to event
                        </Link>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Access guard: event cancelled or past
    // =======================================================================
    if (event.status === 'cancelled' || isPastEvent) {
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
                            Back to {event.title}
                        </Link>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">{event.status === 'cancelled' ? '🚫' : '📅'}</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            {event.status === 'cancelled' ? 'Event cancelled' : 'Event has passed'}
                        </h1>
                        <p className="text-slate-600 mb-6">
                            {event.status === 'cancelled'
                                ? 'This event has been cancelled. Orders can no longer be placed.'
                                : 'This event has already taken place.'}
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
                    <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to {event.title}
                    </Link>

                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mb-2">
                        Your Order
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-sm">
                        <span>{event.title}</span>
                        <span className="text-slate-300">·</span>
                        <span>{date} at {time}</span>
                        {event.preorder_cutoff && (
                            <>
                                <span className="text-slate-300">·</span>
                                <span className="text-indigo-600 font-medium">
                                    Order by {new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto w-full">
                <div className="space-y-6">

                    {/* Cutoff passed: read-only view */}
                    {isCutoffPassed ? (
                        <>
                        {/* Menu section (visible even after cutoff) */}
                        {(hasMenuImages || hasMenuLink) && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Menu</h2>
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
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Your Order</h2>
                            {rsvp.food_order || rsvp.dietary_notes ? (
                                <div className="space-y-3">
                                    {rsvp.food_order && (
                                        <div>
                                            <span className="text-sm font-medium text-slate-700">Order: </span>
                                            <span className="text-slate-600">{rsvp.food_order}</span>
                                        </div>
                                    )}
                                    {rsvp.dietary_notes && (
                                        <div>
                                            <span className="text-sm font-medium text-slate-700">Notes: </span>
                                            <span className="text-slate-600">{rsvp.dietary_notes}</span>
                                        </div>
                                    )}
                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                        <p className="text-sm text-amber-700">
                                            The order deadline has passed. Contact a host if you need to make changes.
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
                        </>
                    ) : (
                        <>
                            {/* Menu section */}
                            {(hasMenuImages || hasMenuLink) && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h2 className="text-lg font-bold text-slate-900 font-display mb-4">Menu</h2>
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
                                </div>
                            )}

                            {/* Order form */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
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
                                            id="foodOrder"
                                            value={foodOrder}
                                            onChange={(e) => setFoodOrder(e.target.value)}
                                            placeholder="e.g., Chicken Caesar Salad, no croutons"
                                            rows={4}
                                            maxLength={500}
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

                                    {/* Deadline notice */}
                                    {event.preorder_cutoff && (
                                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                                            <p className="text-sm text-indigo-700">
                                                Order by {new Date(event.preorder_cutoff).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(event.preorder_cutoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    )}

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
                        </>
                    )}
                </div>
            </div>
        </SidebarLayout>
    );
}
