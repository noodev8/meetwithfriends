'use client';

/*
=======================================================================================================================================
ImageUpload Component
=======================================================================================================================================
Direct upload to Cloudinary without the branded widget.
Simple click/drag interface that uploads and returns the URL.
Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env vars.
=======================================================================================================================================
*/

import { useState, useRef } from 'react';

type ImagePosition = 'top' | 'center' | 'bottom';

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
    imagePosition?: ImagePosition;
    onPositionChange?: (position: ImagePosition) => void;
    className?: string;
}

export default function ImageUpload({ value, onChange, imagePosition = 'center', onPositionChange, className = '' }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    const uploadToCloudinary = async (file: File) => {
        if (!cloudName || !uploadPreset) {
            setError('Upload not configured');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'mwf-events');

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

            // Transform URL to apply max width 1200px and auto quality
            // Cloudinary URL format: .../upload/[transformations]/v123/folder/file.jpg
            const transformedUrl = data.secure_url.replace(
                '/upload/',
                '/upload/w_1200,c_limit,q_auto/'
            );
            onChange(transformedUrl);
        } catch (err) {
            setError('Failed to upload image');
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadToCloudinary(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            uploadToCloudinary(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemove = () => {
        onChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                onChange={handleFileSelect}
                className="hidden"
            />

            {value ? (
                <div className="space-y-2">
                    <div className="relative">
                        <img
                            src={value}
                            alt="Uploaded image"
                            className="w-full h-48 object-cover rounded-lg"
                            style={{ objectPosition: imagePosition }}
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                            <button
                                type="button"
                                onClick={handleClick}
                                disabled={isUploading}
                                className="px-3 py-1 bg-white text-gray-700 text-sm rounded-lg shadow hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Change
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={isUploading}
                                className="px-3 py-1 bg-white text-red-600 text-sm rounded-lg shadow hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                    {/* Position selector */}
                    {onPositionChange && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Crop position:</span>
                            <div className="flex gap-1">
                                {(['top', 'center', 'bottom'] as const).map((pos) => (
                                    <button
                                        key={pos}
                                        type="button"
                                        onClick={() => onPositionChange(pos)}
                                        className={`px-3 py-1 text-sm rounded-lg transition ${
                                            imagePosition === pos
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={handleClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                        isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isUploading ? (
                        <>
                            <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-gray-500">Uploading...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-500">Click or drag to upload</span>
                            <span className="text-xs text-gray-400">Recommended: 1200×630px · JPG, PNG or WebP (max 5MB)</span>
                        </>
                    )}
                </div>
            )}

            {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
