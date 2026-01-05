'use client';

/*
=======================================================================================================================================
Profile Page
=======================================================================================================================================
User profile management page. Allows users to:
- View and edit their profile (name, bio)
- Change their password
- Delete their account
- Logout
=======================================================================================================================================
*/

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, changePassword, deleteAccount } from '@/lib/api/users';

export default function ProfilePage() {
    const router = useRouter();
    const { user, token, isLoading, logout, updateUser } = useAuth();

    // =======================================================================
    // Profile edit state
    // =======================================================================
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
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
        }
    }, [user]);

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

        const result = await updateProfile(token, { name: name.trim(), bio });

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
    // Handle logout
    // =======================================================================
    const handleLogout = () => {
        logout();
        router.push('/');
    };

    // =======================================================================
    // Loading state
    // =======================================================================
    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading...</p>
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* ================================================================
                    Header with Logout
                ================================================================ */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Profile Settings</h1>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition"
                    >
                        Logout
                    </button>
                </div>

                {/* ================================================================
                    Profile Information Section
                ================================================================ */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Profile Information</h2>

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
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={user.email}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                placeholder="Tell us about yourself"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* ================================================================
                    Change Password Section
                ================================================================ */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Change Password</h2>

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
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Enter current password"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Confirm new password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>

                {/* ================================================================
                    Delete Account Section
                ================================================================ */}
                <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
                    <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>

                    {!showDeleteConfirm ? (
                        <div>
                            <p className="text-gray-600 mb-4">
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
                            <p className="text-gray-600 mb-4">
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                    placeholder="Enter your password"
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeletePassword('');
                                            setDeleteError('');
                                        }}
                                        className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
