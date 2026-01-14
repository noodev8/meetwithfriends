'use client';

/*
=======================================================================================================================================
Terms of Service Page
=======================================================================================================================================
Terms of service for Meet With Friends, operated by Noodev8 Ltd.
=======================================================================================================================================
*/

import Footer from '@/components/layout/Footer';

export default function TermsPage() {
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
                        Terms of Service
                    </h1>
                    <p className="text-slate-600">
                        Last updated: January 2026
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Agreement to Terms
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            By accessing or using Meet With Friends, you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use our service. Meet With Friends
                            is operated by Noodev8 Ltd.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Description of Service
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            Meet With Friends is a platform that enables users to create and join social groups,
                            organise events, manage RSVPs, and coordinate food pre-orders. We provide the tools
                            to facilitate social gatherings but are not a party to any arrangements made between users.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            User Accounts
                        </h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>You must provide accurate and complete information when creating an account</li>
                            <li>You are responsible for maintaining the security of your account credentials</li>
                            <li>You must notify us immediately of any unauthorised access to your account</li>
                            <li>One person may only maintain one account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Acceptable Use
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            You agree not to use Meet With Friends to:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Post or share content that is illegal, harmful, threatening, abusive, or harassing</li>
                            <li>Distribute hate speech, discriminatory content, or content promoting violence</li>
                            <li>Send spam, unsolicited messages, or promotional content</li>
                            <li>Impersonate another person or entity</li>
                            <li>Attempt to gain unauthorised access to our systems or other users' accounts</li>
                            <li>Use the platform for any illegal activities</li>
                            <li>Interfere with or disrupt the service or servers</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Groups and Events
                        </h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Group organisers are responsible for managing their groups and members</li>
                            <li>Event hosts are responsible for the accuracy of event information</li>
                            <li>Any fees, payments, or financial arrangements between members, groups, or organisers are solely between those parties</li>
                            <li>Meet With Friends is not responsible for any transactions or disputes between users</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Platform Disclaimer
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Meet With Friends is a platform that connects people for social events. We are not responsible for:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>The conduct of any users, whether online or at events</li>
                            <li>The quality, safety, or legality of events organised through our platform</li>
                            <li>Any injuries, damages, or losses occurring at events</li>
                            <li>Any pricing, payments, or financial arrangements between users, groups, or organisers</li>
                            <li>The accuracy of information provided by users or event organisers</li>
                            <li>Food orders, dietary requirements, or any issues arising from pre-orders</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed mt-4">
                            Users attend events at their own risk and are encouraged to exercise appropriate caution.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Account Termination
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            We reserve the right to suspend or terminate your account at any time, without notice,
                            for conduct that we believe violates these Terms of Service, is harmful to other users,
                            or is otherwise inappropriate. You may also delete your account at any time through
                            your profile settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Limitation of Liability
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            To the maximum extent permitted by law, Noodev8 Ltd shall not be liable for any indirect,
                            incidental, special, consequential, or punitive damages, or any loss of profits or revenues,
                            whether incurred directly or indirectly, or any loss of data, use, goodwill, or other
                            intangible losses resulting from your use of the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Governing Law
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            These Terms of Service shall be governed by and construed in accordance with the laws
                            of England and Wales. Any disputes arising from these terms or your use of the service
                            shall be subject to the exclusive jurisdiction of the courts of England and Wales.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Changes to Terms
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            We may update these Terms of Service from time to time. We will notify you of any
                            significant changes by email or through a notice on our platform. Your continued use
                            of the service after changes become effective constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Contact Us
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have any questions about these Terms of Service, please contact us at:{' '}
                            <a href="mailto:noodev8@gmail.com" className="text-indigo-600 hover:text-indigo-700">
                                noodev8@gmail.com
                            </a>
                        </p>
                    </section>

                </div>
            </div>

            <Footer />
        </main>
    );
}
