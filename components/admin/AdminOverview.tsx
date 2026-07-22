"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { HealthDot } from "@/components/shared/HealthDot"
import { FeedbackBadge, HealthBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate, daysSince } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { FeedbackHistoryModal } from "@/components/shared/FeedbackHistoryModal"
import { useClients } from "@/hooks/useClients"
import type { Client } from "@/types/client"

const INACTIVE = ["Closed", "On Hold", "Uncountable"]

interface OverviewData {
  stats: {
    total: number; green: number; orange: number; red: number
    planningToLeave: number; intentToLeave: number; overdueFollowup: number; monthRevenue: number
  }
  kamBreakdown: Array<{ kam: string; total: number; green: number; orange: number; red: number; atRisk: number; overdue: number }>
  criticalClients: Array<{ clientId: string; company: string; kam: string; health: string; feedbackStatus: string; lastFeedbackDate: string; daysSince: number | null }>
  otherClients: Array<{ status: string; clients: Array<{ clientId: string; company: string; kam: string }> }>
  onboardingClients: Array<{ status: string; clients: Array<{ clientId: string; company: string; kam: string }> }>
  unassignedClients: Array<{ clientId: string; company: string; status: string }>
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["admin-overview"],
    queryFn: () => fetch("/api/admin/overview").then((r) => r.json()),
  })
  const [guidanceClient, setGuidanceClient] = useState<{ clientId: string; company: string; kam: string } | null>(null)
  const [feedbackClient, setFeedbackClient] = useState<{ clientId: string; company: string } | null>(null)
  const [clientFilter, setClientFilter] = useState<{ title: string; fn: (c: Client) => boolean } | null>(null)

  const openFilter = (title: string, fn: (c: Client) => boolean) => setClientFilter({ title, fn })

  if (isLoading) return <PageSpinner />
  if (!data?.stats) return (
    <div className="text-center py-20 text-slate-400 text-sm">
      Failed to load overview data.{" "}
      <button className="underline" onClick={() => window.location.reload()}>Refresh</button>
    </div>
  )

  const { stats, kamBreakdown, criticalClients, otherClients = [], onboardingClients = [], unassignedClients = [] } = data

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">Admin Overview</h1>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Clients" value={stats.total} onClick={() => openFilter("All Active Clients", (c) => !INACTIVE.includes(c.status))} />
        <StatCard label="Green" value={stats.green} color="text-green-600" onClick={() => openFilter("Green Clients", (c) => !INACTIVE.includes(c.status) && c.health === "Green")} />
        <StatCard label="Orange" value={stats.orange} color="text-orange-500" onClick={() => openFilter("Orange Clients", (c) => !INACTIVE.includes(c.status) && c.health === "Orange")} />
        <StatCard label="Red" value={stats.red} color="text-red-600" onClick={() => openFilter("Red Clients", (c) => !INACTIVE.includes(c.status) && c.health === "Red")} />
        <StatCard label="Planning to Leave" value={stats.planningToLeave} warn onClick={() => openFilter("Planning to Leave", (c) => c.feedbackStatus === "Planning to Leave")} />
        <StatCard label="Intent to Leave" value={stats.intentToLeave} danger onClick={() => openFilter("Intent to Leave", (c) => c.feedbackStatus === "Intent to Leave")} />
        <StatCard label="Overdue Follow-up" value={stats.overdueFollowup} warn={stats.overdueFollowup > 0} onClick={() => openFilter("Overdue Follow-up (>7 days)", (c) => { const d = daysSince(c.lastFeedbackDate); return d !== null && d > 7 && !INACTIVE.includes(c.status) })} />
        <StatCard label="Month Revenue" value={`₹${(stats.monthRevenue / 100000).toFixed(1)}L`} />
      </div>

      {/* KAM Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">KAM Breakdown</h2>
        <div className="grid grid-cols-3 gap-3">
          {kamBreakdown.map((k) => (
            <div key={k.kam} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-800 mb-2">{k.kam}</div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <KAMStat label="Total" value={k.total} color="text-slate-700" onClick={() => openFilter(`${k.kam} — All`, (c) => c.kam === k.kam && !INACTIVE.includes(c.status))} />
                <KAMStat label="Green" value={k.green} color="text-green-600" onClick={() => openFilter(`${k.kam} — Green`, (c) => c.kam === k.kam && c.health === "Green")} />
                <KAMStat label="Orange" value={k.orange} color="text-orange-500" onClick={() => openFilter(`${k.kam} — Orange`, (c) => c.kam === k.kam && c.health === "Orange")} />
                <KAMStat label="Red" value={k.red} color="text-red-600" onClick={() => openFilter(`${k.kam} — Red`, (c) => c.kam === k.kam && c.health === "Red")} />
              </div>
              {(k.atRisk > 0 || k.overdue > 0) && (
                <div className="mt-2 flex gap-2">
                  {k.atRisk > 0 && (
                    <button onClick={() => openFilter(`${k.kam} — At Risk`, (c) => c.kam === k.kam && ["Intent to Leave", "Planning to Leave", "At Risk"].includes(c.feedbackStatus))}>
                      <Badge variant="red">{k.atRisk} at risk</Badge>
                    </button>
                  )}
                  {k.overdue > 0 && (
                    <button onClick={() => openFilter(`${k.kam} — Overdue Follow-up`, (c) => { const d = daysSince(c.lastFeedbackDate); return c.kam === k.kam && d !== null && d > 7 && !INACTIVE.includes(c.status) })}>
                      <Badge variant="orange">{k.overdue} overdue</Badge>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Critical Clients */}
      <div>
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">Critical Clients</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Company", "KAM", "Health", "Feedback Status", "Last Feedback", "Days", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criticalClients.map((c) => (
                <tr key={c.clientId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <button onClick={() => setFeedbackClient(c)} className="font-medium text-slate-800 hover:text-[#0369a1] hover:underline text-left">
                      {c.company}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{c.kam}</td>
                  <td className="px-3 py-2.5"><HealthBadge health={c.health} /></td>
                  <td className="px-3 py-2.5"><FeedbackBadge status={c.feedbackStatus} /></td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{formatDate(c.lastFeedbackDate)}</td>
                  <td className={`px-3 py-2.5 text-xs font-medium ${(c.daysSince ?? 0) > 14 ? "text-red-600" : "text-orange-500"}`}>
                    {c.daysSince !== null ? `${c.daysSince}d` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setGuidanceClient(c)}>
                      💬 Guide
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Clients — New / Pending */}
      {onboardingClients.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">Onboarding Clients</h2>
          <div className="grid grid-cols-2 gap-3">
            {onboardingClients.map((group) => (
              <div key={group.status} className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-700">{group.status}</span>
                  <Badge variant="blue">{group.clients.length}</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.clients.map((c) => (
                    <div key={c.clientId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-slate-800 font-medium">{c.company}</span>
                      <span className="text-xs text-slate-400">{c.kam}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unassigned Clients — no KAM */}
      {unassignedClients.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">
            Unassigned Clients
            <span className="ml-2 text-sm font-normal text-amber-600">({unassignedClients.length} without KAM)</span>
          </h2>
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-700">No KAM Assigned</span>
              <Badge variant="orange">{unassignedClients.length}</Badge>
            </div>
            <div className="divide-y divide-slate-100">
              {unassignedClients.map((c) => (
                <div key={c.clientId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-800 font-medium">{c.company}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{c.clientId}</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Other Clients — Closed / On Hold / On Notice */}
      {otherClients.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">Other Clients</h2>
          <div className="grid grid-cols-1 gap-3">
            {otherClients.map((group) => (
              <div key={group.status} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{group.status}</span>
                  <Badge variant="gray">{group.clients.length}</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.clients.map((c) => (
                    <div key={c.clientId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-slate-800 font-medium">{c.company}</span>
                      <span className="text-xs text-slate-400">{c.kam}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {guidanceClient && (
        <GuidanceModal
          clientId={guidanceClient.clientId}
          company={guidanceClient.company}
          kam={guidanceClient.kam}
          onClose={() => setGuidanceClient(null)}
        />
      )}
      {feedbackClient && (
        <FeedbackHistoryModal
          clientId={feedbackClient.clientId}
          company={feedbackClient.company}
          onClose={() => setFeedbackClient(null)}
        />
      )}
      {clientFilter && (
        <FilteredClientsModal
          title={clientFilter.title}
          fn={clientFilter.fn}
          onClose={() => setClientFilter(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color, warn, danger, onClick }: { label: string; value: number | string; color?: string; warn?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${danger ? "border-red-200 bg-red-50" : warn ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-white"}`}>
      <div
        className={`text-2xl font-bold ${danger ? "text-red-600" : warn ? "text-yellow-700" : color ?? "text-[#1e3a5f]"} ${onClick ? "cursor-pointer hover:underline" : ""}`}
        onClick={onClick}
      >{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function KAMStat({ label, value, color, onClick }: { label: string; value: number; color: string; onClick: () => void }) {
  return (
    <div>
      <button className={`text-lg font-bold ${color} hover:underline`} onClick={onClick}>{value}</button>
      <div className="text-slate-400">{label}</div>
    </div>
  )
}

function FilteredClientsModal({ title, fn, onClose }: { title: string; fn: (c: Client) => boolean; onClose: () => void }) {
  const { data: allClients = [] } = useClients()
  const [feedbackClient, setFeedbackClient] = useState<{ clientId: string; company: string } | null>(null)
  const clients = allClients.filter(fn)

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title} <span className="text-slate-400 font-normal text-sm">({clients.length})</span></DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            {clients.length === 0 && <div className="text-sm text-slate-400 py-6 text-center">No clients found.</div>}
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  {["Company", "KAM", "Health", "Feedback Status", "Days"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const d = daysSince(c.lastFeedbackDate)
                  return (
                    <tr key={c.clientId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <button onClick={() => setFeedbackClient(c)} className="font-medium text-slate-800 hover:text-[#0369a1] hover:underline text-left">
                          {c.company}
                        </button>
                        <div className="text-[10px] text-slate-400">{c.clientId}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs">{c.kam}</td>
                      <td className="px-3 py-2"><HealthBadge health={c.health} /></td>
                      <td className="px-3 py-2"><FeedbackBadge status={c.feedbackStatus} /></td>
                      <td className={`px-3 py-2 text-xs font-medium ${d !== null && d > 7 ? "text-red-600" : "text-slate-500"}`}>
                        {d !== null ? `${d}d` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      {feedbackClient && (
        <FeedbackHistoryModal
          clientId={feedbackClient.clientId}
          company={feedbackClient.company}
          onClose={() => setFeedbackClient(null)}
        />
      )}
    </>
  )
}

export function GuidanceModal({ clientId, company, kam, onClose }: { clientId: string; company: string; kam: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState("")
  const post = useMutation({
    mutationFn: () => fetch("/api/guidance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, company, kamAssigned: kam, note }),
    }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["guidance"] }); onClose() },
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Send Guidance — {company}</DialogTitle></DialogHeader>
        <div className="space-y-1">
          <Label className="text-xs">Note for {kam}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[120px]" placeholder="Write guidance..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!note.trim()} onClick={() => post.mutate()}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
