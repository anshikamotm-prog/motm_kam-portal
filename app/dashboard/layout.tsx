import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { NavTabs } from "@/components/layout/NavTabs"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <NavTabs />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
