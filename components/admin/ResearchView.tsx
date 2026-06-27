"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatPeriodLabel } from "@/lib/utils"
import { EMAIL_RESPONSE_TYPES } from "@/constants"

interface EmailResponse {
  rowNum: number
  timestamp: string
  period: string
  clientId: string
  company: string
  kam: string
  drName: string
  contactPerson: string
  designation: string
  contactEmail: string
  responseDate: string
  responseType: string
  responseSummary: string
  nextAction: string
  notes: string
}

const RESPONSE_COLORS: Record<string, string> = {
  Positive: "bg-green-100 text-green-700",
  Neutral: "bg-slate-100 text-slate-600",
  Negative: "bg-red-100 text-red-700",
}

export default function ResearchView() {
  const [filterKam, setFilterKam] = useState("")
  const [filterDR, setFilterDR] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterPeriod, setFilterPeriod] = useState("")
  const [expanded, setExpanded] = useState<number | null>(null)

  const qs = new URLSearchParams()
  if (filterKam) qs.set("kam", filterKam)
  if (filterDR) qs.set("dr", filterDR)
  if (filterType) qs.set("responseType", filterType)
  if (filterPeriod) qs.set("period", filterPeriod)

  const { data: responses = [], isLoading } = useQuery<EmailResponse[]>({
    queryKey: ["email-responses", filterKam, filterDR, filterType, filterPeriod],
    queryFn: () => fetch(`/api/email-responses?${qs.toString()}`).then((r) => r.json()),
  })

  // Unique values for filter dropdowns
  const allKams = [...new Set(responses.map((r) => r.kam).filter(Boolean))].sort()
  const allDRs = [...new Set(responses.map((r) => r.drName).filter(Boolean))].sort()
  const allPeriods = [...new Set(responses.map((r) => r.period).filter(Boolean))].sort().reverse()

  const positive = responses.filter((r) => r.responseType === "Positive").length
  const neutral = responses.filter((r) => r.responseType === "Neutral").length
  const negative = responses.filter((r) => r.responseType === "Negative").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Email Response Log</h1>
        <p className="text-sm text-slate-500 mt-0.5">Logged by Data Research team</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-700">{positive}</div>
          <div className="text-sm text-green-600 font-medium">Positive</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-700">{neutral}</div>
          <div className="text-sm text-slate-600 font-medium">Neutral</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-700">{negative}</div>
          <div className="text-sm text-red-600 font-medium">Negative</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Weeks</option>
          {allPeriods.map((p) => <option key={p} value={p}>{formatPeriodLabel(p)}</option>)}
        </select>
        <select
          value={filterKam}
          onChange={(e) => setFilterKam(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All KAMs</option>
          {allKams.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select
          value={filterDR}
          onChange={(e) => setFilterDR(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All DRs</option>
          {allDRs.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {EMAIL_RESPONSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(filterKam || filterDR || filterType || filterPeriod) && (
          <button
            onClick={() => { setFilterKam(""); setFilterDR(""); setFilterType(""); setFilterPeriod("") }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-slate-400">{responses.length} entries</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : responses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No email responses logged yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {responses.map((r) => (
              <div key={r.rowNum} className="hover:bg-slate-50 transition-colors">
                <button
                  onClick={() => setExpanded(expanded === r.rowNum ? null : r.rowNum)}
                  className="w-full text-left px-5 py-4"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RESPONSE_COLORS[r.responseType] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.responseType}
                    </span>
                    <span className="font-medium text-slate-800">{r.company}</span>
                    <span className="text-slate-500">→ {r.contactPerson}</span>
                    {r.designation && <span className="text-slate-400 text-xs">({r.designation})</span>}
                    <span className="ml-auto flex items-center gap-3 text-xs text-slate-400">
                      <span>{r.drName}</span>
                      <span>{r.period}</span>
                      <span>{r.responseDate || r.timestamp.split(",")[0]}</span>
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-1">{r.responseSummary}</p>
                </button>

                {expanded === r.rowNum && (
                  <div className="px-5 pb-4 grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
                    <Detail label="KAM" value={r.kam} />
                    <Detail label="DR" value={r.drName} />
                    <Detail label="Contact Email" value={r.contactEmail || "—"} />
                    <Detail label="Response Date" value={r.responseDate || "—"} />
                    <div className="col-span-2">
                      <Detail label="Response Summary" value={r.responseSummary} />
                    </div>
                    {r.nextAction && (
                      <div className="col-span-2">
                        <Detail label="Next Action" value={r.nextAction} />
                      </div>
                    )}
                    {r.notes && (
                      <div className="col-span-2">
                        <Detail label="Notes" value={r.notes} />
                      </div>
                    )}
                    <div className="col-span-2 text-xs text-slate-400">Logged: {r.timestamp}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 font-medium mb-0.5">{label}</div>
      <div className="text-slate-700">{value}</div>
    </div>
  )
}
