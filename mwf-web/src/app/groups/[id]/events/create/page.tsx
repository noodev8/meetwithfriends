'use client';

/*
=======================================================================================================================================
Create Event Page
=======================================================================================================================================
Form for creating a new event within a group. Only accessible to organisers and hosts.
Two-column layout with form on left and tips sidebar on right.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroup, GroupWithCount, GroupMembership } from '@/lib/api/groups';
import { createEvent } from '@/lib/api/events';
import SidebarLayout from '@/components/layout/SidebarLayout';
import ImageUpload from '@/components/ui/ImageUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';

export default function CreateEventPage() {
    const { token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();

    const [group, setGroup] = useState<GroupWithCount | null>(null);
    const [membership, setMembership] = useState<GroupMembership | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [capacity, setCapacity] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imagePosition, setImagePosition] = useState<'top' | 'center' | 'bottom'>('center');
    const [allowGuests, setAllowGuests] = useState(false);
    const [maxGuestsPerRsvp, setMaxGuestsPerRsvp] = useState(1);
    const [preordersEnabled, setPreordersEnabled] = useState(false);
    const [menuLink, setMenuLink] = useState('');
    const [preorderCutoffDate, setPreorderCutoffDate] = useState('');
    const [preorderCutoffTime, setPreorderCutoffTime] = useState('');

    // UI state - individual option card expansion (all collapsed by default)
    const [imageExpanded, setImageExpanded] = useState(false);
    const [capacityExpanded, setCapacityExpanded] = useState(false);
    const [guestsExpanded, setGuestsExpanded] = useState(false);
    const [requestsExpanded, setRequestsExpanded] = useState(false);

    // Check if user can create events
    const canCreateEvents = membership?.status === 'active' &&
        (membership?.role === 'organiser' || membership?.role === 'host');

    // =======================================================================
    // Fetch group details
    // =======================================================================
    useEffect(() => {
        async function fetchGroup() {
            // Wait for auth to load before checking token
            if (authLoading) return;

            if (!params.id || !token) {
                setError('Please log in to create an event');
                setLoading(false);
                return;
            }

            const result = await getGroup(Number(params.id), token);
            if (result.success && result.data) {
                setGroup(result.data.group);
                setMembership(result.data.membership);
            } else {
                setError(result.error || 'Group not found');
            }
            setLoading(false);
        }
        fetchGroup();
    }, [params.id, token, authLoading]);

    // =======================================================================
    // Handle form submission
    // =======================================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token || !group) return;

        // Validate required fields
        if (!title.trim() || !date || !time) {
            setError('Title, date, and time are required');
            return;
        }

        // Combine date and time
        const dateTime = new Date(`${date}T${time}`);
        if (isNaN(dateTime.getTime())) {
            setError('Invalid date or time');
            return;
        }

        if (dateTime <= new Date()) {
            setError('Event must be in the future');
            return;
        }

        // Validate preorder cutoff if preorders are enabled
        let preorderCutoff: string | undefined;
        if (preordersEnabled && preorderCutoffDate && preorderCutoffTime) {
            const cutoffDateTime = new Date(`${preorderCutoffDate}T${preorderCutoffTime}`);
            if (isNaN(cutoffDateTime.getTime())) {
                setError('Invalid pre-order cutoff date or time');
                return;
            }
            if (cutoffDateTime >= dateTime) {
                setError('Pre-order cutoff must be before the event date');
                return;
            }
            preorderCutoff = cutoffDateTime.toISOString();
        }

        setSubmitting(true);
        setError(null);

        const result = await createEvent(token, {
            group_id: group.id,
            title: title.trim(),
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            date_time: dateTime.toISOString(),
            capacity: capacity ? parseInt(capacity, 10) : undefined,
            image_url: imageUrl || undefined,
            image_position: imageUrl ? imagePosition : undefined,
            allow_guests: allowGuests,
            max_guests_per_rsvp: allowGuests ? maxGuestsPerRsvp : undefined,
            preorders_enabled: preordersEnabled,
            menu_link: preordersEnabled ? (menuLink.trim() || undefined) : undefined,
            preorder_cutoff: preordersEnabled ? preorderCutoff : undefined,
        });

        setSubmitting(false);

        if (result.success && result.data) {
            // Redirect to the new event page
            router.push(`/events/${result.data.id}`);
        } else {
            setError(result.error || 'Failed to create event');
        }
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Error/unauthorized state
    // =======================================================================
    if (!group || !canCreateEvents) {
        return (
            <SidebarLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-slate-600 mb-4">
                        {error || 'You do not have permission to create events in this group'}
                    </p>
                    {group && (
                        <Link href={`/groups/${group.id}`} className="text-indigo-600 hover:text-indigo-700">
                            Back to group
                        </Link>
                    )}
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Get min date (tomorrow)
    // =======================================================================
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    // =======================================================================
    // Create event form
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <Link
                        href={`/groups/${group.id}`}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to {group.name}
                    </Link>
                </div>

                <div className="mb-6 sm:mb-8">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800">Create Event</h1>
                    <p className="text-slate-500 mt-1">for {group.name}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Form Column */}
                    <div className="flex-1 lg:flex-[3]">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ============================================================
                                CARD 1: ESSENTIALS
                            ============================================================ */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                                {/* Error message */}
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                {/* Title */}
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                                        Event Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
                                        placeholder="e.g., Friday Evening Dinner"
                                        maxLength={200}
                                        required
                                    />
                                </div>

                                {/* Date and Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
                                            Date *
                                        </label>
                                        <input
                                            type="date"
                                            id="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            min={minDate}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Time *
                                        </label>
                                        {/* Time dropdown */}
                                        <select
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition bg-white"
                                        >
                                            <option value="">Select time...</option>
                                            {Array.from({ length: 24 }, (_, h) =>
                                                [0, 30].map(m => {
                                                    const hour = h.toString().padStart(2, '0');
                                                    const min = m.toString().padStart(2, '0');
                                                    const val = `${hour}:${min}`;
                                                    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                                    const ampm = h < 12 ? 'AM' : 'PM';
                                                    const display = `${displayHour}:${min} ${ampm}`;
                                                    return <option key={val} value={val}>{display}</option>;
                                                })
                                            ).flat()}
                                        </select>
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-2">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
                                        placeholder="e.g., The Beacon Hotel, Copthorne"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Description
                                    </label>
                                    <RichTextEditor
                                        value={description}
                                        onChange={setDescription}
                                        placeholder="Tell people what to expect..."
                                    />
                                </div>
                            </div>

                            {/* ============================================================
                                OPTIONS SECTION
                            ============================================================ */}
                            <div className="pt-2">
                                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">Options</h2>

                                <div className="space-y-3">
                                    {/* Capacity Card */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setCapacityExpanded(!capacityExpanded)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-800">Capacity</span>
                                                    <span className="text-slate-400 mx-2">·</span>
                                                    <span className="text-sm text-slate-500">
                                                        {capacity ? `${capacity} spots` : 'Unlimited'}
                                                    </span>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-slate-400 transition-transform ${capacityExpanded ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {capacityExpanded && (
                                            <div className="px-4 pb-4 border-t border-slate-100">
                                                <div className="pt-4">
                                                    <div className="flex gap-2 flex-wrap">
                                                        {['', '6', '10', '12'].map((val) => {
                                                            const isSelected = capacity === val;
                                                            return (
                                                                <button
                                                                    key={val}
                                                                    type="button"
                                                                    onClick={() => setCapacity(val)}
                                                                    className={`px-4 h-11 rounded-lg font-medium transition ${
                                                                        isSelected
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {val === '' ? 'Unlimited' : val}
                                                                </button>
                                                            );
                                                        })}
                                                        <input
                                                            type="number"
                                                            value={capacity}
                                                            onChange={(e) => setCapacity(e.target.value)}
                                                            min={1}
                                                            placeholder="Other"
                                                            className="w-20 h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition text-center"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Guests Card */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setGuestsExpanded(!guestsExpanded)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-800">Guests</span>
                                                    <span className="text-slate-400 mx-2">·</span>
                                                    <span className="text-sm text-slate-500">
                                                        {allowGuests ? `Up to ${maxGuestsPerRsvp} per member` : 'Not allowed'}
                                                    </span>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-slate-400 transition-transform ${guestsExpanded ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {guestsExpanded && (
                                            <div className="px-4 pb-4 border-t border-slate-100">
                                                <div className="pt-4">
                                                    <p className="text-sm text-slate-600 mb-3">Maximum guests per member</p>
                                                    <div className="flex gap-2">
                                                        {[0, 1, 2, 3, 4].map((num) => {
                                                            const isSelected = num === 0 ? !allowGuests : (allowGuests && maxGuestsPerRsvp === num);
                                                            return (
                                                                <button
                                                                    key={num}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (num === 0) {
                                                                            setAllowGuests(false);
                                                                        } else {
                                                                            setAllowGuests(true);
                                                                            setMaxGuestsPerRsvp(num);
                                                                        }
                                                                    }}
                                                                    className={`w-11 h-11 rounded-lg font-medium transition ${
                                                                        isSelected
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {num}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Attendee Requests Card */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setRequestsExpanded(!requestsExpanded)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-800">Pre Orders or Requests</span>
                                                    <span className="text-slate-400 mx-2">·</span>
                                                    <span className="text-sm text-slate-500">
                                                        {preordersEnabled ? 'On' : 'Off'}
                                                    </span>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-slate-400 transition-transform ${requestsExpanded ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {requestsExpanded && (
                                            <div className="px-4 pb-4 border-t border-slate-100">
                                                <div className="pt-4 space-y-4">
                                                    {/* iOS Toggle */}
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-slate-800">Collect orders or preferences</p>
                                                            <p className="text-sm text-slate-500">Request details from attendees before the event</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreordersEnabled(!preordersEnabled)}
                                                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                                                                preordersEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                                                    preordersEnabled ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="menuLink" className="block text-sm font-medium text-slate-700 mb-2">
                                                            Link
                                                        </label>
                                                        <input
                                                            type="url"
                                                            id="menuLink"
                                                            value={menuLink}
                                                            onChange={(e) => setMenuLink(e.target.value)}
                                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
                                                            placeholder="https://restaurant.com/menu"
                                                        />
                                                        <p className="mt-1.5 text-sm text-slate-500">
                                                            Share a menu, form, or any link for attendees to submit their choices
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Cutoff
                                                        </label>
                                                        {/* Date presets - relative to event date */}
                                                        <div className="flex flex-wrap gap-2">
                                                            {[1, 2, 3].map((days) => {
                                                                const cutoffDate = date ? (() => {
                                                                    const d = new Date(date);
                                                                    d.setDate(d.getDate() - days);
                                                                    return d.toISOString().split('T')[0];
                                                                })() : '';
                                                                const isSelected = preorderCutoffDate === cutoffDate && cutoffDate !== '';
                                                                return (
                                                                    <button
                                                                        key={days}
                                                                        type="button"
                                                                        disabled={!date}
                                                                        onClick={() => {
                                                                            setPreorderCutoffDate(cutoffDate);
                                                                            setPreorderCutoffTime('17:00');
                                                                        }}
                                                                        className={`px-3 h-11 rounded-lg text-sm font-medium transition ${
                                                                            isSelected
                                                                                ? 'bg-indigo-600 text-white'
                                                                                : date
                                                                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                                    : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                                                        }`}
                                                                    >
                                                                        {days} day{days > 1 ? 's' : ''} before
                                                                    </button>
                                                                );
                                                            })}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPreorderCutoffDate('');
                                                                    setPreorderCutoffTime('');
                                                                }}
                                                                className={`px-3 h-11 rounded-lg text-sm font-medium transition ${
                                                                    preorderCutoffDate === ''
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                No cutoff
                                                            </button>
                                                        </div>
                                                        {/* Show selected date */}
                                                        {preorderCutoffDate && (
                                                            <p className="mt-2 text-sm text-slate-600">
                                                                Orders due by {new Date(preorderCutoffDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} at 5pm
                                                            </p>
                                                        )}
                                                        {!date && (
                                                            <p className="mt-2 text-sm text-slate-400">Set event date first</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Featured Image Card */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setImageExpanded(!imageExpanded)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-800">Featured Image</span>
                                                    <span className="text-slate-400 mx-2">·</span>
                                                    <span className="text-sm text-slate-500">
                                                        {imageUrl ? 'Added' : 'None'}
                                                    </span>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-slate-400 transition-transform ${imageExpanded ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {imageExpanded && (
                                            <div className="px-4 pb-4 border-t border-slate-100">
                                                <div className="pt-4">
                                                    <ImageUpload
                                                        value={imageUrl}
                                                        onChange={setImageUrl}
                                                        imagePosition={imagePosition}
                                                        onPositionChange={setImagePosition}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ============================================================
                                SUBMIT BUTTONS
                            ============================================================ */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : 'Create Event'}
                                </button>
                                <Link
                                    href={`/groups/${group.id}`}
                                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-center"
                                >
                                    Cancel
                                </Link>
                            </div>
                        </form>
                    </div>

                    {/* Tips Sidebar - Hidden on mobile, shown on lg+ */}
                    <aside className="hidden lg:block lg:flex-[2]">
                        <div className="sticky top-8 space-y-4">
                            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200/50 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <h2 className="font-display text-lg font-semibold text-slate-800">Tips</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-sm">Date & time</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">Pick a time that works for most people. Evening events often get better attendance.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-sm">Location</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">Be specific so people can find it. Include the full address or directions.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-sm">Capacity</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">If there's a limit, set it here. Members who can't get in will be waitlisted.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 text-sm">Pre-orders</h3>
                                            <p className="text-sm text-slate-600 mt-0.5">Great for restaurant events. Link to the menu so people can order ahead.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </SidebarLayout>
    );
}
