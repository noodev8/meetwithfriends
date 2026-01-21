'use client';

/*
=======================================================================================================================================
Profile Page
=======================================================================================================================================
User profile management page. Allows users to:
- View and edit their profile (name, bio, avatar)
- Change their password
- Delete their account
- Logout
=======================================================================================================================================
*/

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, changePassword, deleteAccount, deleteImage } from '@/lib/api/users';
import SidebarLayout from '@/components/layout/SidebarLayout';

export default function ProfilePage() {
    const router = useRouter();
    const { user, token, isLoading, updateUser, logout } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // =======================================================================
    // Profile edit state
    // =======================================================================
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // =======================================================================
    // Contact details state
    // =======================================================================
    const [contactMobile, setContactMobile] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [showMobileToGuests, setShowMobileToGuests] = useState(false);
    const [showEmailToGuests, setShowEmailToGuests] = useState(false);
    const [receiveBroadcasts, setReceiveBroadcasts] = useState(true);
    const [contactError, setContactError] = useState('');
    const [contactSuccess, setContactSuccess] = useState('');
    const [isSavingContact, setIsSavingContact] = useState(false);

    // =======================================================================
    // Password change state
    // =======================================================================
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // =======================================================================
    // Delete account state
    // =======================================================================
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // =======================================================================
    // Redirect to login if not authenticated
    // =======================================================================
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [isLoading, user, router]);

    // =======================================================================
    // Initialize form with user data
    // =======================================================================
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setBio(user.bio || '');
            setAvatarUrl(user.avatar_url || '');
            setContactMobile(user.contact_mobile || '');
            setContactEmail(user.contact_email || '');
            setShowMobileToGuests(user.show_mobile_to_guests || false);
            setShowEmailToGuests(user.show_email_to_guests || false);
            setReceiveBroadcasts(user.receive_broadcasts !== false);
        }
    }, [user]);

    // =======================================================================
    // Handle avatar upload
    // =======================================================================
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setProfileError('Please select an image file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setProfileError('Image must be less than 5MB');
            return;
        }

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        // DEBUG: Log env var status
        console.log('DEBUG Cloudinary config:', {
            cloudName: cloudName ? `SET (${cloudName.substring(0, 4)}...)` : 'NOT SET',
            uploadPreset: uploadPreset ? `SET (${uploadPreset.substring(0, 4)}...)` : 'NOT SET',
        });

        if (!cloudName || !uploadPreset) {
            setProfileError(`Image upload not configured - cloudName: ${!!cloudName}, preset: ${!!uploadPreset}`);
            return;
        }

        setIsUploadingAvatar(true);
        setProfileError('');

        try {
            // Delete old avatar from Cloudinary if exists
            if (avatarUrl && token) {
                await deleteImage(token, avatarUrl).catch(() => {});
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'mwf-avatars');

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();

            // Transform URL to apply 200x200 crop for avatar
            const transformedUrl = data.secure_url.replace(
                '/upload/',
                '/upload/w_200,h_200,c_fill,g_face,q_auto/'
            );
            setAvatarUrl(transformedUrl);

            // Auto-save the avatar
            if (token) {
                const result = await updateProfile(token, { avatar_url: transformedUrl });
                if (result.success && result.data) {
                    updateUser(result.data);
                    setProfileSuccess('Profile photo updated');
                } else {
                    setProfileError(result.error || 'Failed to save profile photo');
                }
            }
        } catch (err) {
            setProfileError('Failed to upload image');
            console.error('Avatar upload error:', err);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // =======================================================================
    // Handle avatar removal
    // =======================================================================
    const handleRemoveAvatar = async () => {
        if (!token) return;

        setIsUploadingAvatar(true);
        setProfileError('');
        setProfileSuccess('');

        // Delete from Cloudinary first (ignore errors - clearing DB is more important)
        if (avatarUrl) {
            await deleteImage(token, avatarUrl).catch(() => {});
        }

        const result = await updateProfile(token, { avatar_url: '' });
        if (result.success && result.data) {
            updateUser(result.data);
            setAvatarUrl('');
            setProfileSuccess('Profile photo removed');
        } else {
            setProfileError(result.error || 'Failed to remove profile photo');
        }

        setIsUploadingAvatar(false);
    };

    // =======================================================================
    // Handle profile update
    // =======================================================================
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');

        if (!name.trim()) {
            setProfileError('Name cannot be empty');
            return;
        }

        if (!token) return;

        setIsSavingProfile(true);

        const result = await updateProfile(token, {
            name: name.trim(),
            bio,
            avatar_url: avatarUrl || undefined
        });

        if (result.success && result.data) {
            updateUser(result.data);
            setProfileSuccess('Profile updated successfully');
        } else {
            setProfileError(result.error || 'Failed to update profile');
        }

        setIsSavingProfile(false);
    };

    // =======================================================================
    // Handle contact details update
    // =======================================================================
    const handleUpdateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactError('');
        setContactSuccess('');

        if (!token) return;

        setIsSavingContact(true);

        const result = await updateProfile(token, {
            contact_mobile: contactMobile,
            contact_email: contactEmail,
            show_mobile_to_guests: showMobileToGuests,
            show_email_to_guests: showEmailToGuests,
            receive_broadcasts: receiveBroadcasts
        });

        if (result.success && result.data) {
            updateUser(result.data);
            setContactSuccess('Contact details updated successfully');
        } else {
            setContactError(result.error || 'Failed to update contact details');
        }

        setIsSavingContact(false);
    };

    // =======================================================================
    // Handle password change
    // =======================================================================
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword || !newPassword) {
            setPasswordError('Please fill in all password fields');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (!token) return;

        setIsChangingPassword(true);

        const result = await changePassword(token, currentPassword, newPassword);

        if (result.success) {
            setPasswordSuccess('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setPasswordError(result.error || 'Failed to change password');
        }

        setIsChangingPassword(false);
    };

    // =======================================================================
    // Handle account deletion
    // =======================================================================
    const handleDeleteAccount = async () => {
        setDeleteError('');

        if (!deletePassword) {
            setDeleteError('Please enter your password to confirm');
            return;
        }

        if (!token) return;

        setIsDeleting(true);

        const result = await deleteAccount(token, deletePassword);

        if (result.success) {
            logout();
            router.push('/');
        } else {
            setDeleteError(result.error || 'Failed to delete account');
        }

        setIsDeleting(false);
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <SidebarLayout>
            <div className="py-6 sm:py-8 px-4 sm:px-8">
                <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-800">Profile Settings</h1>

                    {/* ================================================================
                        Profile Information Section
                    ================================================================ */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Profile Information</h2>

                    {profileError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {profileError}
                        </div>
                    )}

                    {profileSuccess && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
                            {profileSuccess}
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                            <div className="relative">
                                {avatarUrl ? (
                                    <div className="relative w-24 h-24">
                                        <Image
                                            src={avatarUrl}
                                            alt={name || 'Profile'}
                                            fill
                                            className="rounded-full object-cover ring-4 ring-slate-100"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center ring-4 ring-slate-100">
                                        <span className="text-3xl font-medium text-indigo-600">
                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                {isUploadingAvatar && (
                                    <div className="absolute inset-0 bg-white bg-opacity-75 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                    className="px-4 py-2.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
                                >
                                    {avatarUrl ? 'Change photo' : 'Upload photo'}
                                </button>
                                {avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        disabled={isUploadingAvatar}
                                        className="px-4 py-2.5 text-sm text-red-600 hover:text-red-700 transition disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={user.email}
                                disabled
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition"
                                placeholder="Tell us about yourself"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* ================================================================
                    Contact Details Section
                ================================================================ */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">Contact Details</h2>
                    <p className="text-sm text-slate-500 mb-4">
                        Add contact details for guests to reach you when you host events.
                    </p>

                    {contactError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {contactError}
                        </div>
                    )}

                    {contactSuccess && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
                            {contactSuccess}
                        </div>
                    )}

                    <form onSubmit={handleUpdateContact} className="space-y-4">
                        <div>
                            <label htmlFor="contactMobile" className="block text-sm font-medium text-slate-700 mb-1">
                                Mobile Number
                            </label>
                            <input
                                type="tel"
                                id="contactMobile"
                                value={contactMobile}
                                onChange={(e) => setContactMobile(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="+61 412 345 678"
                            />
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showMobileToGuests"
                                    checked={showMobileToGuests}
                                    onChange={(e) => setShowMobileToGuests(e.target.checked)}
                                    className="w-4 h-4 text-indigo-500 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="showMobileToGuests" className="text-sm text-slate-600">
                                    Show mobile number to guests on my events
                                </label>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700 mb-1">
                                Contact Email
                            </label>
                            <input
                                type="email"
                                id="contactEmail"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="contact@example.com"
                            />
                            <p className="text-xs text-slate-400 mt-1">Can be different from your login email</p>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showEmailToGuests"
                                    checked={showEmailToGuests}
                                    onChange={(e) => setShowEmailToGuests(e.target.checked)}
                                    className="w-4 h-4 text-indigo-500 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="showEmailToGuests" className="text-sm text-slate-600">
                                    Show email to guests on my events
                                </label>
                            </div>
                        </div>

                        {/* Email Preferences */}
                        <div className="pt-4 border-t border-slate-200">
                            <h3 className="text-sm font-medium text-slate-700 mb-3">Email Preferences</h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="receiveBroadcasts"
                                    checked={receiveBroadcasts}
                                    onChange={(e) => setReceiveBroadcasts(e.target.checked)}
                                    className="w-4 h-4 text-indigo-500 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="receiveBroadcasts" className="text-sm text-slate-600">
                                    Receive group announcements and updates
                                </label>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 ml-6">
                                Uncheck to stop receiving broadcast emails from group organisers
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingContact}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingContact ? 'Saving...' : 'Save Contact Details'}
                        </button>
                    </form>
                </div>

                {/* ================================================================
                    Change Password Section
                ================================================================ */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h2>

                    {passwordError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {passwordError}
                        </div>
                    )}

                    {passwordSuccess && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
                            {passwordSuccess}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="Enter current password"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="Confirm new password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>

                {/* ================================================================
                    Delete Account Section
                ================================================================ */}
                <div className="bg-white rounded-2xl border border-red-200 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>

                    {!showDeleteConfirm ? (
                        <div>
                            <p className="text-slate-600 mb-4">
                                Once you delete your account, there is no going back. Please be certain.
                            </p>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                            >
                                Delete Account
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-slate-600 mb-4">
                                Enter your password to confirm account deletion. This action is irreversible.
                            </p>

                            {deleteError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                                    {deleteError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                    placeholder="Enter your password"
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeletePassword('');
                                            setDeleteError('');
                                        }}
                                        className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting}
                                        className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
