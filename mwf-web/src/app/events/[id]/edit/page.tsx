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
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Error/unauthorized state
    // =======================================================================
    if (!event || !canEdit) {
        return (
            <main className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-gray-600 mb-4">
                        {error || 'You do not have permission to edit this event'}
                    </p>
                    {event && (
                        <Link href={`/events/${event.id}`} className="text-blue-600 hover:text-blue-700">
                            Back to event
                        </Link>
                    )}
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
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Page Header */}
            <div className="bg-white border-b">
                <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6">
                    <div className="mb-4">
                        <Link
                            href={`/events/${event.id}`}
                            className="text-blue-600 hover:text-blue-700"
                        >
                            &larr; Back to event
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Edit Event
                    </h1>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto w-full">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-6">
                    {/* Error message */}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Event Title *
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Friday Evening Dinner"
                            maxLength={200}
                            required
                        />
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                                Date *
                            </label>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={today}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                                Time *
                            </label>
                            <input
                                type="time"
                                id="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                            Location
                        </label>
                        <input
                            type="text"
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., The Beacon Hotel, Copthorne"
                        />
                    </div>

                    {/* Featured Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Featured Image
                            {imageSaving && (
                                <span className="ml-2 text-xs text-blue-600">Saving...</span>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                            Capacity
                        </label>
                        <input
                            type="number"
                            id="capacity"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            min={1}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Leave empty for unlimited"
                        />
                        <p className="mt-1 text-sm text-gray-500">
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
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="allowGuests" className="text-sm font-medium text-gray-700">
                                Allow members to bring guests
                            </label>
                        </div>

                        {allowGuests && (
                            <div className="ml-8">
                                <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700 mb-2">
                                    Maximum guests per RSVP
                                </label>
                                <select
                                    id="maxGuests"
                                    value={maxGuestsPerRsvp}
                                    onChange={(e) => setMaxGuestsPerRsvp(parseInt(e.target.value, 10))}
                                    className="w-32 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                    <option value={4}>4</option>
                                    <option value={5}>5</option>
                                </select>
                                <p className="mt-1 text-sm text-gray-500">
                                    Guests count towards event capacity.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <Link
                            href={`/events/${event.id}`}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
