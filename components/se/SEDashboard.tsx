"use client"
import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { useTargets } from "@/hooks/useTargets"
import { useClients } from "@/hooks/useClients"
import { useQuery } from "@tanstack/react-query"
import { getCurrentPeriod, formatPeriodLabel } from "@/lib/utils"
import { PageSpinner } from "@/components/shared/Spinner"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/types/task"
import type { Client } from "@/types/client"
import { ExternalLink, BookOpen, ClipboardList, FileText, Star } from "lucide-react"

export default function SEDashboard() {
  const { data: session } = useSession()
  const seName = session?.user?.fullName ?? ""
  const period = getCurrentPeriod()

  const { data: targets = [], isLoading: targetsLoading } = useTargets(period)
  const { data: clients = [], isLoading: clientsLoading } = useClients()
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => fetch("/api/tasks").then((r) => r.json()),
  })

  const enquiryStats = useMemo(() => {
    const enqs = targets.filter((t) => t.type === "Enquiries")
    return {
      target: enqs.reduce((s, t) => s + (parseInt(t.target) || 0), 0),
      achieved: enqs.reduce((s, t) => s + (t.enquiryCount ?? 0), 0),
    }
  }, [targets])

  const poStats = useMemo(() => {
    const pos = targets.filter((t) => t.type === "PO")
    return {
      target: pos.reduce((s, t) => s + (parseInt(t.target) || 0), 0),
      achieved: pos.reduce((s, t) => s + (parseInt(t.achieved) || 0), 0),
    }
  }, [targets])

  const clientTargets = useMemo(() => {
    const map: Record<string, { company: string; rows: typeof targets }> = {}
    targets.forEach((t) => {
      if (!map[t.clientId]) map[t.clientId] = { company: t.company, rows: [] }
      map[t.clientId].rows.push(t)
    })
    return Object.entries(map).map(([clientId, v]) => ({ clientId, ...v }))
  }, [targets])

  const myTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.assignedTo ?? "").toLowerCase() === seName.toLowerCase() &&
          t.status !== "Completed" &&
          t.status !== "Closed"
      ),
    [tasks, seName]
  )

  if (targetsLoading || clientsLoading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">My Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">{seName} · {formatPeriodLabel(period)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Enquiries Target" value={enquiryStats.target} />
        <StatCard label="Enquiries Done" value={enquiryStats.achieved} highlight={enquiryStats.target > 0 && enquiryStats.achieved >= enquiryStats.target} />
        <StatCard label="PO Target" value={poStats.target} />
        <StatCard label="PO Achieved" value={poStats.achieved} highlight={poStats.target > 0 && poStats.achieved >= poStats.target} />
      </div>

      {/* Client-wise targets */}
      {clientTargets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
            My Targets — {formatPeriodLabel(period)}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Client", "Type", "Target", "Achieved", "%"].map((h) => (
                  <th key={h} className={`px-4 py-2 text-xs font-semibold text-slate-500 ${h === "Client" || h === "Type" ? "text-left" : "text-center"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientTargets.map(({ clientId, company, rows }) =>
                rows.map((t, i) => {
                  const achieved = t.type === "Enquiries" ? (t.enquiryCount ?? 0) : (parseInt(t.achieved) || 0)
                  const tgt = parseInt(t.target) || 0
                  const pct = tgt > 0 ? Math.round((achieved / tgt) * 100) : 0
                  return (
                    <tr key={`${clientId}-${t.type}`} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{i === 0 ? company : ""}</td>
                      <td className="px-4 py-2.5"><Badge variant="gray" className="text-[10px]">{t.type}</Badge></td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{tgt}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{achieved}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-semibold ${pct >= 100 ? "text-green-600" : pct >= 60 ? "text-blue-600" : "text-red-500"}`}>{pct}%</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* My Clients */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
          My Clients ({clients.length})
        </div>
        <div className="divide-y divide-slate-100">
          {clients.length === 0 && (
            <div className="px-4 py-6 text-xs text-slate-400 text-center">No clients assigned</div>
          )}
          {(clients as Client[]).map((c) => (
            <div key={c.clientId} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm truncate">{c.company}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {c.contact}{c.phone ? ` · ${c.phone}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {c.phone && (
                  <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline flex items-center gap-1">
                    WhatsApp <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {c.sheetId && (
                  <a href={`https://docs.google.com/spreadsheets/d/${c.sheetId}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#0369a1] hover:underline flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Sheet
                  </a>
                )}
                {c.dashboardId && (
                  <a href={`https://docs.google.com/spreadsheets/d/${c.dashboardId}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#0369a1] hover:underline flex items-center gap-1">
                    <Star className="h-3 w-3" /> Dashboard
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
            My Open Tasks ({myTasks.length})
          </div>
          <div className="divide-y divide-slate-100">
            {myTasks.map((t) => (
              <div key={t.taskId} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{t.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.company} · Due: {t.dueDate || "—"}</div>
                </div>
                <Badge
                  variant={t.priority === "High" || t.priority === "Critical" ? "red" : t.priority === "Medium" ? "yellow" : "gray"}
                  className="text-[10px] shrink-0"
                >
                  {t.priority}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          {process.env.NEXT_PUBLIC_ENQUIRY_FORM_URL && (
            <QuickLink
              href={process.env.NEXT_PUBLIC_ENQUIRY_FORM_URL}
              icon={<ClipboardList className="h-4 w-4" />}
              label="Submit Enquiry"
              color="blue"
            />
          )}
          {process.env.NEXT_PUBLIC_TRAINING_URL && (
            <QuickLink
              href={process.env.NEXT_PUBLIC_TRAINING_URL}
              icon={<BookOpen className="h-4 w-4" />}
              label="Training Portal"
              color="purple"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${highlight ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-2xl font-bold ${highlight ? "text-green-600" : "text-[#1e3a5f]"}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function QuickLink({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: "blue" | "purple" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    purple: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${colors[color]}`}
    >
      {icon} {label} <ExternalLink className="h-3.5 w-3.5" />
    </a>
  )
}
