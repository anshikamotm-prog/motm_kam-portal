"use client"
import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useTargets, useUpdateTarget } from "@/hooks/useTargets"
import { useTargetsSummary } from "@/hooks/useTargetsSummary"
import { useClients } from "@/hooks/useClients"
import { TargetStatusBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ComplianceBar } from "@/components/shared/ComplianceBar"
import { PageSpinner } from "@/components/shared/Spinner"
import { getCurrentPeriod, formatPeriodLabel, isoWeekToMonth } from "@/lib/utils"

const EXCLUDE = ["Closed", "On Hold", "Uncountable"]

type GroupBy = "client" | "se"
type ViewMode = "targets" | "history"

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
function monthToNum(m: string) {
  const [mon, yr] = m.split(" ")
  return parseInt(yr) * 12 + (MONTHS.indexOf(mon) ?? 0)
}

export default function TargetsView() {
  const { data: session } = useSession()
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [groupBy, setGroupBy] = useState<GroupBy>("client")
  const [viewMode, setViewMode] = useState<ViewMode>("targets")
  const [historyRange, setHistoryRange] = useState<6 | 12>(6)
  const [summaryMode, setSummaryMode] = useState<"week" | "month">("week")
  const { data: targets, isLoading } = useTargets()
  // Period-specific query triggers the carryForward block in the API (enquiries/data-collection rollover)
  const { data: periodTargets } = useTargets(period)
  const updateTarget = useUpdateTarget()
  const { data: allClients = [] } = useClients()

  const periods = useMemo(() => {
    const current = getCurrentPeriod()
    if (!targets) return [current]
    const fromData = [...new Set(targets.map((t) => t.period))].sort().reverse()
    return fromData.includes(current) ? fromData : [current, ...fromData]
  }, [targets])

  const effectivePeriod = useMemo(() => {
    if (periods.includes(period)) return period
    return periods[0] ?? period
  }, [periods, period])

  const activeClientIds = useMemo(
    () => new Set(allClients.map((c) => c.clientId)),
    [allClients],
  )

  // Use period-specific API response (has carryForward applied) for the targets panel.
  // Filter out targets for archived (Closed/Uncountable) clients.
  const filtered = useMemo(() => {
    const base = periodTargets ?? targets?.filter((t) => t.period === effectivePeriod) ?? []
    return base.filter((t) => !t.clientId || activeClientIds.has(t.clientId))
  }, [periodTargets, targets, effectivePeriod, activeClientIds])

  const clientsWithoutTarget = useMemo(() => {
    const clientIdsWithTarget = new Set(filtered.map((t) => t.clientId).filter(Boolean))
    return allClients.filter((c) => !EXCLUDE.includes(c.status) && !clientIdsWithTarget.has(c.clientId))
  }, [allClients, filtered])

  // Month derived from selected ISO week (e.g. "2026 W26" → "Jun 2026")
  const monthPeriod = useMemo(() => isoWeekToMonth(effectivePeriod), [effectivePeriod])

  // Monthly summary comes from API; weekly is computed locally from filtered targets
  const { data: monthlySummary } = useTargetsSummary(summaryMode === "month" ? monthPeriod : "")

  const weeklySERows = useMemo(() => {
    const enqTargets = filtered.filter((t) => t.type === "Enquiries")
    if (!enqTargets.length) return null
    const bySE: Record<string, { target: number; achieved: number }> = {}
    enqTargets.forEach((t) => {
      const se = (t.seName || "No SE").trim()
      if (!bySE[se]) bySE[se] = { target: 0, achieved: 0 }
      bySE[se].target += parseInt(t.target) || 0
      bySE[se].achieved += t.enquiryCount ?? 0
    })
    const rows = Object.entries(bySE).map(([se, v]) => ({
      se, target: v.target, achieved: v.achieved,
      pct: v.target > 0 ? Math.round((v.achieved / v.target) * 100) : 0,
    })).sort((a, b) => a.se.localeCompare(b.se))
    const totalTarget = rows.reduce((s, r) => s + r.target, 0)
    const totalAchieved = rows.reduce((s, r) => s + r.achieved, 0)
    return { rows, total: { target: totalTarget, achieved: totalAchieved, pct: totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0 } }
  }, [filtered])

  // The KAM's own summary entry (monthly API returns byKAM array, we take the first/only entry)
  const monthlySERows = useMemo(() => {
    if (!monthlySummary?.byKAM?.length) return null
    const myData = monthlySummary.byKAM[0]
    return { rows: myData.bySE, total: monthlySummary.total }
  }, [monthlySummary])

  const activeSummary = summaryMode === "week" ? weeklySERows : monthlySERows
  const showSummary = !!(activeSummary && activeSummary.rows.length > 0)

  // Group by Client
  const byClient = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    filtered.forEach((t) => {
      const key = `${t.clientId}||${t.company}`
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [filtered])

  // Group by SE
  const bySE = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    filtered.forEach((t) => {
      const key = t.seName?.trim() || "No SE"
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [filtered])

  // History — aggregate all targets by calendar month (derived from ISO week Monday)
  const historyData = useMemo(() => {
    if (!targets) return []
    const monthMap: Record<string, { target: number; achieved: number }> = {}
    targets.forEach((t) => {
      const month = isoWeekToMonth(t.period)
      if (!month) return
      if (!monthMap[month]) monthMap[month] = { target: 0, achieved: 0 }
      monthMap[month].target += parseInt(t.target) || 0
      monthMap[month].achieved += t.type === "Enquiries"
        ? (t.enquiryCount ?? 0)
        : (parseInt(t.achieved) || 0)
    })
    return Object.entries(monthMap)
      .map(([month, v]) => ({ month, ...v, pct: v.target > 0 ? Math.round((v.achieved / v.target) * 100) : 0 }))
      .sort((a, b) => monthToNum(b.month) - monthToNum(a.month))
      .slice(0, historyRange)
  }, [targets, historyRange])

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">My Targets</h1>
          {session?.user?.kamName && (
            <p className="text-xs text-slate-400 mt-0.5">Filtering by KAM name: <span className="font-medium text-slate-600">{session.user.kamName}</span></p>
          )}
          {session?.user && !session.user.kamName && (
            <p className="text-xs text-red-400 mt-0.5">KAM name not set in Users sheet — no targets will show</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button onClick={() => setViewMode("targets")}
              className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "targets" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              Targets
            </button>
            <button onClick={() => setViewMode("history")}
              className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "history" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              History
            </button>
          </div>
          {viewMode === "targets" && (
            <>
              {/* Group toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                <button onClick={() => setGroupBy("client")}
                  className={`px-3 py-1.5 font-medium transition-colors ${groupBy === "client" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                  By Client
                </button>
                <button onClick={() => setGroupBy("se")}
                  className={`px-3 py-1.5 font-medium transition-colors ${groupBy === "se" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                  By SE
                </button>
              </div>
              {/* Period selector */}
              <Select value={effectivePeriod} onValueChange={setPeriod}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => <SelectItem key={p} value={p}>{formatPeriodLabel(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
          {viewMode === "history" && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              <button onClick={() => setHistoryRange(6)}
                className={`px-3 py-1.5 font-medium transition-colors ${historyRange === 6 ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                6 Months
              </button>
              <button onClick={() => setHistoryRange(12)}
                className={`px-3 py-1.5 font-medium transition-colors ${historyRange === 12 ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                1 Year
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History View */}
      {viewMode === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
            Target History — Last {historyRange === 6 ? "6 Months" : "1 Year"}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Month", "Target", "Achieved", "Achievement %", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyData.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">No history data available</td></tr>
              )}
              {historyData.map((row) => (
                <tr key={row.month} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.month}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.target}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.achieved}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.pct >= 100 ? "bg-green-500" : row.pct >= 60 ? "bg-blue-500" : "bg-red-400"}`}
                          style={{ width: `${Math.min(row.pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{row.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={row.pct >= 100 ? "green" : row.pct >= 60 ? "blue" : "red"} className="text-[10px]">
                      {row.pct >= 100 ? "Achieved" : row.pct >= 60 ? "On Track" : "Behind"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enquiry Summary Panel */}
      {viewMode === "targets" && showSummary && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Enquiry Summary</span>
            <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
              <button
                onClick={() => setSummaryMode("week")}
                className={`px-2.5 py-1 font-medium transition-colors ${summaryMode === "week" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {effectivePeriod}
              </button>
              <button
                onClick={() => setSummaryMode("month")}
                className={`px-2.5 py-1 font-medium transition-colors ${summaryMode === "month" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {monthPeriod}
              </button>
            </div>
          </div>

          {/* Total bar */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 w-24 shrink-0">Team Total</span>
            <ComplianceBar value={activeSummary!.total.achieved} max={activeSummary!.total.target || 1} className="flex-1 max-w-48" />
            <span className="text-sm font-bold text-slate-700">
              {activeSummary!.total.achieved} / {activeSummary!.total.target}
            </span>
            <Badge variant={activeSummary!.total.pct >= 100 ? "green" : activeSummary!.total.pct >= 60 ? "blue" : "red"}>
              {activeSummary!.total.pct}%
            </Badge>
          </div>

          {/* Per-SE rows */}
          <div className="divide-y divide-slate-100">
            {activeSummary!.rows.map((row) => (
              <div key={row.se} className="px-4 py-2.5 flex items-center gap-4">
                <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{row.se}</span>
                <ComplianceBar value={row.achieved} max={row.target || 1} className="flex-1 max-w-48 h-1.5" />
                <span className="text-xs text-slate-600 whitespace-nowrap">
                  {row.achieved} / {row.target}
                  <span className="text-slate-400 ml-1">({row.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "targets" && filtered.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-12 bg-white rounded-xl border border-slate-200">
          No targets set for this period
        </div>
      )}

      {/* By Client View */}
      {viewMode === "targets" && groupBy === "client" && Object.entries(byClient).map(([key, rows]) => {
        const [clientId, company] = key.split("||")
        const se = rows[0]?.seName || "—"
        return (
          <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 text-sm">{company}</span>
                <span className="text-[10px] text-slate-400 ml-2">{clientId}</span>
              </div>
              <span className="text-xs text-slate-500">SE: <span className="font-medium">{se}</span></span>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((t) => <TargetRow key={t.rowNum} t={t} onUpdate={(val) => updateTarget.mutate({ rowNum: t.rowNum, achieved: val })} />)}
            </div>
          </div>
        )
      })}

      {/* Clients without target this period */}
      {viewMode === "targets" && clientsWithoutTarget.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-700">No Target Set This Period</span>
            <Badge variant="orange">{clientsWithoutTarget.length}</Badge>
          </div>
          <div className="divide-y divide-slate-100">
            {clientsWithoutTarget.map((c) => (
              <div key={c.clientId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-slate-800">{c.company}</span>
                  <span className="ml-2 text-[10px] text-slate-400">{c.clientId}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {c.kam && <span>{c.kam}</span>}
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By SE View */}
      {viewMode === "targets" && groupBy === "se" && Object.entries(bySE).map(([se, rows]) => {
        // Further group by client within SE
        const clientMap: Record<string, typeof rows> = {}
        rows.forEach((t) => {
          const k = t.company || t.clientId
          if (!clientMap[k]) clientMap[k] = []
          clientMap[k].push(t)
        })

        return (
          <div key={se} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-[#1e3a5f] text-white text-sm font-semibold flex items-center justify-between">
              <span>SE: {se}</span>
              <span className="text-xs font-normal opacity-70">{rows.length} target{rows.length !== 1 ? "s" : ""}</span>
            </div>
            {Object.entries(clientMap).map(([clientName, clientRows]) => (
              <div key={clientName}>
                <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-600">
                  {clientName}
                  <span className="ml-2 text-[10px] text-slate-400">{clientRows[0]?.clientId}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {clientRows.map((t) => <TargetRow key={t.rowNum} t={t} onUpdate={(val) => updateTarget.mutate({ rowNum: t.rowNum, achieved: val })} />)}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function TargetRow({ t, onUpdate }: { t: ReturnType<typeof useTargets>["data"] extends (infer U)[] | undefined ? U : never; onUpdate: (val: number) => void }) {
  const isEnquiry = t.type === "Enquiries"
  const achieved = isEnquiry ? (t.enquiryCount ?? 0) : parseInt(t.achieved) || 0
  const target = parseInt(t.target) || 0
  const pct = target > 0 ? Math.round((achieved / target) * 100) : 0

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="gray" className="text-[10px]">{t.type}</Badge>
          {isEnquiry && <Badge variant="blue" className="text-[10px]">Auto-counted</Badge>}
          <TargetStatusBadge status={t.status} />
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <ComplianceBar value={achieved} max={target || 1} className="flex-1 max-w-40" />
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            {achieved} / {target}
            <span className="text-slate-400 ml-1">({pct}%)</span>
          </span>
        </div>
      </div>
      {!isEnquiry && (
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 mb-0.5">Achieved</span>
          <input
            type="number"
            defaultValue={achieved}
            min={0}
            className="w-20 h-8 rounded-lg border border-slate-200 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            onBlur={(e) => {
              const val = parseInt(e.target.value)
              if (!isNaN(val) && val !== achieved) onUpdate(val)
            }}
          />
        </div>
      )}
    </div>
  )
}
