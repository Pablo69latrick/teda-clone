'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const COOKIE_KEY = 'teda-cookie-consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show banner if no consent stored
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) {
      // Small delay so it doesn't flash on initial load
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-2xl rounded-xl border border-border/50 bg-card/95 backdrop-blur-lg shadow-2xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 text-sm text-muted-foreground">
            <p>
              We use essential cookies to keep TEDA running and optional analytics cookies to improve your experience.{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={decline}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
