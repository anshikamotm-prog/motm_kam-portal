"use client"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useClients } from "@/hooks/useClients"
import { useHealthTrends } from "@/hooks/useHealthTrends"
import { ClientList } from "./ClientList"
import { ClientDetail } from "./ClientDetail"
import { DailyDigest } from "./DailyDigest"
import type { Client } from "@/types/client"
import { PageSpinner } from "@/components/shared/Spinner"
import { cn } from "@/lib/utils"

const PIN_LIMIT = 5
const STORAGE_KEY = "motm-pinned"

export default function MyClientsView() {
  const { data: clients, isLoading } = useClients()
  const trends = useHealthTrends()
  const [selected, setSelected] = useState<Client | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [search, setSearch] = useState("")
  const [healthFilter, setHealthFilter] = useState<string>("All")
  const [pinnedIds, setPinnedIds] = useState<string[]>([])

  // Load pinned IDs from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try { setPinnedIds(JSON.parse(raw)) } catch {}
    }
  }, [])

  // Auto-select client from ?clientId= URL param (used when navigating from another page)
  useEffect(() => {
    if (!clients?.length) return
    const cid = new URLSearchParams(window.location.search).get("clientId")
    // Only auto-select if cid differs from the currently selected client
    if (!cid || selected?.clientId === cid) return
    const c = clients.find((c) => c.clientId === cid)
    if (c) { setSelected(c); setShowDetail(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]) // intentionally omits `selected` so re-selection works when URL param changes

  // Listen for in-page client selection dispatched by the global Navbar search
  useEffect(() => {
    if (!clients?.length) return
    const handler = (e: Event) => {
      const { clientId } = (e as CustomEvent<{ clientId: string }>).detail
      const c = clients.find((c) => c.clientId === clientId)
      if (c) { setSelected(c); setShowDetail(true) }
    }
    window.addEventListener("motm:select-client", handler)
    return () => window.removeEventListener("motm:select-client", handler)
  }, [clients])

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= PIN_LIMIT ? prev : [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const handleSelect = useCallback((c: Client) => {
    setSelected(c)
    setShowDetail(true)
  }, [])

  const filtered = useMemo(() => {
    if (!clients) return []
    return clients.filter((c) => {
      const matchHealth = healthFilter === "All" || c.health === healthFilter
      const matchSearch =
        !search ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.clientId.toLowerCase().includes(search.toLowerCase())
      return matchHealth && matchSearch
    })
  }, [clients, search, healthFilter])

  if (isLoading) return <PageSpinner />

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      <DailyDigest />
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white min-h-0">
        {/* Sidebar */}
        <ClientList
          clients={filtered}
          selected={selected}
          onSelect={handleSelect}
          search={search}
          onSearch={setSearch}
          healthFilter={healthFilter}
          onHealthFilter={setHealthFilter}
          pinnedIds={pinnedIds}
          onTogglePin={togglePin}
          trends={trends}
          className={cn(selected && showDetail && "hidden md:flex md:flex-col")}
        />

        {/* Detail panel */}
        {selected ? (
          <div className={cn("flex-1 overflow-y-auto", !showDetail && "hidden md:block")}>
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <button
                onClick={() => setShowDetail(false)}
                className="text-sm text-[#0369a1] font-medium"
              >
                ← Back
              </button>
              <span className="text-sm text-slate-600 truncate">{selected.company}</span>
            </div>
            <ClientDetail
              key={selected.clientId}
              client={selected}
              onUpdated={(updated) => setSelected(updated)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 h-full items-center justify-center text-slate-400 text-sm">
            Select a client to view details
          </div>
        )}
      </div>
    </div>
  )
}
