'use client';

/*
=======================================================================================================================================
Privacy Policy Page
=======================================================================================================================================
Privacy policy for Meet With Friends, operated by Noodev8 Ltd.
=======================================================================================================================================
*/

import Footer from '@/components/layout/Footer';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen flex flex-col bg-slate-50">
            {/* Simple header */}
            <header className="px-4 sm:px-8 py-4 bg-white border-b border-slate-200">
                <span className="font-display text-xl font-bold text-slate-800">
                    Meet With Friends
                </span>
            </header>

            <div className="flex-1 px-4 sm:px-8 py-8 sm:py-12 max-w-3xl mx-auto w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-3">
                        Privacy Policy
                    </h1>
                    <p className="text-slate-600">
                        Last updated: January 2026
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Who We Are
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            Meet With Friends is operated by Noodev8 Ltd. We provide a platform for organising
                            social events and group activities. This privacy policy explains how we collect,
                            use, and protect your personal information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Information We Collect
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We collect information you provide directly to us:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>Account information:</strong> Email address, name, password</li>
                            <li><strong>Profile information:</strong> Bio, profile photo (optional)</li>
                            <li><strong>Contact details:</strong> Mobile number, contact email (optional)</li>
                            <li><strong>Event data:</strong> RSVPs, comments, food orders</li>
                            <li><strong>Usage data:</strong> Login times, pages visited (for service improvement)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            How We Use Your Information
                        </h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>To provide and maintain our service</li>
                            <li>To send you event notifications and updates</li>
                            <li>To enable communication between group members</li>
                            <li>To process food pre-orders for events</li>
                            <li>To improve our platform and user experience</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Third-Party Services
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We use the following third-party services to operate our platform:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>Cloudinary:</strong> Image hosting for profile photos and event images</li>
                            <li><strong>Resend:</strong> Email delivery for notifications and updates</li>
                            <li><strong>Stripe:</strong> Payment processing (for events with deposits)</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed mt-4">
                            These services have their own privacy policies governing their use of your data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Data Retention
                        </h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>Account deletion:</strong> When you delete your account, your personal data is removed immediately</li>
                            <li><strong>Inactive accounts:</strong> We may remove accounts that have been inactive for more than 1 year</li>
                            <li><strong>Event data:</strong> Events and associated data (comments, RSVPs) older than 6 months may be deleted</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Your Rights (GDPR)
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Under UK and EU data protection law, you have the right to:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Access the personal data we hold about you</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Object to processing of your data</li>
                            <li>Request data portability</li>
                            <li>Withdraw consent at any time</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Cookies
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            We use essential cookies to keep you logged in and remember your preferences.
                            We do not use tracking or advertising cookies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Data Security
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            We implement appropriate security measures to protect your personal information.
                            Passwords are encrypted and we use secure connections (HTTPS) for all data transfers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Contact Us
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have any questions about this privacy policy or wish to exercise your rights,
                            please contact us at:{' '}
                            <a href="mailto:noodev8@gmail.com" className="text-indigo-600 hover:text-indigo-700">
                                noodev8@gmail.com
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Changes to This Policy
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            We may update this privacy policy from time to time. We will notify you of any
                            significant changes by email or through a notice on our platform.
                        </p>
                    </section>

                </div>
            </div>

            <Footer />
        </main>
    );
}
