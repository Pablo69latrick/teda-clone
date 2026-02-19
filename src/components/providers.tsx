'use client'

import { SWRConfig } from 'swr'
import { AuthProvider } from '@/lib/auth-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SWRConfig
        value={{
          // Global error handler — silently swallow auth errors in dev
          onError: (err) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[SWR]', err.message)
            }
          },
          // Retry at most once on error
          errorRetryCount: 1,
        }}
      >
        {children}
      </SWRConfig>
    </AuthProvider>
  )
}
