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
import { useAuth } from '@/context/AuthContext';
import { updateProfile, changePassword, deleteAccount } from '@/lib/api/users';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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

        if (!cloudName || !uploadPreset) {
            setProfileError('Image upload not configured');
            return;
        }

        setIsUploadingAvatar(true);
        setProfileError('');

        try {
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
            <main className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            <div className="flex-1 py-6 sm:py-8 px-4 sm:px-8">
                <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-800">Profile Settings</h1>

                    {/* ================================================================
                        Profile Information Section
                    ================================================================ */}
                <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-stone-800 mb-4">Profile Information</h2>

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
                        <div className="flex flex-col items-center gap-3 pb-4 border-b border-stone-100">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                            <div className="relative">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={name || 'Profile'}
                                        className="w-24 h-24 rounded-full object-cover ring-4 ring-stone-100"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ring-4 ring-stone-100">
                                        <span className="text-3xl font-medium text-amber-600">
                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                {isUploadingAvatar && (
                                    <div className="absolute inset-0 bg-white bg-opacity-75 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
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
                                    className="px-4 py-1.5 text-sm bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition disabled:opacity-50"
                                >
                                    {avatarUrl ? 'Change photo' : 'Upload photo'}
                                </button>
                                {avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        disabled={isUploadingAvatar}
                                        className="px-4 py-1.5 text-sm text-red-600 hover:text-red-700 transition disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={user.email}
                                disabled
                                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-stone-400 mt-1">Email cannot be changed</p>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition"
                                placeholder="Tell us about yourself"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* ================================================================
                    Change Password Section
                ================================================================ */}
                <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-stone-800 mb-4">Change Password</h2>

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
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-stone-700 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                placeholder="Enter current password"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                                placeholder="Confirm new password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <p className="text-stone-600 mb-4">
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
                            <p className="text-stone-600 mb-4">
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
                                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                    placeholder="Enter your password"
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeletePassword('');
                                            setDeleteError('');
                                        }}
                                        className="flex-1 py-2.5 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition"
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

            <Footer />
        </main>
    );
}
