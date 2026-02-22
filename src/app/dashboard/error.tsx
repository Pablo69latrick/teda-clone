'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#111] mb-2">
          Something went wrong
        </h2>
        <p className="text-[#666] text-sm mb-6">
          We encountered an error loading this page. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-[#999] mb-4 font-mono">
            Ref: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-[#111] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#333] transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard/overview"
            className="inline-flex items-center justify-center rounded-lg border border-[#ddd] px-5 py-2.5 text-sm font-medium text-[#111] hover:bg-[#f5f5f5] transition-colors"
          >
            Go to Overview
          </a>
        </div>
      </div>
    </div>
  )
}
