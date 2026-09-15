"use client"
import { useState, useMemo } from "react"
import { useClients, useArchivedClients } from "@/hooks/useClients"
import { HealthBadge, FeedbackBadge, ClientStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate, daysSince } from "@/lib/utils"
import { Upload, ChevronDown, ChevronRight, Archive } from "lucide-react"
import { STATUS_OPTIONS, HEALTH_OPTIONS, FEEDBACK_STATUS } from "@/constants"
import { useKAMNames } from "@/hooks/useKAMNames"
import { GuidanceModal } from "./AdminOverview"
import BulkImportModal from "./BulkImportModal"
import { FeedbackHistoryModal } from "@/components/shared/FeedbackHistoryModal"
import type { Client } from "@/types/client"

const ARCHIVED_STATUSES = ["Closed", "Uncountable"]

export default function AdminClientsView() {
  const { data: clients, isLoading } = useClients()
  const { data: archivedClients = [] } = useArchivedClients()
  const { data: kamNames = [] } = useKAMNames()
  const [filterKam, setFilterKam] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterHealth, setFilterHealth] = useState("All")
  const [filterFeedback, setFilterFeedback] = useState("All")
  const [startDateFrom, setStartDateFrom] = useState("")
  const [startDateTo, setStartDateTo] = useState("")
  const [search, setSearch] = useState("")
  const [guidanceTarget, setGuidanceTarget] = useState<Client | null>(null)
  const [feedbackTarget, setFeedbackTarget] = useState<Client | null>(null)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedSearch, setArchivedSearch] = useState("")
  const [archivedKam, setArchivedKam] = useState("All")

  const filtered = useMemo(() => {
    if (!clients) return []
    return clients.filter((c) => {
      if (filterKam !== "All" && c.kam !== filterKam) return false
      if (filterStatus !== "All" && c.status !== filterStatus) return false
      if (filterHealth !== "All" && c.health !== filterHealth) return false
      if (filterFeedback !== "All" && c.feedbackStatus !== filterFeedback) return false
      if (search && !c.company.toLowerCase().includes(search.toLowerCase())) return false
      if (startDateFrom || startDateTo) {
        const d = c.startDate ? new Date(c.startDate) : null
        if (!d || isNaN(d.getTime())) return false
        if (startDateFrom && d < new Date(startDateFrom)) return false
        if (startDateTo && d > new Date(startDateTo + "T23:59:59")) return false
      }
      return true
    })
  }, [clients, filterKam, filterStatus, filterHealth, filterFeedback, search, startDateFrom, startDateTo])

  const filteredArchived = useMemo(() => {
    return archivedClients.filter((c) => {
      if (archivedKam !== "All" && c.kam !== archivedKam) return false
      if (archivedSearch && !c.company.toLowerCase().includes(archivedSearch.toLowerCase())) return false
      return true
    })
  }, [archivedClients, archivedKam, archivedSearch])

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">All Clients</h1>
        <Button size="sm" onClick={() => setBulkImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Bulk Import
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2">
        <Input placeholder="Search company..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-48 text-xs" />
        <FilterSelect value={filterKam} onChange={setFilterKam} placeholder="All KAMs" options={kamNames} />
        <FilterSelect value={filterStatus} onChange={setFilterStatus} placeholder="All Statuses" options={STATUS_OPTIONS.filter((s) => !ARCHIVED_STATUSES.includes(s))} />
        <FilterSelect value={filterHealth} onChange={setFilterHealth} placeholder="All Health" options={[...HEALTH_OPTIONS]} />
        <FilterSelect value={filterFeedback} onChange={setFilterFeedback} placeholder="All Feedback" options={[...FEEDBACK_STATUS]} />
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">Joined:</span>
          <Input type="date" value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
          <span className="text-xs text-slate-400">to</span>
          <Input type="date" value={startDateTo} onChange={(e) => setStartDateTo(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="text-xs text-slate-400 self-center ml-auto">{filtered.length} clients</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Company/ID", "KAM", "SE", "Status", "Health", "Feedback Status", "Last Feedback", "Days", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No clients found</td></tr>}
              {filtered.map((c) => {
                const days = daysSince(c.lastFeedbackDate)
                return (
                  <tr key={c.clientId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <button onClick={() => setFeedbackTarget(c)} className="text-left hover:underline">
                        <div className="font-medium text-slate-800">{c.company}</div>
                        <div className="text-[10px] text-slate-400">{c.clientId}</div>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{c.kam}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{c.se || "—"}</td>
                    <td className="px-3 py-2.5"><ClientStatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5"><HealthBadge health={c.health} /></td>
                    <td className="px-3 py-2.5"><FeedbackBadge status={c.feedbackStatus} /></td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{formatDate(c.lastFeedbackDate)}</td>
                    <td className={`px-3 py-2.5 text-xs font-medium ${days !== null && days > 7 ? "text-red-600" : "text-slate-500"}`}>
                      {days !== null ? `${days}d` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGuidanceTarget(c)}>💬</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archived Clients */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="w-full px-4 py-3 flex items-center gap-2 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
        >
          {showArchived ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <Archive className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-700 text-sm">Archived Clients</span>
          <span className="ml-1 text-xs text-slate-400">({archivedClients.length} — Closed &amp; Uncountable)</span>
        </button>
        {showArchived && (
          <>
            <div className="p-3 flex gap-2 border-b border-slate-100">
              <Input
                placeholder="Search archived..."
                value={archivedSearch}
                onChange={(e) => setArchivedSearch(e.target.value)}
                className="h-8 w-48 text-xs"
              />
              <FilterSelect value={archivedKam} onChange={setArchivedKam} placeholder="All KAMs" options={kamNames} />
              <span className="text-xs text-slate-400 self-center ml-auto">{filteredArchived.length} clients</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Company/ID", "KAM", "SE", "Status", "Last Feedback", "Days"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredArchived.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">No archived clients</td></tr>
                  )}
                  {filteredArchived.map((c) => {
                    const days = daysSince(c.lastFeedbackDate)
                    return (
                      <tr key={c.clientId} className="border-b border-slate-100 hover:bg-slate-50 opacity-70">
                        <td className="px-3 py-2">
                          <button onClick={() => setFeedbackTarget(c)} className="text-left hover:underline">
                            <div className="font-medium text-slate-700">{c.company}</div>
                            <div className="text-[10px] text-slate-400">{c.clientId}</div>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{c.kam || "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{c.se || "—"}</td>
                        <td className="px-3 py-2"><ClientStatusBadge status={c.status} /></td>
                        <td className="px-3 py-2 text-xs text-slate-500">{formatDate(c.lastFeedbackDate)}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{days !== null ? `${days}d` : "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {guidanceTarget && (
        <GuidanceModal clientId={guidanceTarget.clientId} company={guidanceTarget.company} kam={guidanceTarget.kam} onClose={() => setGuidanceTarget(null)} />
      )}

      {feedbackTarget && (
        <FeedbackHistoryModal clientId={feedbackTarget.clientId} company={feedbackTarget.company} onClose={() => setFeedbackTarget(null)} />
      )}

      {bulkImportOpen && <BulkImportModal onClose={() => setBulkImportOpen(false)} />}
    </div>
  )
}


function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="All">{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
