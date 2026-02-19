import { Sidebar } from '@/components/layout/sidebar'

export const metadata = {
  title: 'Trade | VerticalProp',
}

export default function TradeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark flex h-screen overflow-hidden bg-dark">
      {/* Sidebar */}
      <Sidebar userRole="admin" />

      {/* Main trade area — offset by sidebar width */}
      <div className="flex flex-col flex-1 min-w-0 sm:pl-16 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
