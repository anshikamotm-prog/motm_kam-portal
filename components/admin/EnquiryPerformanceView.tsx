"use client"
import React, { useState, useMemo } from "react"
import { useTargets } from "@/hooks/useTargets"
import { useTargetsSummary } from "@/hooks/useTargetsSummary"
import { ComplianceBar } from "@/components/shared/ComplianceBar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageSpinner } from "@/components/shared/Spinner"
import { getCurrentPeriod, formatPeriodLabel, isoWeekToMonth } from "@/lib/utils"

type Mode = "week" | "month"

export default function EnquiryPerformanceView() {
  const { data: targets } = useTargets()
  const [mode, setMode] = useState<Mode>("week")
  const [weekPeriod, setWeekPeriod] = useState(getCurrentPeriod())
  const [monthPeriod, setMonthPeriod] = useState(() => {
    const now = new Date()
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return `${m[now.getMonth()]} ${now.getFullYear()}`
  })

  // Available week periods from target data
  const weekPeriods = useMemo(() => {
    const current = getCurrentPeriod()
    if (!targets) return [current]
    const fromData = [...new Set(targets.map((t) => t.period))].sort().reverse()
    return fromData.includes(current) ? fromData : [current, ...fromData]
  }, [targets])

  // Available months derived from ISO week periods
  const monthPeriods = useMemo(() => {
    const seen = new Set<string>()
    weekPeriods.forEach((p) => {
      const month = isoWeekToMonth(p)
      if (month) seen.add(month)
    })
    return [...seen].sort().reverse()
  }, [weekPeriods])

  const queryPeriod = mode === "week" ? weekPeriod : monthPeriod
  const { data: summary, isLoading } = useTargetsSummary(queryPeriod)

  const { byKAM = [], total } = summary ?? {}

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          <button
            onClick={() => setMode("week")}
            className={`px-3 py-1.5 font-medium transition-colors ${mode === "week" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            By Week
          </button>
          <button
            onClick={() => setMode("month")}
            className={`px-3 py-1.5 font-medium transition-colors ${mode === "month" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            By Month
          </button>
        </div>

        {mode === "week" ? (
          <Select value={weekPeriod} onValueChange={setWeekPeriod}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {weekPeriods.map((p) => <SelectItem key={p} value={p}>{formatPeriodLabel(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Select value={monthPeriod} onValueChange={setMonthPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthPeriods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {total && total.target > 0 && (
          <span className="text-xs text-slate-400 ml-auto">
            Overall: <span className="font-medium text-slate-600">{total.achieved}/{total.target}</span> ({total.pct}%)
          </span>
        )}
      </div>

      {isLoading && <PageSpinner />}

      {!isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">KAM / SE</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Target</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Achieved</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 w-44">Progress</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">%</th>
              </tr>
            </thead>
            <tbody>
              {byKAM.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No enquiry targets for this period
                  </td>
                </tr>
              )}
              {byKAM.map((kam) => (
                <React.Fragment key={kam.kam}>
                  {/* KAM row */}
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-800">{kam.kam}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{kam.target}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{kam.achieved}</td>
                    <td className="px-4 py-2.5">
                      <ComplianceBar value={kam.achieved} max={kam.target || 1} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={kam.pct >= 100 ? "green" : kam.pct >= 60 ? "blue" : "red"}>
                        {kam.pct}%
                      </Badge>
                    </td>
                  </tr>
                  {/* SE sub-rows */}
                  {kam.bySE.map((se) => (
                    <tr key={`${kam.kam}-${se.se}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="pl-9 pr-4 py-2 text-xs text-slate-500">
                        <span className="text-slate-300 mr-1.5">└</span>{se.se}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{se.target}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{se.achieved}</td>
                      <td className="px-4 py-2">
                        <ComplianceBar value={se.achieved} max={se.target || 1} className="h-1.5" />
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-400">{se.pct}%</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            {total && total.target > 0 && (
              <tfoot>
                <tr className="bg-[#1e3a5f]">
                  <td className="px-4 py-3 text-white font-bold">Total</td>
                  <td className="px-4 py-3 text-white font-bold">{total.target}</td>
                  <td className="px-4 py-3 text-white font-bold">{total.achieved}</td>
                  <td className="px-4 py-3">
                    <ComplianceBar value={total.achieved} max={total.target || 1} className="bg-white/20 [&>div]:bg-white" />
                  </td>
                  <td className="px-4 py-3 text-white font-bold">{total.pct}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
