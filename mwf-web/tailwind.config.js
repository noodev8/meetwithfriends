/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  // Safelist gradient classes used by event categories (dynamically applied)
  safelist: [
    // Food: indigo -> purple -> pink
    'from-indigo-500', 'via-purple-400', 'to-pink-300',
    // Outdoor: emerald -> teal -> cyan
    'from-emerald-500', 'via-teal-400', 'to-cyan-300',
    // Games: violet -> purple -> indigo
    'from-violet-500', 'via-purple-400', 'to-indigo-300',
    // Coffee: amber -> orange -> yellow
    'from-amber-500', 'via-orange-400', 'to-yellow-300',
    // Arts: rose -> pink -> fuchsia
    'from-rose-500', 'via-pink-400', 'to-fuchsia-300',
    // Learning: blue -> indigo -> violet
    'from-blue-500', 'via-indigo-400', 'to-violet-300',
    // Other: slate -> gray -> zinc
    'from-slate-500', 'via-gray-400', 'to-zinc-300',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
