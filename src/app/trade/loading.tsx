export default function TradeLoading() {
  return (
    <div className="dark flex flex-col h-screen bg-background animate-in fade-in duration-300">
      {/* Top bar skeleton */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-2">
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-28 bg-muted rounded animate-pulse" />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex">
        {/* Chart area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-card m-1 rounded-lg animate-pulse" />
          {/* Bottom panel */}
          <div className="h-48 border-t border-border m-1">
            <div className="flex gap-2 p-2">
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel (order form) */}
        <div className="w-72 border-l border-border p-3 space-y-3">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-12 bg-primary/20 rounded-lg animate-pulse mt-4" />
        </div>
      </div>
    </div>
  )
}
