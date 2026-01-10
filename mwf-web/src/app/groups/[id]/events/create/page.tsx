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
import Header from '@/components/layout/Header';
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
    const [allowGuests, setAllowGuests] = useState(false);
    const [maxGuestsPerRsvp, setMaxGuestsPerRsvp] = useState(1);
    const [preordersEnabled, setPreordersEnabled] = useState(false);
    const [menuLink, setMenuLink] = useState('');
    const [preorderCutoffDate, setPreorderCutoffDate] = useState('');
    const [preorderCutoffTime, setPreorderCutoffTime] = useState('');

    // UI state
    const [optionsExpanded, setOptionsExpanded] = useState(true);

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
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </main>
        );
    }

    // =======================================================================
    // Error/unauthorized state
    // =======================================================================
    if (!group || !canCreateEvents) {
        return (
            <main className="min-h-screen flex flex-col bg-stone-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-stone-600 mb-4">
                        {error || 'You do not have permission to create events in this group'}
                    </p>
                    {group && (
                        <Link href={`/groups/${group.id}`} className="text-amber-600 hover:text-amber-700">
                            Back to group
                        </Link>
                    )}
                </div>
            </main>
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
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <Link
                        href={`/groups/${group.id}`}
                        className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to {group.name}
                    </Link>
                </div>

                <div className="mb-6 sm:mb-8">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-800">Create Event</h1>
                    <p className="text-stone-500 mt-1">for {group.name}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Form Column */}
                    <div className="flex-1 lg:flex-[3]">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ============================================================
                                CARD 1: ESSENTIALS
                            ============================================================ */}
                            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
                                {/* Error message */}
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                {/* Title */}
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-2">
                                        Event Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                        placeholder="e.g., Friday Evening Dinner"
                                        maxLength={200}
                                        required
                                    />
                                </div>

                                {/* Date and Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="date" className="block text-sm font-medium text-stone-700 mb-2">
                                            Date *
                                        </label>
                                        <input
                                            type="date"
                                            id="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            min={minDate}
                                            className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-stone-700 mb-2">
                                            Time *
                                        </label>
                                        {/* Time dropdown */}
                                        <select
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition bg-white"
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
                                        {/* Quick time presets */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-stone-400">Day</span>
                                                {['12:00', '14:00', '15:00'].map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setTime(t)}
                                                        className={`px-2.5 py-1 text-sm rounded-md border transition ${
                                                            time === t
                                                                ? 'bg-amber-500 text-white border-amber-500'
                                                                : 'bg-white text-stone-600 border-stone-300 hover:border-amber-400'
                                                        }`}
                                                    >
                                                        {t === '12:00' ? '12pm' : t === '14:00' ? '2pm' : '3pm'}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-stone-400">Eve</span>
                                                {['17:00', '18:00', '19:00'].map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setTime(t)}
                                                        className={`px-2.5 py-1 text-sm rounded-md border transition ${
                                                            time === t
                                                                ? 'bg-amber-500 text-white border-amber-500'
                                                                : 'bg-white text-stone-600 border-stone-300 hover:border-amber-400'
                                                        }`}
                                                    >
                                                        {t === '17:00' ? '5pm' : t === '18:00' ? '6pm' : '7pm'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-stone-700 mb-2">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                        placeholder="e.g., The Beacon Hotel, Copthorne"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-2">
                                        Description
                                    </label>
                                    <RichTextEditor
                                        value={description}
                                        onChange={setDescription}
                                        placeholder="Tell people what to expect..."
                                    />
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Creating...' : 'Create Event'}
                                    </button>
                                    <Link
                                        href={`/groups/${group.id}`}
                                        className="px-6 py-3 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition text-center"
                                    >
                                        Cancel
                                    </Link>
                                </div>
                            </div>

                            {/* ============================================================
                                CARD 2: EVENT OPTIONS
                            ============================================================ */}
                            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                                {/* Accordion Header */}
                                <button
                                    type="button"
                                    onClick={() => setOptionsExpanded(!optionsExpanded)}
                                    className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition text-left"
                                >
                                    <div>
                                        <h3 className="font-medium text-stone-800">Event Options</h3>
                                        <p className="text-sm text-stone-500 mt-0.5">
                                            Image, capacity, guests
                                        </p>
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-stone-400 transition-transform ${optionsExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Accordion Content */}
                                {optionsExpanded && (
                                    <div className="p-4 pt-2 space-y-6 border-t border-stone-200">
                                        {/* Featured Image */}
                                        <div>
                                            <label className="block text-sm font-medium text-stone-700 mb-2">
                                                Featured Image
                                            </label>
                                            <ImageUpload
                                                value={imageUrl}
                                                onChange={setImageUrl}
                                            />
                                        </div>

                                        {/* Capacity */}
                                        <div>
                                            <label htmlFor="capacity" className="block text-sm font-medium text-stone-700 mb-2">
                                                Capacity
                                            </label>
                                            <input
                                                type="number"
                                                id="capacity"
                                                value={capacity}
                                                onChange={(e) => setCapacity(e.target.value)}
                                                min={1}
                                                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                                placeholder="Leave empty for unlimited"
                                            />
                                            <p className="mt-1.5 text-sm text-stone-500">
                                                Leave empty for unlimited. If set, a waitlist will be used when full.
                                            </p>
                                        </div>

                                        {/* Guest Options */}
                                        <div className="space-y-4">
                                            <label className="flex items-center gap-3 p-3 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-50 transition">
                                                <input
                                                    type="checkbox"
                                                    checked={allowGuests}
                                                    onChange={(e) => setAllowGuests(e.target.checked)}
                                                    className="w-5 h-5 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
                                                />
                                                <div>
                                                    <p className="font-medium text-stone-800">Allow members to bring guests</p>
                                                    <p className="text-sm text-stone-500">Members can RSVP with additional people</p>
                                                </div>
                                            </label>

                                            {allowGuests && (
                                                <div className="ml-4 pl-4 border-l-2 border-amber-200">
                                                    <label htmlFor="maxGuests" className="block text-sm font-medium text-stone-700 mb-2">
                                                        Maximum guests per RSVP
                                                    </label>
                                                    <select
                                                        id="maxGuests"
                                                        value={maxGuestsPerRsvp}
                                                        onChange={(e) => setMaxGuestsPerRsvp(parseInt(e.target.value, 10))}
                                                        className="w-32 px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                                    >
                                                        <option value={1}>1</option>
                                                        <option value={2}>2</option>
                                                        <option value={3}>3</option>
                                                        <option value={4}>4</option>
                                                        <option value={5}>5</option>
                                                    </select>
                                                    <p className="mt-1.5 text-sm text-stone-500">
                                                        Guests count towards event capacity.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ============================================================
                                CARD 3: ATTENDEE REQUESTS (subtle feature highlight)
                            ============================================================ */}
                            <div className="bg-white rounded-2xl border border-stone-200 border-l-4 border-l-amber-400 p-5">
                                {/* Header with toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-stone-800">Attendee Requests</h3>
                                            <p className="text-sm text-stone-500">
                                                Collect orders or preferences before the event
                                            </p>
                                        </div>
                                    </div>
                                    {/* Toggle Switch */}
                                    <button
                                        type="button"
                                        onClick={() => setPreordersEnabled(!preordersEnabled)}
                                        className={`relative w-12 h-7 rounded-full transition-colors ${
                                            preordersEnabled ? 'bg-amber-500' : 'bg-stone-300'
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                                preordersEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Options when enabled */}
                                {preordersEnabled && (
                                    <div className="mt-4 pt-4 border-t border-stone-100 space-y-4">
                                        <div>
                                            <label htmlFor="menuLink" className="block text-sm font-medium text-stone-700 mb-2">
                                                Link
                                            </label>
                                            <input
                                                type="url"
                                                id="menuLink"
                                                value={menuLink}
                                                onChange={(e) => setMenuLink(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                                placeholder="https://restaurant.com/menu"
                                            />
                                            <p className="mt-1.5 text-sm text-stone-500">
                                                Share a menu, form, or any link for attendees to submit their choices
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-stone-700 mb-2">
                                                Cutoff
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <input
                                                    type="date"
                                                    value={preorderCutoffDate}
                                                    onChange={(e) => setPreorderCutoffDate(e.target.value)}
                                                    min={minDate}
                                                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                                />
                                                <input
                                                    type="time"
                                                    value={preorderCutoffTime}
                                                    onChange={(e) => setPreorderCutoffTime(e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                                />
                                            </div>
                                            <p className="mt-1.5 text-sm text-stone-500">
                                                Set a deadline for orders, or leave empty for no cutoff
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Tips Sidebar - Hidden on mobile, shown on lg+ */}
                    <aside className="hidden lg:block lg:flex-[2]">
                        <div className="sticky top-8 space-y-4">
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <h2 className="font-display text-lg font-semibold text-stone-800">Tips</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-amber-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-stone-800 text-sm">Date & time</h3>
                                            <p className="text-sm text-stone-600 mt-0.5">Pick a time that works for most people. Evening events often get better attendance.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-amber-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-stone-800 text-sm">Location</h3>
                                            <p className="text-sm text-stone-600 mt-0.5">Be specific so people can find it. Include the full address or directions.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-amber-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-stone-800 text-sm">Capacity</h3>
                                            <p className="text-sm text-stone-600 mt-0.5">If there's a limit, set it here. Members who can't get in will be waitlisted.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-amber-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-stone-800 text-sm">Pre-orders</h3>
                                            <p className="text-sm text-stone-600 mt-0.5">Great for restaurant events. Link to the menu so people can order ahead.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
