export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-[#e5e5e5] rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-[#e5e5e5] rounded mt-2 animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-[#e5e5e5] rounded-lg animate-pulse" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e5e5e5] p-5">
            <div className="h-4 w-24 bg-[#f0f0f0] rounded animate-pulse mb-3" />
            <div className="h-8 w-32 bg-[#f0f0f0] rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-[#f0f0f0] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-6">
        <div className="h-5 w-40 bg-[#f0f0f0] rounded animate-pulse mb-4" />
        <div className="h-64 bg-[#f8f8f8] rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-6">
        <div className="h-5 w-32 bg-[#f0f0f0] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#f8f8f8] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
