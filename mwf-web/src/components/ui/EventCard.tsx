'use client';

/*
=======================================================================================================================================
EventCard Component
=======================================================================================================================================
Shared event card component with gradient header and emoji icon.
Used across dashboard, your-events, group pages, and event listings.
Displays category-specific gradient and emoji based on event.category field.
=======================================================================================================================================
*/

import Link from 'next/link';
import { EventWithDetails } from '@/lib/api/events';
import { getCategoryConfig } from '@/lib/eventCategories';

interface EventCardProps {
    event: EventWithDetails;
    from?: string; // Navigation source for back link (e.g., 'dashboard', 'group-5', 'your-events')
}

export default function EventCard({ event, from }: EventCardProps) {
    const isFull = event.capacity != null && (event.attendee_count || 0) >= event.capacity;
    const attendeeCount = event.attendee_count || 0;

    // Get category display config (gradient + emoji) - falls back to 'other' if not set
    const categoryConfig = getCategoryConfig(event.category);

    return (
        <div
            className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
        >
            {/* Gradient header with emoji - uses category-specific styling */}
            <div className={`h-32 bg-gradient-to-br ${categoryConfig.gradient} relative overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-80">
                    {categoryConfig.emoji}
                </div>

                {/* Attendee count badge */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700">
                    {event.capacity
                        ? `${attendeeCount}/${event.capacity} going`
                        : `${attendeeCount} going`
                    }
                </div>

                {/* Status badges on header */}
                <div className="absolute top-3 right-3 flex gap-1.5">
                    {(event.rsvp_status === 'attending' || event.rsvp_status === 'waitlist') && (
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                            event.rsvp_status === 'attending'
                                ? 'text-green-700 bg-green-100/90'
                                : 'text-violet-700 bg-violet-100/90'
                        }`}>
                            {event.rsvp_status === 'attending' ? 'Going' : 'Waitlist'}
                        </span>
                    )}
                    {event.status === 'cancelled' && (
                        <span className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100/90 rounded-full backdrop-blur-sm">
                            Cancelled
                        </span>
                    )}
                    {isFull && event.status !== 'cancelled' && event.rsvp_status !== 'attending' && event.rsvp_status !== 'waitlist' && (
                        <span className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100/90 rounded-full backdrop-blur-sm">
                            Waitlist
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Group name */}
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                    {event.group_name}
                </p>

                {/* Title */}
                <h4 className="text-lg font-bold text-slate-800 line-clamp-2 mb-2">
                    {event.title}
                </h4>

                {/* Date & Time */}
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(event.date_time).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                    })} · {new Date(event.date_time).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>

                {/* Location */}
                {event.location && (
                    <div className="flex items-center gap-2 text-slate-500 text-sm line-clamp-1">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.location}
                    </div>
                )}

                {/* CTA button */}
                <div className="mt-4">
                    <Link
                        href={`/events/${event.id}${from ? `?from=${from}` : ''}`}
                        className="block w-full py-2.5 text-center text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition"
                    >
                        Visit Event
                    </Link>
                </div>
            </div>
        </div>
    );
}
