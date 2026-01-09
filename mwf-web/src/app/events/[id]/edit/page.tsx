'use client';

/*
=======================================================================================================================================
Edit Event Page
=======================================================================================================================================
Form for editing an existing event. Only accessible to the event creator or group organiser.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEvent, updateEvent, EventWithDetails } from '@/lib/api/events';
import Header from '@/components/layout/Header';
import ImageUpload from '@/components/ui/ImageUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';

export default function EditEventPage() {
    const { token } = useAuth();
    const router = useRouter();
    const params = useParams();

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [canEdit, setCanEdit] = useState(false);
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
    const [imageSaving, setImageSaving] = useState(false);
    const [allowGuests, setAllowGuests] = useState(false);
    const [maxGuestsPerRsvp, setMaxGuestsPerRsvp] = useState(1);
    const [preordersEnabled, setPreordersEnabled] = useState(false);
    const [menuLink, setMenuLink] = useState('');
    const [preorderCutoffDate, setPreorderCutoffDate] = useState('');
    const [preorderCutoffTime, setPreorderCutoffTime] = useState('');

    // =======================================================================
    // Fetch event details
    // =======================================================================
    useEffect(() => {
        async function fetchEvent() {
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

                // Parse date and time
                const eventDate = new Date(evt.date_time);
                setDate(eventDate.toISOString().split('T')[0]);
                setTime(eventDate.toTimeString().slice(0, 5));

                setCapacity(evt.capacity?.toString() || '');
                setImageUrl(evt.image_url || null);
                setImagePosition(evt.image_position || 'center');
                setAllowGuests(evt.allow_guests || false);
                setMaxGuestsPerRsvp(evt.max_guests_per_rsvp || 1);
                setPreordersEnabled(evt.preorders_enabled || false);
                setMenuLink(evt.menu_link || '');

                // Parse preorder cutoff date and time
                if (evt.preorder_cutoff) {
                    const cutoffDate = new Date(evt.preorder_cutoff);
                    setPreorderCutoffDate(cutoffDate.toISOString().split('T')[0]);
                    setPreorderCutoffTime(cutoffDate.toTimeString().slice(0, 5));
                }
            } else {
                setError(result.error || 'Event not found');
            }
            setLoading(false);
        }
        fetchEvent();
    }, [params.id, token]);

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
            image_url: imageUrl,
            image_position: imagePosition,
            allow_guests: allowGuests,
            max_guests_per_rsvp: allowGuests ? maxGuestsPerRsvp : undefined,
            preorders_enabled: preordersEnabled,
            menu_link: preordersEnabled ? (menuLink.trim() || null) : null,
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
    // Loading state
    // =======================================================================
    if (loading) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-600 mt-4">Loading event...</p>
            </main>
        );
    }

    // =======================================================================
    // Error/unauthorized state
    // =======================================================================
    if (!event || !canEdit) {
        return (
            <main className="min-h-screen flex flex-col bg-stone-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-stone-900 mb-2">Access Denied</h1>
                        <p className="text-stone-600 mb-6">
                            {error || 'You do not have permission to edit this event'}
                        </p>
                        {event && (
                            <Link
                                href={`/events/${event.id}`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                            >
                                Back to event
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    // =======================================================================
    // Get min date (today)
    // =======================================================================
    const today = new Date().toISOString().split('T')[0];

    // =======================================================================
    // Edit event form
    // =======================================================================
    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            {/* Page Header */}
            <div className="bg-white border-b border-stone-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
                    <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to event
                    </Link>
                    <p className="text-sm font-medium text-stone-500 mb-1">Edit Event</p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-display">
                        {event.title}
                    </h1>
                </div>
            </div>

            {/* Form with Tips Sidebar */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Main Form */}
                    <div className="flex-[3]">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
                            {/* Error message */}
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
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
                                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
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
                                        min={today}
                                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="time" className="block text-sm font-medium text-stone-700 mb-2">
                                        Time *
                                    </label>
                                    <input
                                        type="time"
                                        id="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                        required
                                    />
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
                                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                    placeholder="e.g., The Beacon Hotel, Copthorne"
                                />
                            </div>

                            {/* Featured Image */}
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">
                                    Featured Image
                                    {imageSaving && (
                                        <span className="ml-2 text-xs text-amber-600">Saving...</span>
                                    )}
                                </label>
                                <ImageUpload
                                    value={imageUrl}
                                    onChange={handleImageChange}
                                    imagePosition={imagePosition}
                                    onPositionChange={handlePositionChange}
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
                                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                    placeholder="Leave empty for unlimited"
                                />
                                <p className="mt-2 text-sm text-stone-500">
                                    Leave empty for unlimited capacity. If set, a waitlist will be used when full.
                                </p>
                            </div>

                            {/* Guest Options */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="allowGuests"
                                        checked={allowGuests}
                                        onChange={(e) => setAllowGuests(e.target.checked)}
                                        className="w-5 h-5 text-amber-500 border-stone-300 rounded focus:ring-amber-500"
                                    />
                                    <label htmlFor="allowGuests" className="text-sm font-medium text-stone-700">
                                        Allow members to bring guests
                                    </label>
                                </div>

                                {allowGuests && (
                                    <div className="ml-8">
                                        <label htmlFor="maxGuests" className="block text-sm font-medium text-stone-700 mb-2">
                                            Maximum guests per RSVP
                                        </label>
                                        <select
                                            id="maxGuests"
                                            value={maxGuestsPerRsvp}
                                            onChange={(e) => setMaxGuestsPerRsvp(parseInt(e.target.value, 10))}
                                            className="w-32 px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                        >
                                            <option value={1}>1</option>
                                            <option value={2}>2</option>
                                            <option value={3}>3</option>
                                            <option value={4}>4</option>
                                            <option value={5}>5</option>
                                        </select>
                                        <p className="mt-2 text-sm text-stone-500">
                                            Guests count towards event capacity.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Pre-orders Section */}
                            <div className="border-t border-stone-200 pt-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <input
                                        type="checkbox"
                                        id="preordersEnabled"
                                        checked={preordersEnabled}
                                        onChange={(e) => setPreordersEnabled(e.target.checked)}
                                        className="w-5 h-5 text-amber-500 border-stone-300 rounded focus:ring-amber-500"
                                    />
                                    <label htmlFor="preordersEnabled" className="text-lg font-semibold text-stone-900 font-display">
                                        Enable pre-orders
                                    </label>
                                </div>
                                <p className="text-sm text-stone-500 mb-4">
                                    Allow attendees to submit food orders before the event.
                                </p>

                                {preordersEnabled && (
                                    <div className="space-y-4 ml-8">
                                        <div>
                                            <label htmlFor="menuLink" className="block text-sm font-medium text-stone-700 mb-2">
                                                Menu Link (optional)
                                            </label>
                                            <input
                                                type="url"
                                                id="menuLink"
                                                value={menuLink}
                                                onChange={(e) => setMenuLink(e.target.value)}
                                                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                                placeholder="https://restaurant.com/menu"
                                            />
                                            <p className="mt-2 text-sm text-stone-500">
                                                Share a link to the menu, or leave empty if sharing another way.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-stone-700 mb-2">
                                                Order Cutoff (optional)
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <input
                                                    type="date"
                                                    value={preorderCutoffDate}
                                                    onChange={(e) => setPreorderCutoffDate(e.target.value)}
                                                    min={today}
                                                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                                />
                                                <input
                                                    type="time"
                                                    value={preorderCutoffTime}
                                                    onChange={(e) => setPreorderCutoffTime(e.target.value)}
                                                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                                                />
                                            </div>
                                            <p className="mt-2 text-sm text-stone-500">
                                                Set a deadline for orders. Leave empty for no deadline.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <Link
                                    href={`/events/${event.id}`}
                                    className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition text-center font-medium"
                                >
                                    Cancel
                                </Link>
                            </div>
                        </form>
                    </div>

                    {/* Tips Sidebar */}
                    <div className="flex-[2] space-y-6">
                        {/* Event Info Card */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-stone-900 mb-3 font-display">Event Info</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Group</span>
                                    <Link href={`/groups/${event.group_id}`} className="text-amber-600 hover:text-amber-700 font-medium">
                                        {event.group_name}
                                    </Link>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Attendees</span>
                                    <span className="text-stone-900 font-medium">{event.attendee_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Status</span>
                                    <span className={`font-medium ${event.status === 'cancelled' ? 'text-red-600' : 'text-green-600'}`}>
                                        {event.status === 'cancelled' ? 'Cancelled' : 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
                            <h3 className="font-semibold text-amber-900 mb-4 font-display">Tips for a Great Event</h3>
                            <ul className="space-y-3 text-sm text-amber-800">
                                <li className="flex gap-2">
                                    <span className="text-amber-500">•</span>
                                    <span>Keep the title clear and descriptive so members know what to expect.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-amber-500">•</span>
                                    <span>Include the full address in the location field for easy navigation.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-amber-500">•</span>
                                    <span>Set capacity to manage group size and create a waitlist automatically.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-amber-500">•</span>
                                    <span>Use the description to share any special instructions or dress code.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Pre-orders Tip */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-stone-900 mb-3 font-display">About Pre-orders</h3>
                            <p className="text-sm text-stone-600 mb-3">
                                Pre-orders let attendees submit food choices before the event, making it easier to coordinate with restaurants.
                            </p>
                            <ul className="space-y-2 text-sm text-stone-600">
                                <li className="flex gap-2">
                                    <span className="text-amber-500">•</span>
                                    <span>Set a cutoff to give yourself time to submit orders</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-amber-500">•</span>
                                    <span>Hosts can view and edit all attendee orders</span>
                                </li>
                            </ul>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-stone-900 mb-3 font-display">Quick Links</h3>
                            <div className="space-y-2">
                                <Link
                                    href={`/events/${event.id}`}
                                    className="block text-sm text-amber-600 hover:text-amber-700 transition"
                                >
                                    View event page →
                                </Link>
                                <Link
                                    href={`/groups/${event.group_id}`}
                                    className="block text-sm text-amber-600 hover:text-amber-700 transition"
                                >
                                    View group →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
