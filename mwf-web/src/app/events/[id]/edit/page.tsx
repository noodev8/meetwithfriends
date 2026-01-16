'use client';

/*
=======================================================================================================================================
Edit Event Page
=======================================================================================================================================
Form for editing an existing event. Only accessible to the event creator or group organiser.
Updated to match Create Event UI with collapsible options and quick-select controls.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEvent, updateEvent, cancelEvent, EventWithDetails } from '@/lib/api/events';
import SidebarLayout from '@/components/layout/SidebarLayout';
// import ImageUpload from '@/components/ui/ImageUpload'; // Hidden - using category gradients instead
import RichTextEditor from '@/components/ui/RichTextEditor';
import MenuImageUpload from '@/components/ui/MenuImageUpload';
import { CATEGORY_OPTIONS, EventCategory } from '@/lib/eventCategories';
import { FEATURE_GUESTS_ENABLED } from '@/lib/featureFlags';

export default function EditEventPage() {
    const { token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [capacity, setCapacity] = useState('');
    const [category, setCategory] = useState<EventCategory>('food');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imagePosition, setImagePosition] = useState<'top' | 'center' | 'bottom'>('center');
    // const [imageSaving, setImageSaving] = useState(false); // Hidden - using category gradients
    const [allowGuests, setAllowGuests] = useState(false);
    const [maxGuestsPerRsvp, setMaxGuestsPerRsvp] = useState(1);
    const [preordersEnabled, setPreordersEnabled] = useState(false);
    const [menuLink, setMenuLink] = useState('');
    const [menuImages, setMenuImages] = useState<string[]>([]);
    const [preorderCutoffDate, setPreorderCutoffDate] = useState('');
    const [preorderCutoffTime, setPreorderCutoffTime] = useState('');

    // UI state - individual option card expansion (all collapsed by default)
    // const [imageExpanded, setImageExpanded] = useState(false); // Hidden - using category gradients
    const [capacityExpanded, setCapacityExpanded] = useState(false);
    const [guestsExpanded, setGuestsExpanded] = useState(false);
    const [requestsExpanded, setRequestsExpanded] = useState(false);

    // =======================================================================
    // Fetch event details
    // =======================================================================
    useEffect(() => {
        async function fetchEvent() {
            if (authLoading) return;

            if (!params.id || !token) {
                setError('Please log in to edit this event');
                setLoading(false);
                return;
            }

            const result = await getEvent(Number(params.id), token);
            if (result.success && result.data) {
                const evt = result.data.event;
                setEvent(evt);
                setCanEdit(result.data.can_edit);

                // Pre-populate form
                setTitle(evt.title);
                setDescription(evt.description || '');
                setLocation(evt.location || '');

                // Parse date and time (use local date, not UTC)
                const eventDate = new Date(evt.date_time);
                const year = eventDate.getFullYear();
                const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                const day = String(eventDate.getDate()).padStart(2, '0');
                setDate(`${year}-${month}-${day}`);
                setTime(eventDate.toTimeString().slice(0, 5));

                setCapacity(evt.capacity?.toString() || '');
                setCategory((evt.category as EventCategory) || 'other');
                setImageUrl(evt.image_url || null);
                setImagePosition(evt.image_position || 'center');
                setAllowGuests(evt.allow_guests || false);
                setMaxGuestsPerRsvp(evt.max_guests_per_rsvp || 1);
                setPreordersEnabled(evt.preorders_enabled || false);
                setMenuLink(evt.menu_link || '');
                setMenuImages(evt.menu_images || []);

                // Parse preorder cutoff date and time (use local date, not UTC)
                if (evt.preorder_cutoff) {
                    const cutoffDate = new Date(evt.preorder_cutoff);
                    const cutoffYear = cutoffDate.getFullYear();
                    const cutoffMonth = String(cutoffDate.getMonth() + 1).padStart(2, '0');
                    const cutoffDay = String(cutoffDate.getDate()).padStart(2, '0');
                    setPreorderCutoffDate(`${cutoffYear}-${cutoffMonth}-${cutoffDay}`);
                    setPreorderCutoffTime(cutoffDate.toTimeString().slice(0, 5));
                }
            } else {
                setError(result.error || 'Event not found');
            }
            setLoading(false);
        }
        fetchEvent();
    }, [params.id, token, authLoading]);

    /* Hidden - using category gradients instead
    // =======================================================================
    // Handle image change - auto-save to database
    // =======================================================================
    const handleImageChange = async (url: string | null) => {
        setImageUrl(url);

        if (!token || !event) return;

        setImageSaving(true);
        await updateEvent(token, event.id, { image_url: url });
        setImageSaving(false);
    };

    // =======================================================================
    // Handle image position change - auto-save to database
    // =======================================================================
    const handlePositionChange = async (position: 'top' | 'center' | 'bottom') => {
        setImagePosition(position);

        if (!token || !event) return;

        setImageSaving(true);
        await updateEvent(token, event.id, { image_position: position });
        setImageSaving(false);
    };
    */

    // =======================================================================
    // Handle menu images change - auto-save to database
    // =======================================================================
    const [menuImagesSaving, setMenuImagesSaving] = useState(false);

    const handleMenuImagesChange = async (urls: string[]) => {
        setMenuImages(urls);

        if (!token || !event) return;

        setMenuImagesSaving(true);
        await updateEvent(token, event.id, { menu_images: urls.length > 0 ? urls : null });
        setMenuImagesSaving(false);
    };

    // =======================================================================
    // Handle form submission
    // =======================================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token || !event) return;

        // Validate required fields
        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        if (!date || !time) {
            setError('Date and time are required');
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
        let preorderCutoff: string | null = null;
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

        const result = await updateEvent(token, event.id, {
            title: title.trim(),
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            date_time: dateTime.toISOString(),
            capacity: capacity ? parseInt(capacity, 10) : null,
            category,
            image_url: imageUrl,
            image_position: imagePosition,
            allow_guests: allowGuests,
            max_guests_per_rsvp: allowGuests ? maxGuestsPerRsvp : undefined,
            preorders_enabled: preordersEnabled,
            menu_link: preordersEnabled ? (menuLink.trim() || null) : null,
            menu_images: preordersEnabled && menuImages.length > 0 ? menuImages : null,
            preorder_cutoff: preordersEnabled ? preorderCutoff : null,
        });

        setSubmitting(false);

        if (result.success) {
            // Redirect back to event page
            router.push(`/events/${event.id}`);
        } else {
            setError(result.error || 'Failed to update event');
        }
    };

    // =======================================================================
    // Delete Event (called from modal)
    // =======================================================================
    const handleDeleteEvent = async () => {
        if (!token || !event) return;

        setCancelLoading(true);
        const result = await cancelEvent(token, event.id);
        setCancelLoading(false);

        if (result.success) {
            router.push('/dashboard');
        } else {
            setShowDeleteModal(false);
            setError(result.error || 'Failed to delete event');
        }
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 mt-4">Loading event...</p>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Error/unauthorized state
    // =======================================================================
    if (!event || !canEdit) {
        return (
            <SidebarLayout>
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
                        <p className="text-slate-600 mb-6">
                            {error || 'You do not have permission to edit this event'}
                        </p>
                        {event && (
                            <Link
                                href={`/events/${event.id}`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md"
                            >
                                Back to event
                            </Link>
                        )}
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    // =======================================================================
    // Get min date (today)
    // =======================================================================
    const today = new Date();
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // =======================================================================
    // Edit event form
    // =======================================================================
    return (
        <SidebarLayout>
            <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <Link
                        href={`/events/${event.id}`}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to event
                    </Link>
                </div>

                <div className="mb-6 sm:mb-8">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800">Edit Event</h1>
                    <p className="text-slate-500 mt-1">{event.title}</p>
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
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
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
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
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
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
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

                                {/* Event Category */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Event Type *
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <button
                                                key={cat.key}
                                                type="button"
                                                onClick={() => setCategory(cat.key)}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                                                    category === cat.key
                                                        ? 'border-indigo-600 bg-indigo-50'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                <span className="text-2xl">{cat.emoji}</span>
                                                <span className={`text-xs font-medium ${
                                                    category === cat.key ? 'text-indigo-700' : 'text-slate-600'
                                                }`}>
                                                    {cat.label}
                                                </span>
                                            </button>
                                        ))}
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
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
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
                                    {/* Featured Image Card - Hidden for now, using category gradients instead
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
                                                        {imageSaving && ' (Saving...)'}
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
                                                        onChange={handleImageChange}
                                                        imagePosition={imagePosition}
                                                        onPositionChange={handlePositionChange}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    */}

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
                                                    {/* Attendee count warning */}
                                                    <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                        <p className="text-sm text-indigo-800">
                                                            <span className="font-medium">Currently {event.attendee_count} attending.</span>
                                                            {' '}If reducing capacity, use the{' '}
                                                            <Link href={`/events/${event.id}/attendees`} className="underline hover:no-underline">
                                                                Attendees page
                                                            </Link>
                                                            {' '}to manage.
                                                        </p>
                                                    </div>
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
                                                                            ? 'bg-indigo-500 text-white'
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
                                                            className="w-20 h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-center"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Guests Card - Hidden via feature flag */}
                                    {FEATURE_GUESTS_ENABLED && (
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
                                                                            ? 'bg-indigo-500 text-white'
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
                                    )}

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
                                                    <span className="font-medium text-slate-800">Attendee Requests</span>
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
                                                                preordersEnabled ? 'bg-indigo-500' : 'bg-slate-300'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                                                    preordersEnabled ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>

                                                    {/* Menu Images */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Menu Images
                                                        </label>
                                                        <MenuImageUpload
                                                            value={menuImages}
                                                            onChange={handleMenuImagesChange}
                                                        />
                                                        {menuImagesSaving && (
                                                            <p className="text-xs text-indigo-600 mt-1">Saving...</p>
                                                        )}
                                                    </div>

                                                    {/* Divider */}
                                                    <div className="relative">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <div className="w-full border-t border-slate-200" />
                                                        </div>
                                                        <div className="relative flex justify-center">
                                                            <span className="px-3 bg-white text-sm text-slate-500">or</span>
                                                        </div>
                                                    </div>

                                                    {/* Menu Link */}
                                                    <div>
                                                        <label htmlFor="menuLink" className="block text-sm font-medium text-slate-700 mb-2">
                                                            Link to online menu
                                                        </label>
                                                        <input
                                                            type="url"
                                                            id="menuLink"
                                                            value={menuLink}
                                                            onChange={(e) => setMenuLink(e.target.value)}
                                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                                            placeholder="https://restaurant.com/menu"
                                                        />
                                                        <p className="mt-1.5 text-sm text-slate-500">
                                                            External link opens in browser (if no images uploaded)
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
                                                                    const d = new Date(date + 'T12:00:00'); // Use noon to avoid timezone issues
                                                                    d.setDate(d.getDate() - days);
                                                                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
                                                                                ? 'bg-indigo-500 text-white'
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
                                                                        ? 'bg-indigo-500 text-white'
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
                                </div>
                            </div>

                            {/* ============================================================
                                SUBMIT BUTTONS
                            ============================================================ */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <Link
                                    href={`/events/${event.id}`}
                                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-center"
                                >
                                    Discard
                                </Link>
                            </div>
                        </form>

                        {/* ============================================================
                            DELETE EVENT
                        ============================================================ */}
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="text-sm text-slate-500 hover:text-red-600 transition"
                            >
                                Delete this event
                            </button>
                        </div>
                    </div>

                    {/* Sidebar - Hidden on mobile, shown on lg+ */}
                    <aside className="hidden lg:block lg:flex-[2]">
                        <div className="sticky top-8 space-y-4">
                            {/* Event Info Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 font-display">Event Info</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Group</span>
                                        <Link href={`/groups/${event.group_id}`} className="text-indigo-600 hover:text-indigo-700 font-medium">
                                            {event.group_name}
                                        </Link>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Attendees</span>
                                        <span className="text-slate-900 font-medium">{event.attendee_count}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Status</span>
                                        <span className="font-medium text-green-600">Active</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 font-display">Quick Links</h3>
                                <div className="space-y-2">
                                    <Link
                                        href={`/events/${event.id}`}
                                        className="block text-sm text-indigo-600 hover:text-indigo-700 transition"
                                    >
                                        View event page →
                                    </Link>
                                    <Link
                                        href={`/events/${event.id}/attendees`}
                                        className="block text-sm text-indigo-600 hover:text-indigo-700 transition"
                                    >
                                        Manage attendees →
                                    </Link>
                                    <Link
                                        href={`/groups/${event.group_id}`}
                                        className="block text-sm text-indigo-600 hover:text-indigo-700 transition"
                                    >
                                        View group →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => !cancelLoading && setShowDeleteModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                                Delete Event
                            </h3>
                            <p className="text-slate-600 text-center mb-6">
                                Are you sure you want to delete this event? This cannot be undone. All attendees will be notified.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={cancelLoading}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteEvent}
                                    disabled={cancelLoading}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition disabled:opacity-50"
                                >
                                    {cancelLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SidebarLayout>
    );
}
