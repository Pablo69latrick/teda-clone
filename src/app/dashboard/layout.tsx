import { Sidebar, MobileBottomNav } from '@/components/layout/sidebar'
import { DashboardRealtime } from '@/components/dashboard/realtime-sync'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col dashboard-theme bg-[#f5f5f5] text-[#111111]">
      <div className="flex-1">
        {/* Supabase Realtime → SWR cache invalidation (invisible, no render) */}
        <DashboardRealtime />

        {/* Sidebar (desktop) */}
        <Sidebar userRole="admin" />

        {/* Main content */}
        <main className="flex-1 min-h-dvh overflow-auto pb-safe custom-scrollbar bg-[#f5f5f5]">
          <div className="flex-1 flex flex-col sm:ml-16 p-4 pr-3 lg:p-6 xl:p-8 max-sm:pb-20 transition-[margin] duration-300 ease-out">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>
    </div>
  )
}
