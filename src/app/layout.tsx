import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { CookieConsent } from '@/components/cookie-consent'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tedaprop.com'

export const metadata: Metadata = {
  title: {
    default: 'TEDA — Get Trained & Funded',
    template: '%s | TEDA',
  },
  description: 'The professional prop trading platform. Get trained, get funded, and scale your trading career.',
  manifest: '/manifest.json',
  icons: {
    icon: '/landing/teda-logo.jpg',
    apple: '/landing/teda-logo.jpg',
  },
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'TEDA',
    title: 'TEDA — Get Trained & Funded',
    description: 'The professional prop trading platform. Get trained, get funded, and scale your trading career.',
    images: [
      {
        url: '/landing/trading-platform.png',
        width: 1200,
        height: 630,
        alt: 'TEDA Trading Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TEDA — Get Trained & Funded',
    description: 'The professional prop trading platform. Get trained, get funded, and scale your trading career.',
    images: ['/landing/trading-platform.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster />
        <CookieConsent />
      </body>
    </html>
  )
}
