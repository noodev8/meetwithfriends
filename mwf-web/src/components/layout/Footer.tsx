/*
=======================================================================================================================================
Footer Component
=======================================================================================================================================
Minimal footer for logged-in pages with links to help, policies, and contact.
=======================================================================================================================================
*/

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-slate-50 py-6 mt-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">&copy; {new Date().getFullYear()}</span>
                        <span className="font-medium text-slate-600">Meet With Friends</span>
                    </div>
                    <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                        <Link href="/help" className="hover:text-slate-700 transition">
                            Help
                        </Link>
                        <Link href="/privacy" className="hover:text-slate-700 transition">
                            Privacy
                        </Link>
                        <Link href="/terms" className="hover:text-slate-700 transition">
                            Terms
                        </Link>
                        <Link href="/help#contact" className="hover:text-slate-700 transition">
                            Contact
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
