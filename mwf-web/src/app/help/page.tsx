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
        answer: 'Click "Create a Group" from the dashboard or navigation menu. Fill in your group name, description, and choose whether it\'s public or requires approval to join. You\'ll automatically become the admin.',
    },
    {
        question: 'What\'s the difference between an Admin and a Host?',
        answer: 'The Admin owns the group and has full control - they can edit group settings, manage members, and delete the group. Hosts can create and manage events but cannot change group settings or remove other hosts.',
    },
    {
        question: 'How do I create an event?',
        answer: 'Go to your group page and click "Create Event". You\'ll need to be an Admin or Host of the group. Set the title, date, location, and optionally add a capacity limit, featured image, or enable pre-orders.',
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
        answer: 'Go to the group page and scroll to the bottom of the sidebar. Click "Leave group" and confirm. Note: Admins cannot leave their own group - they would need to transfer ownership or delete the group.',
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
                    href="/your-events"
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

                {/* Contact Section - "Real people. Real support." style */}
                <section id="contact" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left side - Message */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200 mb-4">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <span className="text-sm font-medium text-emerald-700">Real humans, real help</span>
                            </div>
                            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-3 leading-[1.1]">
                                Real people.
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600">
                                    Real support.
                                </span>
                            </h2>
                            <p className="text-slate-600 mb-4 leading-relaxed">
                                Tired of chatbots and endless FAQs? We get it. When you need help, you&apos;ll hear back from a real person within 24 hours. No tickets, no queues, no frustration.
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-slate-700">
                                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>Response within 24 hours</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-700">
                                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>UK-based team</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-700">
                                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>No chatbots, just humans</span>
                                </div>
                            </div>
                        </div>

                        {/* Right side - Contact Form */}
                        <div className="bg-slate-50 rounded-xl p-5 sm:p-6 border border-slate-200">
                            <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
                                Send us a message
                            </h3>
                            <p className="text-slate-500 text-sm mb-4">
                                Question, feedback, or just want to say hi? We&apos;d love to hear from you.
                            </p>

                            {contactSuccess ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h4 className="font-semibold text-emerald-800 mb-2">Message Sent!</h4>
                                    <p className="text-emerald-700 text-sm">
                                        Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                                    </p>
                                    <button
                                        onClick={() => setContactSuccess(false)}
                                        className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 underline"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleContactSubmit} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                required
                                                minLength={2}
                                                maxLength={100}
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                                placeholder="Your name"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                required
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                                placeholder="you@example.com"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                                            Message
                                        </label>
                                        <textarea
                                            id="message"
                                            required
                                            rows={3}
                                            minLength={10}
                                            maxLength={1000}
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            placeholder="How can we help?"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
                                        />
                                    </div>

                                    {contactError && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                                            {contactError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={contactLoading}
                                        className="w-full bg-slate-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {contactLoading ? 'Sending...' : 'Send Message'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
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
