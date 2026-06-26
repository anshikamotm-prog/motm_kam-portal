"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
const KAM_TABS = [
  { label: "My Clients", href: "/dashboard" },
  { label: "Feedback", href: "/dashboard/feedback" },
  { label: "Meetings", href: "/dashboard/meetings" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Targets", href: "/dashboard/targets" },
  { label: "Enquiries", href: "/dashboard/enquiries" },
  { label: "Guidance", href: "/dashboard/guidance" },
]

const ADMIN_TABS = [
  { label: "Overview", href: "/admin" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Meetings", href: "/admin/meetings" },
  { label: "Compliance", href: "/admin/compliance" },
  { label: "Performance", href: "/admin/performance" },
  { label: "Tasks", href: "/admin/tasks" },
  { label: "Guidance", href: "/admin/guidance" },
  { label: "Research", href: "/admin/research" },
  { label: "Users", href: "/admin/users" },
]

const SE_TABS = [
  { label: "My Dashboard", href: "/dashboard/se" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Enquiries", href: "/dashboard/enquiries" },
]

const DR_TABS = [
  { label: "My Dashboard", href: "/dashboard/dr" },
  { label: "Tasks", href: "/dashboard/tasks" },
]

export function NavTabs() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const tabs = pathname.startsWith("/admin")
    ? ADMIN_TABS
    : role === "SE"
    ? SE_TABS
    : role === "DR"
    ? DR_TABS
    : KAM_TABS

  return (
    <div className="bg-white border-b border-slate-200 px-6">
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const active =
            tab.href === "/dashboard" || tab.href === "/admin" || tab.href === "/dashboard/se"
              ? pathname === tab.href
              : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
