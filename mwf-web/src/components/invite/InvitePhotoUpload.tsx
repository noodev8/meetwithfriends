'use client';

/*
=======================================================================================================================================
InvitePhotoUpload Component
=======================================================================================================================================
Photo upload interstitial shown when a group requires a profile image. Handles Cloudinary upload
and passes the transformed URL back to the parent for retry.
=======================================================================================================================================
*/

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface InvitePhotoUploadProps {
    groupName: string;
    isProcessing: boolean;
    error: string;
    onPhotoReady: (avatarUrl: string) => void;
}

export default function InvitePhotoUpload({
    groupName,
    isProcessing,
    error,
    onPhotoReady,
}: InvitePhotoUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Image must be under 5MB');
            return;
        }

        setUploadError('');
        setIsUploading(true);

        try {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

            if (!cloudName || !uploadPreset) {
                setUploadError('Image upload is not configured');
                setIsUploading(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'mwf-avatars');

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                { method: 'POST', body: formData }
            );

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            const transformedUrl = data.secure_url.replace(
                '/upload/',
                '/upload/w_200,h_200,c_fill,g_face,q_auto/'
            );

            setAvatarUrl(transformedUrl);
        } catch {
            setUploadError('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleContinue = () => {
        if (avatarUrl) {
            onPhotoReady(avatarUrl);
        }
    };

    const displayError = error || uploadError;

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 font-display">
                        One more thing...
                    </h1>
                    <p className="text-slate-500 mt-2">
                        <span className="font-semibold text-slate-700">{groupName}</span> requires members to have a profile photo
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    {displayError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {displayError}
                        </div>
                    )}

                    {/* Upload area */}
                    <div className="flex flex-col items-center">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {avatarUrl ? (
                            // Preview uploaded photo
                            <>
                                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-slate-200 mb-3">
                                    <Image
                                        src={avatarUrl}
                                        alt="Profile photo"
                                        width={128}
                                        height={128}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isProcessing}
                                    className="text-sm text-rose-600 hover:text-rose-700 font-medium mb-6"
                                >
                                    Change photo
                                </button>
                            </>
                        ) : (
                            // Upload placeholder
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 hover:border-rose-400 flex flex-col items-center justify-center transition mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? (
                                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg className="w-8 h-8 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span className="text-xs text-slate-400">Add photo</span>
                                    </>
                                )}
                            </button>
                        )}

                        {!avatarUrl && !isUploading && (
                            <p className="text-xs text-slate-400 mb-6">JPG, PNG or WebP (max 5MB)</p>
                        )}
                        {!avatarUrl && isUploading && (
                            <p className="text-xs text-slate-400 mb-6">Uploading...</p>
                        )}
                    </div>

                    {/* Continue button */}
                    <button
                        type="button"
                        onClick={handleContinue}
                        disabled={!avatarUrl || isProcessing}
                        className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Joining...' : 'Continue'}
                    </button>
                </div>

                {/* Footer branding */}
                <p className="text-center text-sm text-slate-400 mt-8">
                    Powered by <Link href="/" className="font-medium hover:text-slate-500">Meet With Friends</Link>
                </p>
            </div>
        </main>
    );
}
