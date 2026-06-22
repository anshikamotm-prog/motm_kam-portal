"use client"
import { useQuery } from "@tanstack/react-query"
import { ComplianceBar } from "@/components/shared/ComplianceBar"
import { Badge } from "@/components/ui/badge"
import { HealthBadge } from "@/components/shared/StatusBadge"
import { PageSpinner } from "@/components/shared/Spinner"
import type { KAMComplianceScore } from "@/lib/compliance"
import { formatDate } from "@/lib/utils"

const levelVariant = (level: string) => {
  if (level === "Excellent") return "green" as const
  if (level === "Good") return "blue" as const
  if (level === "Needs Improvement") return "orange" as const
  return "red" as const
}

export default function AdminComplianceView() {
  const { data: scores, isLoading } = useQuery<KAMComplianceScore[]>({
    queryKey: ["compliance"],
    queryFn: () => fetch("/api/compliance").then((r) => r.json()),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">KAM Compliance Scores</h1>

      {/* Score cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {scores?.map((s) => (
          <div key={s.kamName} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-slate-800 text-lg">{s.kamName}</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#1e3a5f]">{s.total}</span>
                <Badge variant={levelVariant(s.level)}>{s.level}</Badge>
              </div>
            </div>
            <ComplianceBar value={s.total} max={100} className="mb-4" />
            <div className="space-y-2">
              {[
                { label: "Feedback", score: s.feedbackScore, max: 25 },
                { label: "Meetings", score: s.meetingScore, max: 25 },
                { label: "MOM", score: s.momScore, max: 20 },
                { label: "Tasks", score: s.taskScore, max: 15 },
                { label: "Status Updates", score: s.statusScore, max: 15 },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-28">{row.label}</span>
                  <ComplianceBar value={row.score} max={row.max} className="flex-1" />
                  <span className="text-xs font-medium text-slate-600 w-10 text-right">{row.score}/{row.max}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Client monitoring grids */}
      <div className="grid grid-cols-2 gap-4">
        {scores?.map((s) => (
          <div key={s.kamName}>
            <h2 className="text-base font-semibold text-slate-700 mb-2">{s.kamName} — Monitoring</h2>
            <div className="space-y-3">
              <MonitoringCard title="No Feedback 7+ Days" clients={s.noFeedbackClients} />
              <MonitoringCard title="No Review Meeting 30+ Days" clients={s.noMeetingClients} />
              <MonitoringCard title="No Activity 15+ Days" clients={s.noActivityClients} />
              <MonitoringCard title="High Risk" clients={s.highRiskClients} danger />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonitoringCard({ title, clients, danger }: { title: string; clients: { company: string; health: string; feedbackStatus: string }[]; danger?: boolean }) {
  if (clients.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-100 p-3">
      <div className="text-xs font-medium text-slate-500 mb-1">{title}</div>
      <div className="text-xs text-green-600">✓ All clear</div>
    </div>
  )

  return (
    <div className={`bg-white rounded-xl border p-3 ${danger ? "border-red-200" : "border-slate-200"}`}>
      <div className={`text-xs font-medium mb-2 ${danger ? "text-red-600" : "text-slate-600"}`}>{title} ({clients.length})</div>
      <div className="space-y-1">
        {clients.slice(0, 5).map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <HealthBadge health={c.health} />
            <span className="text-slate-700 truncate">{c.company}</span>
          </div>
        ))}
        {clients.length > 5 && <div className="text-xs text-slate-400">+{clients.length - 5} more</div>}
      </div>
    </div>
  )
}
