'use client';

/*
=======================================================================================================================================
Create Event Page
=======================================================================================================================================
Form for creating a new event within a group. Only accessible to organisers and hosts.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroup, GroupWithCount, GroupMembership } from '@/lib/api/groups';
import { createEvent } from '@/lib/api/events';
import Header from '@/components/layout/Header';

export default function CreateEventPage() {
    const { token } = useAuth();
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

    // Check if user can create events
    const canCreateEvents = membership?.status === 'active' &&
        (membership?.role === 'organiser' || membership?.role === 'host');

    // =======================================================================
    // Fetch group details
    // =======================================================================
    useEffect(() => {
        async function fetchGroup() {
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
    }, [params.id, token]);

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

        setSubmitting(true);
        setError(null);

        const result = await createEvent(token, {
            group_id: group.id,
            title: title.trim(),
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            date_time: dateTime.toISOString(),
            capacity: capacity ? parseInt(capacity, 10) : undefined,
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
            <main className="min-h-screen flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    // =======================================================================
    // Error/unauthorized state
    // =======================================================================
    if (!group || !canCreateEvents) {
        return (
            <main className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-gray-600 mb-4">
                        {error || 'You do not have permission to create events in this group'}
                    </p>
                    {group && (
                        <Link href={`/groups/${group.id}`} className="text-blue-600 hover:text-blue-700">
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
        <main className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Page Header */}
            <div className="bg-white border-b">
                <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6">
                    <div className="mb-4">
                        <Link
                            href={`/groups/${group.id}`}
                            className="text-blue-600 hover:text-blue-700"
                        >
                            &larr; Back to {group.name}
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Create Event
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
                                min={minDate}
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

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

                    {/* Submit */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {submitting ? 'Creating...' : 'Create Event'}
                        </button>
                        <Link
                            href={`/groups/${group.id}`}
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
