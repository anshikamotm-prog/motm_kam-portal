import { Navbar } from "@/components/layout/Navbar"
import { NavTabs } from "@/components/layout/NavTabs"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <NavTabs />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
