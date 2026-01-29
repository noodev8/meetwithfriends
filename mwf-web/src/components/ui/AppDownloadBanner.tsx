'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
}

export default function AppDownloadBanner() {
    const [visible, setVisible] = useState(false);
    const [platform, setPlatform] = useState<Platform>('desktop');

    useEffect(() => {
        if (localStorage.getItem('show_app_download') === 'true') {
            setVisible(true);
            setPlatform(detectPlatform());
        }
    }, []);

    if (!visible) return null;

    const dismiss = () => {
        localStorage.removeItem('show_app_download');
        setVisible(false);
    };

    const showApple = platform === 'ios' || platform === 'desktop';
    const showGoogle = platform === 'android' || platform === 'desktop';

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex items-center gap-4">
                {/* Icon */}
                <span className="text-2xl flex-shrink-0" aria-hidden="true">📱</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                        Get the app for a better experience
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                        {showGoogle && (
                            <a
                                href="https://play.google.com/store/apps/details?id=com.noodev8.meetwithfriends"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-[40px] hover:opacity-80 transition-opacity"
                            >
                                <Image
                                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                                    alt="Get it on Google Play"
                                    width={180}
                                    height={60}
                                    className="h-[60px] w-auto -my-[10px]"
                                    unoptimized
                                />
                            </a>
                        )}
                        {showApple && (
                            <a
                                href="https://apps.apple.com/gb/app/id6757886965"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-[40px] hover:opacity-80 transition-opacity"
                            >
                                <Image
                                    src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                                    alt="Download on the App Store"
                                    width={120}
                                    height={40}
                                    className="h-full w-auto"
                                    unoptimized
                                />
                            </a>
                        )}
                    </div>
                </div>

                {/* Dismiss */}
                <button
                    onClick={dismiss}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Dismiss"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
