"use client"
import { useState, useMemo } from "react"
import { useTargets, useUpdateTarget, useRolloverTargets, useBulkSaveTargets } from "@/hooks/useTargets"
import { useKAMNames } from "@/hooks/useKAMNames"
import { useClients } from "@/hooks/useClients"
import { TargetStatusBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ComplianceBar } from "@/components/shared/ComplianceBar"
import { PageSpinner } from "@/components/shared/Spinner"
import { getCurrentPeriod, formatPeriodLabel } from "@/lib/utils"
import { TARGET_TYPES } from "@/constants"
import { Search } from "lucide-react"
import EnquiryPerformanceView from "@/components/admin/EnquiryPerformanceView"

type MainView = "performance" | "targets" | "enquiry"

export default function AdminPerformanceView() {
  const [view, setView] = useState<MainView>("performance")
  const [period, setPeriod] = useState(getCurrentPeriod())
  const { data: targets, isLoading } = useTargets()
  const { data: clients } = useClients()
  const { data: kamNames = [] } = useKAMNames()
  const rollover = useRolloverTargets()
  const updateTarget = useUpdateTarget()

  const periods = useMemo(() => {
    const current = getCurrentPeriod()
    if (!targets) return [current]
    const fromData = [...new Set(targets.map((t) => t.period))].sort().reverse()
    return fromData.includes(current) ? fromData : [current, ...fromData]
  }, [targets])

  // Auto-select the most recent period that has data; fall back to current period
  const effectivePeriod = useMemo(() => {
    if (periods.includes(period)) return period
    return periods[0] ?? period
  }, [periods, period])

  const filtered = targets?.filter((t) => t.period === effectivePeriod) ?? []

  // For performance view: group by KAM
  const byKam = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    filtered.forEach((t) => {
      const k = t.kam || "Unassigned"
      if (!map[k]) map[k] = []
      map[k].push(t)
    })
    return map
  }, [filtered])

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Performance & Targets</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={view === "performance" ? "default" : "outline"} onClick={() => setView("performance")}>📊 Performance</Button>
          <Button size="sm" variant={view === "enquiry" ? "default" : "outline"} onClick={() => setView("enquiry")}>🔍 Enquiry Summary</Button>
          <Button size="sm" variant={view === "targets" ? "default" : "outline"} onClick={() => setView("targets")}>🎯 Set Targets</Button>
        </div>
      </div>

      {/* Period + Rollover */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={effectivePeriod} onValueChange={setPeriod}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>{periods.map((p) => <SelectItem key={p} value={p}>{formatPeriodLabel(p)}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => rollover.mutate()} disabled={rollover.isPending}>
          {rollover.isPending ? "Rolling..." : "🔄 Roll Over"}
        </Button>
        <span className="text-xs text-slate-400">{filtered.length} targets this period</span>
      </div>

      {/* Performance View — by KAM */}
      {view === "performance" && (
        <div className="space-y-3">
          {Object.keys(byKam).length === 0 && (
            <div className="text-sm text-slate-400 text-center py-12 bg-white rounded-xl border border-slate-200">No targets for this period</div>
          )}
          {Object.entries(byKam).map(([kam, rows]) => (
            <div key={kam} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1e3a5f] text-white px-4 py-2 text-sm font-semibold flex items-center justify-between">
                <span>{kam}</span>
                <span className="text-xs font-normal opacity-70">{rows.length} targets</span>
              </div>
              {rows.map((t) => {
                const isEnq = t.type === "Enquiries"
                const isER = t.type === "Email Response"
                const autoCount = isEnq || isER
                const achieved = isEnq ? (t.enquiryCount ?? 0) : isER ? (t.emailResponseCount ?? 0) : parseInt(t.achieved) || 0
                const target = parseInt(t.target) || 0
                const pct = target > 0 ? Math.round((achieved / target) * 100) : 0
                return (
                  <div key={t.rowNum} className="px-4 py-3 border-b border-slate-100 last:border-0 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">{t.company}</span>
                        <Badge variant="gray" className="text-[10px]">{t.type}</Badge>
                        {t.seName && <span className="text-[10px] text-slate-400">SE/DR: {t.seName}</span>}
                        {autoCount && <Badge variant="blue" className="text-[10px]">Auto-counted</Badge>}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <ComplianceBar value={achieved} max={target || 1} className="flex-1 max-w-32" />
                        <span className="text-xs text-slate-500">{achieved}/{target} ({pct}%)</span>
                        <TargetStatusBadge status={t.status} />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-400">Target</span>
                      <input key={`tgt-${t.rowNum}`} type="number" defaultValue={target} min={0}
                        className="w-20 h-8 rounded-lg border border-slate-200 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                        onBlur={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val !== target) updateTarget.mutate({ rowNum: t.rowNum, target: val }) }} />
                    </div>
                    {!autoCount && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-400">Achieved</span>
                        <input key={`ach-${t.rowNum}`} type="number" defaultValue={achieved} min={0}
                          className="w-20 h-8 rounded-lg border border-slate-200 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          onBlur={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val !== achieved) updateTarget.mutate({ rowNum: t.rowNum, achieved: val }) }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Enquiry Summary View */}
      {view === "enquiry" && <EnquiryPerformanceView />}

      {/* Set Targets View */}
      {view === "targets" && (
        <SetTargetsView clients={clients ?? []} period={effectivePeriod} existingTargets={filtered} kamNames={kamNames} />
      )}
    </div>
  )
}

// ─── Set Targets View ─────────────────────────────────────────────────────────

function SetTargetsView({ clients, period, existingTargets, kamNames }: {
  clients: { clientId: string; company: string; kam: string; se: string }[]
  period: string
  existingTargets: ReturnType<typeof useTargets>["data"] extends (infer U)[] | undefined ? U[] : never
  kamNames: string[]
}) {
  const bulkSave = useBulkSaveTargets()
  const [search, setSearch] = useState("")
  const [filterKam, setFilterKam] = useState("All")
  const [rows, setRows] = useState<Record<string, { target: string; type: string; drName?: string }>>({})
  const [lastSaved, setLastSaved] = useState<number | null>(null)

  const DR_TYPES = ["Data Collection", "Email Response"]

  const existingByClient = useMemo(() => {
    const map: Record<string, typeof existingTargets> = {}
    existingTargets.forEach((t) => {
      if (!map[t.clientId]) map[t.clientId] = []
      map[t.clientId].push(t)
    })
    return map
  }, [existingTargets])

  const filtered = useMemo(() => clients.filter((c) => {
    if (filterKam !== "All" && c.kam !== filterKam) return false
    if (search && !c.company.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [clients, filterKam, search])

  const dirtyRows = useMemo(
    () => filtered.filter((c) => rows[c.clientId]?.target && parseInt(rows[c.clientId].target) > 0),
    [filtered, rows],
  )

  const handleSaveAll = () => {
    if (!dirtyRows.length) return
    const payload = dirtyRows.map((c) => {
      const row = rows[c.clientId]
      const isDR = DR_TYPES.includes(row?.type ?? "")
      return {
        kam: c.kam,
        seName: isDR ? (row?.drName ?? "") : (c.se ?? ""),
        clientId: c.clientId,
        company: c.company,
        target: row.target,
        type: row?.type ?? "Visits",
      }
    })
    bulkSave.mutate(
      { period, rows: payload },
      {
        onSuccess: (data) => {
          setLastSaved(data.saved ?? payload.length)
          setRows({})
        },
      },
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>
        <Select value={filterKam} onValueChange={setFilterKam}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All KAMs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All KAMs</SelectItem>
            {kamNames.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          {lastSaved !== null && (
            <span className="text-xs text-green-600 font-medium">
              ✓ {lastSaved} target{lastSaved !== 1 ? "s" : ""} saved
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={bulkSave.isPending || dirtyRows.length === 0}
            className="min-w-28"
          >
            {bulkSave.isPending
              ? "Saving..."
              : dirtyRows.length > 0
                ? `Save All (${dirtyRows.length})`
                : "Save All"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Company", "KAM", "SE", "Existing Targets", "Type", "DR Name", "New Target"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">No clients found</td></tr>
              )}
              {filtered.map((c) => {
                const existing = existingByClient[c.clientId] ?? []
                const row = rows[c.clientId] ?? { target: "", type: "Visits" }
                const isDirty = !!(row.target && parseInt(row.target) > 0)

                return (
                  <tr
                    key={c.clientId}
                    className={`border-b border-slate-100 last:border-0 transition-colors ${isDirty ? "bg-amber-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-800">{c.company}</div>
                      <div className="text-[10px] text-slate-400">{c.clientId}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{c.kam}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{c.se || "—"}</td>
                    <td className="px-3 py-2.5">
                      {existing.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {existing.map((t) => {
                            const isEnq = t.type === "Enquiries"
                            const achieved = isEnq ? (t.enquiryCount ?? 0) : parseInt(t.achieved) || 0
                            const tgt = parseInt(t.target) || 0
                            return (
                              <span key={t.rowNum} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                <span className="font-medium">{t.type}:</span>
                                <span className="text-[#1e3a5f] font-semibold">{achieved}/{tgt}</span>
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={row.type}
                        onValueChange={(v) => setRows((r) => {
                          const prev = r[c.clientId] ?? { target: "", type: "Visits" }
                          const defaultTarget = v === "Data Collection" ? "40" : v === "Email Response" ? "1" : prev.target
                          return { ...r, [c.clientId]: { ...prev, type: v, target: defaultTarget } }
                        })}
                      >
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[...TARGET_TYPES].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2.5">
                      {DR_TYPES.includes(row.type) ? (
                        <Input
                          placeholder="DR full name"
                          value={row.drName ?? ""}
                          onChange={(e) =>
                            setRows((r) => ({ ...r, [c.clientId]: { ...(r[c.clientId] ?? { target: "", type: "Data Collection" }), drName: e.target.value } }))
                          }
                          className="h-8 w-36 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.target}
                        onChange={(e) =>
                          setRows((r) => ({ ...r, [c.clientId]: { ...(r[c.clientId] ?? { type: "Visits" }), target: e.target.value } }))
                        }
                        className="h-8 w-20 text-xs"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
