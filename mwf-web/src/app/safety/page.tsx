'use client';

/*
=======================================================================================================================================
Child Safety Standards Page
=======================================================================================================================================
Child safety standards for Meet With Friends, as required by Google Play for social apps.
=======================================================================================================================================
*/

import Footer from '@/components/layout/Footer';

export default function SafetyPage() {
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
                        Child Safety Standards
                    </h1>
                    <p className="text-slate-600">
                        Last updated: January 2026
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Our Commitment
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            Meet With Friends is committed to providing a safe environment for all users.
                            We have zero tolerance for child sexual abuse and exploitation (CSAE) content
                            or behaviour on our platform. We actively work to prevent, detect, and remove
                            any such content and to report it to the appropriate authorities.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Age Requirements
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Meet With Friends is intended for users aged 13 and over. By creating an account,
                            you confirm that you are at least 13 years old.
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Users must be 13 or older to create an account</li>
                            <li>Users aged 13-17 should have parental or guardian consent</li>
                            <li>We do not knowingly collect information from anyone under 13</li>
                            <li>Accounts found to belong to users under 13 will be terminated</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Prohibited Content and Behaviour
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            The following is strictly prohibited on Meet With Friends:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Any content that sexually exploits or endangers children</li>
                            <li>Child sexual abuse material (CSAM) of any kind</li>
                            <li>Content that sexualises minors</li>
                            <li>Grooming behaviour or attempts to contact minors inappropriately</li>
                            <li>Sharing, requesting, or distributing CSAE content</li>
                            <li>Any activity that facilitates child exploitation</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            How to Report
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            If you encounter any content or behaviour that violates these standards,
                            please report it immediately:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>
                                <strong>Email:</strong>{' '}
                                <a href="mailto:noodev8@gmail.com" className="text-indigo-600 hover:text-indigo-700">
                                    noodev8@gmail.com
                                </a>
                            </li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed mt-4">
                            When reporting, please include as much detail as possible, including usernames,
                            event names, and descriptions of the content or behaviour.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Our Response
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            When we receive a report or detect potential CSAE content, we take immediate action:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Immediate removal of violating content</li>
                            <li>Immediate suspension of accounts involved</li>
                            <li>Permanent ban of users who violate these standards</li>
                            <li>Reporting to the National Crime Agency (NCA) and other relevant authorities</li>
                            <li>Cooperation with law enforcement investigations</li>
                            <li>Preservation of evidence as required by law</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Prevention Measures
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We implement the following measures to protect children:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Minimum age requirement of 13 years</li>
                            <li>Content moderation of user-generated content</li>
                            <li>Clear community guidelines prohibiting harmful content</li>
                            <li>Easy-to-use reporting mechanisms</li>
                            <li>Regular review and updates of our safety policies</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            External Resources
                        </h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            If you suspect child abuse or exploitation, you can also report to:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>
                                <strong>UK:</strong> National Crime Agency CEOP{' '}
                                <a href="https://www.ceop.police.uk/ceop-reporting/" className="text-indigo-600 hover:text-indigo-700" target="_blank" rel="noopener noreferrer">
                                    ceop.police.uk
                                </a>
                            </li>
                            <li>
                                <strong>International:</strong> National Center for Missing & Exploited Children{' '}
                                <a href="https://www.missingkids.org/gethelpnow/cybertipline" className="text-indigo-600 hover:text-indigo-700" target="_blank" rel="noopener noreferrer">
                                    CyberTipline
                                </a>
                            </li>
                            <li>
                                <strong>Internet Watch Foundation:</strong>{' '}
                                <a href="https://www.iwf.org.uk/" className="text-indigo-600 hover:text-indigo-700" target="_blank" rel="noopener noreferrer">
                                    iwf.org.uk
                                </a>
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Contact Us
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            For questions about our child safety standards or to report concerns,
                            please contact us at:{' '}
                            <a href="mailto:noodev8@gmail.com" className="text-indigo-600 hover:text-indigo-700">
                                noodev8@gmail.com
                            </a>
                        </p>
                        <p className="text-slate-600 leading-relaxed mt-4">
                            <strong>Noodev8 Ltd</strong><br />
                            United Kingdom
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                            Policy Updates
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            We regularly review and update our child safety standards to ensure they
                            remain effective and compliant with applicable laws and platform requirements.
                            Any significant changes will be reflected on this page with an updated date.
                        </p>
                    </section>

                </div>
            </div>

            <Footer />
        </main>
    );
}
