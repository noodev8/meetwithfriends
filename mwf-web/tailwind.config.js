/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  // Safelist gradient classes used by event categories and group themes (dynamically applied)
  safelist: [
    // === Event Categories ===
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

    // === Group Themes (gradients) ===
    // Indigo theme
    'to-violet-600', 'from-indigo-100', 'to-violet-200',
    // Emerald theme
    'to-teal-600', 'from-emerald-100', 'to-teal-200',
    // Rose theme
    'from-rose-500', 'to-pink-600', 'from-rose-100', 'to-pink-200',
    // Amber theme
    'to-orange-600', 'from-amber-100', 'to-orange-200',
    // Cyan theme
    'from-cyan-500', 'to-blue-600', 'from-cyan-100', 'to-blue-200',
    // Violet theme
    'to-purple-600', 'from-violet-100', 'to-purple-200',

    // === Group Theme text colors ===
    'text-indigo-600', 'text-emerald-600', 'text-rose-600',
    'text-amber-600', 'text-cyan-600', 'text-violet-600',

    // === Group Theme bg colors (for swatches) ===
    'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-violet-500',
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
