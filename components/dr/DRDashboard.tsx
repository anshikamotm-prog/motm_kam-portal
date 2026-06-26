"use client"
import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  ExternalLink, FileSpreadsheet, LayoutDashboard,
  BookOpen, Wrench, ChevronDown, ChevronUp, Plus, X,
} from "lucide-react"
import type { Client } from "@/types/client"
import type { Target } from "@/types/target"
import { getCurrentPeriod } from "@/lib/utils"
import { EMAIL_RESPONSE_TYPES } from "@/constants"

interface EmailResponseForm {
  clientId: string
  company: string
  contactPerson: string
  designation: string
  contactEmail: string
  responseDate: string
  responseType: string
  responseSummary: string
  nextAction: string
  notes: string
}

const emptyForm = (clientId = "", company = ""): EmailResponseForm => ({
  clientId, company,
  contactPerson: "", designation: "", contactEmail: "",
  responseDate: new Date().toISOString().split("T")[0],
  responseType: "Positive", responseSummary: "", nextAction: "", notes: "",
})

export default function DRDashboard() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const drName = session?.user?.fullName ?? ""
  const kamName = session?.user?.kamName ?? ""

  const [period, setPeriod] = useState(getCurrentPeriod())
  const [logModal, setLogModal] = useState<EmailResponseForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [editAchieved, setEditAchieved] = useState<{ rowNum: number; value: string } | null>(null)

  // Fetch all KAM team clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => fetch("/api/clients").then((r) => r.json()),
  })

  // Fetch DR targets for current period
  const { data: targets = [] } = useQuery<Target[]>({
    queryKey: ["targets", period],
    queryFn: () => fetch(`/api/targets?period=${encodeURIComponent(period)}`).then((r) => r.json()),
  })

  // Log email response mutation
  const logResponse = useMutation({
    mutationFn: (form: EmailResponseForm) =>
      fetch("/api/email-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, period }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["targets", period] })
      setLogModal(null)
    },
  })

  // Update Data Collection achieved count — passes period so API can detect carry-forward rows
  const updateAchieved = useMutation({
    mutationFn: ({ rowNum, achieved }: { rowNum: number; achieved: number }) =>
      fetch(`/api/targets/${rowNum}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achieved, period }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["targets", period] })
      setEditAchieved(null)
    },
  })

  // Build per-client target map
  const clientTargets = useMemo(() => {
    const map: Record<string, { dc?: Target; er?: Target }> = {}
    targets.forEach((t) => {
      if (!map[t.clientId]) map[t.clientId] = {}
      if (t.type === "Data Collection") map[t.clientId].dc = t
      if (t.type === "Email Response") map[t.clientId].er = t
    })
    return map
  }, [targets])

  // Summary stats
  const totalDC = targets.filter((t) => t.type === "Data Collection").reduce((s, t) => s + (parseInt(t.target) || 0), 0)
  const achievedDC = targets.filter((t) => t.type === "Data Collection").reduce((s, t) => s + (parseInt(t.achieved) || 0), 0)
  const totalER = targets.filter((t) => t.type === "Email Response").reduce((s, t) => s + (parseInt(t.target) || 0), 0)
  const achievedER = targets.filter((t) => t.type === "Email Response").reduce((s, t) => s + (t.emailResponseCount ?? 0), 0)

  const handleSaveResponse = async () => {
    if (!logModal) return
    if (!logModal.contactPerson || !logModal.responseType || !logModal.responseSummary) return
    setSaving(true)
    await logResponse.mutateAsync(logModal)
    setSaving(false)
  }

  const handleSaveAchieved = async () => {
    if (!editAchieved) return
    const val = parseInt(editAchieved.value)
    if (isNaN(val) || val < 0) return
    await updateAchieved.mutateAsync({ rowNum: editAchieved.rowNum, achieved: val })
  }

  // Week navigation
  const weeks = useMemo(() => {
    const now = new Date()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const result: string[] = []
    for (let offset = 3; offset >= -1; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset * 7)
      result.push(`${months[d.getMonth()]} ${d.getFullYear()} W${Math.ceil(d.getDate() / 7)}`)
    }
    return [...new Set(result)]
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Research Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{kamName} Team — {drName}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">Week</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {weeks.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Clients" value={clients.length} sub="in your team" color="blue" />
        <StatCard label="Data Collected" value={`${achievedDC}/${totalDC}`} sub="companies this week" color={achievedDC >= totalDC && totalDC > 0 ? "green" : "orange"} />
        <StatCard label="Email Responses" value={`${achievedER}/${totalER}`} sub="responses this week" color={achievedER >= totalER && totalER > 0 ? "green" : "purple"} />
        <StatCard label="On Target" value={`${clients.filter((c) => { const ct = clientTargets[c.clientId]; const dc = parseInt(ct?.dc?.achieved || "0"); const dct = parseInt(ct?.dc?.target || "0"); return dct > 0 && dc >= dct }).length}/${clients.filter((c) => clientTargets[c.clientId]?.dc).length}`} sub="clients complete" color="slate" />
      </div>

      {/* Quick Links */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {process.env.NEXT_PUBLIC_DATA_TOOLS_URL && (
            <QuickLink href={process.env.NEXT_PUBLIC_DATA_TOOLS_URL} icon={<Wrench className="h-4 w-4" />} label="Data Tools" />
          )}
          {process.env.NEXT_PUBLIC_TRAINING_URL && (
            <QuickLink href={process.env.NEXT_PUBLIC_TRAINING_URL} icon={<BookOpen className="h-4 w-4" />} label="Training Portal" />
          )}
        </div>
      </div>

      {/* Client list with targets */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">
            Client Targets — {period}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Links</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data Collected</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => {
                const ct = clientTargets[client.clientId] ?? {}
                const dcTarget = parseInt(ct.dc?.target || "0")
                const dcAchieved = parseInt(ct.dc?.achieved || "0")
                const erTarget = parseInt(ct.er?.target || "0")
                const erAchieved = ct.er?.emailResponseCount ?? 0
                const dcPct = dcTarget > 0 ? Math.round((dcAchieved / dcTarget) * 100) : null
                const erDone = erAchieved >= erTarget && erTarget > 0

                return (
                  <tr key={client.clientId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{client.company}</div>
                      <div className="text-xs text-slate-400">{client.industry || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {client.sheetId && (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${client.sheetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Client Workbook"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Workbook
                          </a>
                        )}
                        {client.dashboardId && (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${client.dashboardId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Client Dashboard"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Dashboard
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ct.dc ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${dcPct !== null && dcPct >= 100 ? "text-green-600" : dcPct !== null && dcPct >= 60 ? "text-orange-500" : "text-red-500"}`}>
                              {dcAchieved}
                            </span>
                            <span className="text-slate-400">/ {dcTarget}</span>
                            <button
                              onClick={() => setEditAchieved({ rowNum: ct.dc!.rowNum, value: String(dcAchieved) })}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                          {dcTarget > 0 && (
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${dcPct !== null && dcPct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                                style={{ width: `${Math.min(dcPct ?? 0, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">No target</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ct.er ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${erDone ? "text-green-600" : "text-red-500"}`}>
                              {erAchieved}
                            </span>
                            <span className="text-slate-400">/ {erTarget}</span>
                            {erDone ? (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓</span>
                            ) : (
                              <button
                                onClick={() => setLogModal(emptyForm(client.clientId, client.company))}
                                className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors"
                              >
                                <Plus className="h-3 w-3" /> Log
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLogModal(emptyForm(client.clientId, client.company))}
                          className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Log
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No clients assigned to your team yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Achieved Modal (Data Collection) */}
      {editAchieved && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Update Data Collected</h3>
            <input
              type="number"
              min={0}
              value={editAchieved.value}
              onChange={(e) => setEditAchieved({ ...editAchieved, value: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditAchieved(null)}
                className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAchieved}
                disabled={updateAchieved.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {updateAchieved.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Email Response Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Log Email Response — {logModal.company}</h3>
              <button onClick={() => setLogModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Person *">
                  <input
                    value={logModal.contactPerson}
                    onChange={(e) => setLogModal({ ...logModal, contactPerson: e.target.value })}
                    placeholder="Name"
                    className={inputCls}
                  />
                </Field>
                <Field label="Designation">
                  <input
                    value={logModal.designation}
                    onChange={(e) => setLogModal({ ...logModal, designation: e.target.value })}
                    placeholder="Job title"
                    className={inputCls}
                  />
                </Field>
                <Field label="Contact Email">
                  <input
                    type="email"
                    value={logModal.contactEmail}
                    onChange={(e) => setLogModal({ ...logModal, contactEmail: e.target.value })}
                    placeholder="email@company.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Response Date">
                  <input
                    type="date"
                    value={logModal.responseDate}
                    onChange={(e) => setLogModal({ ...logModal, responseDate: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Response Type *">
                <div className="flex gap-2">
                  {EMAIL_RESPONSE_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setLogModal({ ...logModal, responseType: t })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        logModal.responseType === t
                          ? t === "Positive" ? "bg-green-600 border-green-600 text-white"
                            : t === "Negative" ? "bg-red-600 border-red-600 text-white"
                            : "bg-slate-600 border-slate-600 text-white"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Response Summary *">
                <textarea
                  value={logModal.responseSummary}
                  onChange={(e) => setLogModal({ ...logModal, responseSummary: e.target.value })}
                  placeholder="What did they say in the email?"
                  rows={3}
                  className={inputCls}
                />
              </Field>
              <Field label="Next Action">
                <input
                  value={logModal.nextAction}
                  onChange={(e) => setLogModal({ ...logModal, nextAction: e.target.value })}
                  placeholder="What to do next?"
                  className={inputCls}
                />
              </Field>
              <Field label="Notes">
                <input
                  value={logModal.notes}
                  onChange={(e) => setLogModal({ ...logModal, notes: e.target.value })}
                  placeholder="Additional context"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setLogModal(null)}
                className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResponse}
                disabled={saving || logResponse.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Log Response"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
    slate: "bg-slate-50 text-slate-700",
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color] ?? colors.slate}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-0.5">{label}</div>
      <div className="text-xs opacity-70 mt-0.5">{sub}</div>
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
    >
      {icon}
      {label}
      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
    </a>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
