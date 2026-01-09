import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Meet With Friends',
  description: 'Organize group events with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${fraunces.variable} ${dmSans.className}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
