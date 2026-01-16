'use client';

/*
=======================================================================================================================================
MenuImageUpload Component
=======================================================================================================================================
Multi-image upload for event menus. Uploads to Cloudinary and returns array of URLs.
Supports up to 10 images with add/remove functionality.
Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env vars.
=======================================================================================================================================
*/

import { useState, useRef } from 'react';
import Image from 'next/image';

interface MenuImageUploadProps {
    value: string[];
    onChange: (urls: string[]) => void;
    maxImages?: number;
    className?: string;
}

export default function MenuImageUpload({ value = [], onChange, maxImages = 10, className = '' }: MenuImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    const canAddMore = value.length < maxImages;

    const uploadToCloudinary = async (file: File) => {
        if (!cloudName || !uploadPreset) {
            setError('Upload not configured');
            return null;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return null;
        }

        // Validate file size (10MB max for menu photos - they can be detailed)
        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB');
            return null;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'mwf-menus');

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

            // Transform URL to apply max width 2000px and auto quality
            // Keep larger for menus since they need to be readable when zoomed
            const transformedUrl = data.secure_url.replace(
                '/upload/',
                '/upload/w_2000,c_limit,q_auto/'
            );
            return transformedUrl;
        } catch (err) {
            console.error('Upload error:', err);
            return null;
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Check how many we can add
        const availableSlots = maxImages - value.length;
        if (availableSlots <= 0) {
            setError(`Maximum ${maxImages} images allowed`);
            return;
        }

        const filesToUpload = files.slice(0, availableSlots);
        if (files.length > availableSlots) {
            setError(`Only ${availableSlots} more image(s) can be added`);
        }

        setIsUploading(true);
        setError(null);

        const uploadedUrls: string[] = [];
        for (const file of filesToUpload) {
            const url = await uploadToCloudinary(file);
            if (url) {
                uploadedUrls.push(url);
            }
        }

        if (uploadedUrls.length > 0) {
            onChange([...value, ...uploadedUrls]);
        } else if (filesToUpload.length > 0) {
            setError('Failed to upload image(s)');
        }

        setIsUploading(false);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (!canAddMore) {
            setError(`Maximum ${maxImages} images allowed`);
            return;
        }

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        const availableSlots = maxImages - value.length;
        const filesToUpload = files.slice(0, availableSlots);

        setIsUploading(true);
        setError(null);

        const uploadedUrls: string[] = [];
        for (const file of filesToUpload) {
            const url = await uploadToCloudinary(file);
            if (url) {
                uploadedUrls.push(url);
            }
        }

        if (uploadedUrls.length > 0) {
            onChange([...value, ...uploadedUrls]);
        } else if (filesToUpload.length > 0) {
            setError('Failed to upload image(s)');
        }

        setIsUploading(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (canAddMore) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleClick = () => {
        if (canAddMore) {
            fileInputRef.current?.click();
        }
    };

    const handleRemove = (index: number) => {
        const newUrls = value.filter((_, i) => i !== index);
        onChange(newUrls);
    };

    // Show configuration warning if env vars missing
    if (!cloudName || !uploadPreset) {
        return (
            <div className={`border-2 border-dashed border-yellow-300 rounded-lg p-4 bg-yellow-50 ${className}`}>
                <p className="text-sm text-yellow-700">
                    Image upload not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local
                </p>
            </div>
        );
    }

    return (
        <div className={className}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Image grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {/* Existing images */}
                {value.map((url, index) => (
                    <div key={url} className="relative aspect-[3/4] group">
                        <Image
                            src={url}
                            alt={`Menu page ${index + 1}`}
                            fill
                            className="object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white text-red-600 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {index + 1} of {value.length}
                        </div>
                    </div>
                ))}

                {/* Add more button */}
                {canAddMore && (
                    <div
                        onClick={handleClick}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`aspect-[3/4] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                            isDragging
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
                        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? (
                            <>
                                <svg className="w-8 h-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span className="text-xs text-slate-500">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="text-xs text-slate-500 text-center px-2">
                                    {value.length === 0 ? 'Add menu photos' : 'Add more'}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Helper text */}
            <p className="mt-2 text-xs text-slate-500">
                {value.length === 0
                    ? 'Upload photos of the menu (max 10 images)'
                    : `${value.length} of ${maxImages} images • Hover to remove`
                }
            </p>

            {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
