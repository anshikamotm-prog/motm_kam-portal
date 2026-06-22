"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import { useKAMNames } from "@/hooks/useKAMNames"
import type { AdminNote } from "@/types/guidance"

const reactionVariant = (r?: string) => {
  if (r === "Done") return "green" as const
  if (r === "In Progress") return "blue" as const
  if (r === "Need Help") return "red" as const
  return "gray" as const
}

export default function AdminGuidanceView() {
  const { data: kamNames = [] } = useKAMNames()
  const [filterKam, setFilterKam] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")

  const { data: notes, isLoading } = useQuery<AdminNote[]>({
    queryKey: ["guidance", filterKam],
    queryFn: () => fetch(`/api/guidance${filterKam !== "All" ? `?kam=${filterKam}` : ""}`).then((r) => r.json()),
  })

  const filtered = notes?.filter((n) => filterStatus === "All" || (filterStatus === "Awaiting" ? !n.reaction : n.reaction === filterStatus)) ?? []

  const stats = {
    awaiting: notes?.filter((n) => !n.reaction).length ?? 0,
    done: notes?.filter((n) => n.reaction === "Done").length ?? 0,
    needHelp: notes?.filter((n) => n.reaction === "Need Help").length ?? 0,
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">Guidance Tracker</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.awaiting}</div>
          <div className="text-xs text-slate-500">Awaiting Response</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.done}</div>
          <div className="text-xs text-slate-500">Done</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 bg-red-50 p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.needHelp}</div>
          <div className="text-xs text-slate-500">Need Help</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterKam} onValueChange={setFilterKam}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All KAMs" /></SelectTrigger>
          <SelectContent><SelectItem value="All">All KAMs</SelectItem>{kamNames.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Awaiting">Awaiting</SelectItem>
            <SelectItem value="Done">Done</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Need Help">Need Help</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Date Sent", "Company", "KAM", "Guidance", "Response", "Note", "Responded At"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No guidance notes found</td></tr>}
            {filtered.map((n) => (
              <tr key={n.rowNum} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(n.timestamp)}</td>
                <td className="px-3 py-2.5 font-medium text-slate-800">{n.company || "—"}</td>
                <td className="px-3 py-2.5 text-slate-600">{n.kamAssigned}</td>
                <td className="px-3 py-2.5 max-w-[200px] text-xs text-slate-700 truncate">{n.note}</td>
                <td className="px-3 py-2.5">
                  {n.reaction ? <Badge variant={reactionVariant(n.reaction)}>{n.reaction}</Badge> : <Badge variant="yellow">Awaiting</Badge>}
                </td>
                <td className="px-3 py-2.5 max-w-[120px] text-xs text-slate-500 truncate">{n.reactionNote || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">{n.reactedAt ? formatDate(n.reactedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
