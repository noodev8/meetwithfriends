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
import { contactSupport } from '@/lib/api/support';

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
        <div className="border-b border-slate-200 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full py-4 flex items-center justify-between text-left hover:text-indigo-600 transition"
            >
                <span className="font-medium text-slate-800 pr-4">{item.question}</span>
                <svg
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="pb-4 text-slate-600 text-sm leading-relaxed">
                    {item.answer}
                </div>
            )}
        </div>
    );
}

export default function HelpPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
    const [contactLoading, setContactLoading] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);
    const [contactError, setContactError] = useState('');

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactLoading(true);
        setContactError('');

        const result = await contactSupport(contactForm.name, contactForm.email, contactForm.message);

        setContactLoading(false);

        if (result.success) {
            setContactSuccess(true);
            setContactForm({ name: '', email: '', message: '' });
        } else {
            setContactError(result.error || 'Failed to send message. Please try again.');
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <div className="flex-1 px-4 sm:px-8 py-8 sm:py-12 max-w-3xl mx-auto w-full">
                {/* Back to Dashboard link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to dashboard
                </Link>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-3">
                        Help Center
                    </h1>
                    <p className="text-slate-600">
                        Find answers to common questions or get in touch with us.
                    </p>
                </div>

                {/* FAQ Section */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
                    <h2 className="text-xl font-bold text-slate-900 font-display mb-6">
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
                <section id="contact" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
                    <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                        Contact Us
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you within 24 hours.
                    </p>

                    {contactSuccess ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-emerald-800 mb-2">Message Sent!</h3>
                            <p className="text-emerald-700 text-sm">
                                Thanks for reaching out. We&apos;ll respond to your email within 24 hours.
                            </p>
                            <button
                                onClick={() => setContactSuccess(false)}
                                className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 underline"
                            >
                                Send another message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    minLength={2}
                                    maxLength={100}
                                    value={contactForm.name}
                                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                    placeholder="John Smith"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                    Your Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    value={contactForm.email}
                                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    required
                                    rows={4}
                                    minLength={10}
                                    maxLength={1000}
                                    value={contactForm.message}
                                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                    placeholder="How can we help you?"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    {contactForm.message.length}/1000 characters
                                </p>
                            </div>

                            {contactError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                    {contactError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={contactLoading}
                                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {contactLoading ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </section>

                {/* Policies Section */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 font-display mb-4">
                        Legal
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/privacy"
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition"
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
