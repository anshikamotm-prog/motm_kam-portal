"use client"
import { useState, useMemo } from "react"
import { useClients } from "@/hooks/useClients"
import { HealthBadge, FeedbackBadge, ClientStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate, daysSince } from "@/lib/utils"
import { Upload } from "lucide-react"
import { STATUS_OPTIONS, HEALTH_OPTIONS, FEEDBACK_STATUS } from "@/constants"
import { useKAMNames } from "@/hooks/useKAMNames"
import { GuidanceModal } from "./AdminOverview"
import BulkImportModal from "./BulkImportModal"
import type { Client } from "@/types/client"
import { useQuery } from "@tanstack/react-query"

export default function AdminClientsView() {
  const { data: clients, isLoading } = useClients()
  const { data: kamNames = [] } = useKAMNames()
  const [filterKam, setFilterKam] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterHealth, setFilterHealth] = useState("All")
  const [filterFeedback, setFilterFeedback] = useState("All")
  const [search, setSearch] = useState("")
  const [guidanceTarget, setGuidanceTarget] = useState<Client | null>(null)
  const [feedbackTarget, setFeedbackTarget] = useState<Client | null>(null)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!clients) return []
    return clients.filter((c) => {
      if (filterKam !== "All" && c.kam !== filterKam) return false
      if (filterStatus !== "All" && c.status !== filterStatus) return false
      if (filterHealth !== "All" && c.health !== filterHealth) return false
      if (filterFeedback !== "All" && c.feedbackStatus !== filterFeedback) return false
      if (search && !c.company.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [clients, filterKam, filterStatus, filterHealth, filterFeedback, search])

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
        <FilterSelect value={filterStatus} onChange={setFilterStatus} placeholder="All Statuses" options={[...STATUS_OPTIONS]} />
        <FilterSelect value={filterHealth} onChange={setFilterHealth} placeholder="All Health" options={[...HEALTH_OPTIONS]} />
        <FilterSelect value={filterFeedback} onChange={setFilterFeedback} placeholder="All Feedback" options={[...FEEDBACK_STATUS]} />
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

      {guidanceTarget && (
        <GuidanceModal clientId={guidanceTarget.clientId} company={guidanceTarget.company} kam={guidanceTarget.kam} onClose={() => setGuidanceTarget(null)} />
      )}

      {feedbackTarget && (
        <FeedbackHistoryModal client={feedbackTarget} onClose={() => setFeedbackTarget(null)} />
      )}

      {bulkImportOpen && <BulkImportModal onClose={() => setBulkImportOpen(false)} />}
    </div>
  )
}

function FeedbackHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const { data: feedbacks = [], isLoading } = useQuery<any[]>({
    queryKey: ["feedback", client.clientId],
    queryFn: () => fetch(`/api/feedback?clientId=${client.clientId}`).then((r) => r.json()),
  })
  const latest = feedbacks.slice(0, 5)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Last 5 Feedbacks — {client.company}</DialogTitle>
        </DialogHeader>
        {isLoading && <div className="text-sm text-slate-400 py-4 text-center">Loading...</div>}
        {!isLoading && latest.length === 0 && (
          <div className="text-sm text-slate-400 py-4 text-center">No feedback recorded yet.</div>
        )}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {latest.map((f, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700">{formatDate(f.date)}</span>
                <div className="flex gap-1.5">
                  {f.healthUpdate && <HealthBadge health={f.healthUpdate} />}
                  {f.feedbackStatus && <FeedbackBadge status={f.feedbackStatus} />}
                </div>
              </div>
              {f.interactionType && <div className="text-[10px] text-slate-400">Type: {f.interactionType}</div>}
              {f.whatDiscussed && (
                <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                  <span className="font-medium text-slate-500">Discussed: </span>{f.whatDiscussed}
                </div>
              )}
              {f.clientConcern && (
                <div className="text-xs text-slate-600 bg-yellow-50 rounded px-2 py-1">
                  <span className="font-medium text-yellow-700">Client Concern: </span>{f.clientConcern}
                </div>
              )}
              {f.actionRequired && (
                <div className="text-xs text-slate-600 bg-blue-50 rounded px-2 py-1">
                  <span className="font-medium text-blue-600">Action Required: </span>{f.actionRequired}
                  {f.actionOwner && <span className="text-slate-400"> · Owner: {f.actionOwner}</span>}
                  {f.actionDueDate && <span className="text-slate-400"> · Due: {formatDate(f.actionDueDate)}</span>}
                </div>
              )}
              {f.resolutionStatus && (
                <div className="text-xs text-slate-600 bg-green-50 rounded px-2 py-1">
                  <span className="font-medium text-green-700">Resolution: </span>{f.resolutionStatus}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
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
