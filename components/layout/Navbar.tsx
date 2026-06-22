"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut, LayoutDashboard, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell } from "./NotificationBell"

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "Admin"

  return (
    <nav className="bg-slate-900 text-white h-14 flex items-center px-6 gap-6 sticky top-0 z-40 border-b border-slate-800">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
        <span className="text-[#0369a1]">MOTM</span>
        <span className="text-slate-300 font-normal text-sm">KAM Portal</span>
      </Link>

      {/* Primary nav */}
      <div className="flex items-center gap-1 flex-1">
        <NavLink href="/dashboard" active={pathname.startsWith("/dashboard")}>
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>
        {isAdmin && (
          <NavLink href="/admin" active={pathname.startsWith("/admin")}>
            <Shield className="h-4 w-4" />
            Admin
          </NavLink>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        <NotificationBell />
        {session?.user && (
          <span className="text-sm text-slate-400 hidden sm:block">
            {session.user.name?.split(" ")[0]}
            <span className="ml-1.5 text-xs text-slate-500">({session.user.role})</span>
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        active ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white",
      )}
    >
      {children}
    </Link>
  )
}
