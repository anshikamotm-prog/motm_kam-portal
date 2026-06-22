"use client"
import { useState, useMemo } from "react"
import { useClients } from "@/hooks/useClients"
import { ClientList } from "./ClientList"
import { ClientDetail } from "./ClientDetail"
import type { Client } from "@/types/client"
import { PageSpinner } from "@/components/shared/Spinner"

export default function MyClientsView() {
  const { data: clients, isLoading } = useClients()
  const [selected, setSelected] = useState<Client | null>(null)
  const [search, setSearch] = useState("")
  const [healthFilter, setHealthFilter] = useState<string>("All")

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
    <div className="flex h-[calc(100vh-112px)] gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
      {/* Sidebar */}
      <ClientList
        clients={filtered}
        selected={selected}
        onSelect={setSelected}
        search={search}
        onSearch={setSearch}
        healthFilter={healthFilter}
        onHealthFilter={setHealthFilter}
      />

      {/* Detail Panel */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <ClientDetail client={selected} onUpdated={(updated) => setSelected(updated)} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Select a client to view details
          </div>
        )}
      </div>
    </div>
  )
}
