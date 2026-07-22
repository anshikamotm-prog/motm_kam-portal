"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut, LayoutDashboard, Shield, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell } from "./NotificationBell"
import { useClients } from "@/hooks/useClients"
import type { Client } from "@/types/client"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "Admin"
  const { data: clients = [] } = useClients()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const results: Client[] = searchQuery.length >= 2
    ? clients.filter((c) =>
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clientId.toLowerCase().includes(searchQuery.toLowerCase()),
      ).slice(0, 6)
    : []

  const selectClient = (c: Client) => {
    setSearchQuery("")
    setSearchOpen(false)
    // If already on the dashboard, dispatch a custom event so MyClientsView can select
    // the client without a full navigation (which wouldn't trigger re-selection because
    // the client component keeps its state on soft-navigations).
    if (window.location.pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("motm:select-client", { detail: { clientId: c.clientId } }))
    } else {
      router.push(`/dashboard?clientId=${c.clientId}`)
    }
  }

  return (
    <nav className="bg-slate-900 text-white h-14 flex items-center px-6 gap-4 sticky top-0 z-40 border-b border-slate-800">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
        <span className="text-[#0369a1]">MOTM</span>
        <span className="text-slate-300 font-normal text-sm hidden sm:block">KAM Portal</span>
      </Link>

      {/* Primary nav */}
      <div className="flex items-center gap-1 shrink-0">
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

      {/* Global search */}
      <div ref={searchRef} className="relative flex-1 max-w-xs hidden sm:block">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            className="w-full bg-slate-800 text-white placeholder:text-slate-500 text-sm pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
          />
        </div>
        {searchOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
            {results.map((c) => (
              <button
                key={c.clientId}
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => selectClient(c)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 border-b border-slate-50 last:border-0"
              >
                <div className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  c.health === "Green" ? "bg-green-500" : c.health === "Red" ? "bg-red-500" : "bg-orange-400",
                )} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{c.company}</div>
                  <div className="text-[10px] text-slate-400">{c.clientId}{c.kam ? ` · ${c.kam}` : ""}</div>
                </div>
              </button>
            ))}
          </div>
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
