'use client';

/*
=======================================================================================================================================
Help Page
=======================================================================================================================================
Help center with FAQ, contact information, and links to policies.
=======================================================================================================================================
*/

import Link from 'next/link';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface FAQItem {
    question: string;
    answer: string;
}

const faqs: FAQItem[] = [
    {
        question: 'How do I create a group?',
        answer: 'Click "Create a Group" from the dashboard or navigation menu. Fill in your group name, description, and choose whether it\'s public or requires approval to join. You\'ll automatically become the organiser.',
    },
    {
        question: 'What\'s the difference between an Organiser and a Host?',
        answer: 'The Organiser owns the group and has full control - they can edit group settings, manage members, and delete the group. Hosts can create and manage events but cannot change group settings or remove other hosts.',
    },
    {
        question: 'How do I create an event?',
        answer: 'Go to your group page and click "Create Event". You\'ll need to be an Organiser or Host of the group. Set the title, date, location, and optionally add a capacity limit, featured image, or enable pre-orders.',
    },
    {
        question: 'What happens when an event is full?',
        answer: 'When an event reaches capacity, new RSVPs are added to a waitlist. If someone cancels, the first person on the waitlist is automatically moved to the attending list.',
    },
    {
        question: 'Can I bring guests to an event?',
        answer: 'If the event host has enabled guests, you\'ll see an option to add guests when you RSVP. The number of guests you can bring depends on what the host has set (usually 1-5).',
    },
    {
        question: 'How do pre-orders work?',
        answer: 'For food-focused events, hosts can enable pre-orders. Attendees can submit their food choices before a cutoff deadline. Hosts can view and manage all orders from the event page.',
    },
    {
        question: 'How do I leave a group?',
        answer: 'Go to the group page and scroll to the bottom of the sidebar. Click "Leave group" and confirm. Note: Organisers cannot leave their own group - they would need to transfer ownership or delete the group.',
    },
    {
        question: 'Can I cancel my RSVP?',
        answer: 'Yes, go to the event page and click "Cancel RSVP". Your spot will be released and if there\'s a waitlist, the next person will be notified.',
    },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
    return (
        <div className="border-b border-stone-200 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full py-4 flex items-center justify-between text-left hover:text-amber-600 transition"
            >
                <span className="font-medium text-stone-800 pr-4">{item.question}</span>
                <svg
                    className={`w-5 h-5 text-stone-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="pb-4 text-stone-600 text-sm leading-relaxed">
                    {item.answer}
                </div>
            )}
        </div>
    );
}

export default function HelpPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <main className="min-h-screen flex flex-col bg-stone-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-8 sm:py-12 max-w-3xl mx-auto w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 font-display mb-3">
                        Help Center
                    </h1>
                    <p className="text-stone-600">
                        Find answers to common questions or get in touch with us.
                    </p>
                </div>

                {/* FAQ Section */}
                <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm mb-8">
                    <h2 className="text-xl font-bold text-stone-900 font-display mb-6">
                        Frequently Asked Questions
                    </h2>
                    <div>
                        {faqs.map((faq, index) => (
                            <FAQAccordion
                                key={index}
                                item={faq}
                                isOpen={openIndex === index}
                                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                            />
                        ))}
                    </div>
                </section>

                {/* Contact Section */}
                <section id="contact" className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm mb-8">
                    <h2 className="text-xl font-bold text-stone-900 font-display mb-4">
                        Contact Us
                    </h2>
                    <p className="text-stone-600 mb-6">
                        Can't find what you're looking for? Get in touch and we'll help you out.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Email</p>
                                <a href="mailto:noodev8@gmail.com" className="text-stone-800 font-medium hover:text-amber-600 transition">
                                    noodev8@gmail.com
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Phone</p>
                                <a href="tel:+447818443886" className="text-stone-800 font-medium hover:text-amber-600 transition">
                                    07818 443886
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Policies Section */}
                <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-stone-900 font-display mb-4">
                        Legal
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/privacy"
                            className="inline-flex items-center gap-2 text-stone-600 hover:text-amber-600 transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="inline-flex items-center gap-2 text-stone-600 hover:text-amber-600 transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Terms of Service
                        </Link>
                    </div>
                </section>
            </div>

            <Footer />
        </main>
    );
}
