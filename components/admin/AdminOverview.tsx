"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { HealthDot } from "@/components/shared/HealthDot"
import { FeedbackBadge, HealthBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Label } from "@/components/ui/label"

interface OverviewData {
  stats: {
    total: number; green: number; orange: number; red: number
    planningToLeave: number; intentToLeave: number; overdueFollowup: number; monthRevenue: number
  }
  kamBreakdown: Array<{ kam: string; total: number; green: number; orange: number; red: number; atRisk: number; overdue: number }>
  criticalClients: Array<{ clientId: string; company: string; kam: string; health: string; feedbackStatus: string; lastFeedbackDate: string; daysSince: number | null }>
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["admin-overview"],
    queryFn: () => fetch("/api/admin/overview").then((r) => r.json()),
  })
  const [guidanceClient, setGuidanceClient] = useState<{ clientId: string; company: string; kam: string } | null>(null)

  if (isLoading) return <PageSpinner />
  if (!data?.stats) return (
    <div className="text-center py-20 text-slate-400 text-sm">
      Failed to load overview data.{" "}
      <button className="underline" onClick={() => window.location.reload()}>Refresh</button>
    </div>
  )

  const { stats, kamBreakdown, criticalClients } = data

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">Admin Overview</h1>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Clients" value={stats.total} />
        <StatCard label="Green" value={stats.green} color="text-green-600" />
        <StatCard label="Orange" value={stats.orange} color="text-orange-500" />
        <StatCard label="Red" value={stats.red} color="text-red-600" />
        <StatCard label="Planning to Leave" value={stats.planningToLeave} warn />
        <StatCard label="Intent to Leave" value={stats.intentToLeave} danger />
        <StatCard label="Overdue Follow-up" value={stats.overdueFollowup} warn={stats.overdueFollowup > 0} />
        <StatCard label="Month Revenue" value={`₹${(stats.monthRevenue / 100000).toFixed(1)}L`} />
      </div>

      {/* KAM Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">KAM Breakdown</h2>
        <div className="grid grid-cols-3 gap-3">
          {kamBreakdown.map((k) => (
            <div key={k.kam} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-800 mb-2">{k.kam}</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><div className="text-lg font-bold text-slate-700">{k.total}</div><div className="text-slate-400">Total</div></div>
                <div><div className="text-lg font-bold text-green-600">{k.green}</div><div className="text-slate-400">Green</div></div>
                <div><div className="text-lg font-bold text-red-600">{k.red}</div><div className="text-slate-400">Red</div></div>
              </div>
              {(k.atRisk > 0 || k.overdue > 0) && (
                <div className="mt-2 flex gap-2">
                  {k.atRisk > 0 && <Badge variant="red">{k.atRisk} at risk</Badge>}
                  {k.overdue > 0 && <Badge variant="orange">{k.overdue} overdue</Badge>}
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
                  <td className="px-3 py-2.5 font-medium text-slate-800">{c.company}</td>
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

      {guidanceClient && (
        <GuidanceModal
          clientId={guidanceClient.clientId}
          company={guidanceClient.company}
          kam={guidanceClient.kam}
          onClose={() => setGuidanceClient(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color, warn, danger }: { label: string; value: number | string; color?: string; warn?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${danger ? "border-red-200 bg-red-50" : warn ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-2xl font-bold ${danger ? "text-red-600" : warn ? "text-yellow-700" : color ?? "text-[#1e3a5f]"}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
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
