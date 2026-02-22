'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">&#9888;&#65039;</div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-[#a1a1aa] mb-2">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-xs text-[#52525b] mb-6 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-[#27272a] px-6 py-3 text-sm font-medium text-white hover:bg-[#27272a] transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
