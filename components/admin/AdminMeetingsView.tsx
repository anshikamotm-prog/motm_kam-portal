"use client"
import { useState } from "react"
import { useMeetings } from "@/hooks/useMeetings"
import { MeetingStatusBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import { MEETING_STATUSES } from "@/constants"
import { useKAMNames } from "@/hooks/useKAMNames"

export default function AdminMeetingsView() {
  const { data: kamNames = [] } = useKAMNames()
  const [filterKam, setFilterKam] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const params: Record<string, string> = {}
  if (filterKam !== "All") params.kam = filterKam
  if (filterStatus !== "All") params.status = filterStatus
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo

  const { data: meetings, isLoading } = useMeetings(Object.keys(params).length ? params : undefined)

  const today = new Date().toISOString().split("T")[0]
  const thisMonth = today.slice(0, 7)
  const stats = {
    today: meetings?.filter((m) => m.date === today).length ?? 0,
    thisMonth: meetings?.filter((m) => m.date?.startsWith(thisMonth)).length ?? 0,
    completed: meetings?.filter((m) => m.status === "Completed").length ?? 0,
    pendingMOM: meetings?.filter((m) => m.status === "Pending Documentation").length ?? 0,
    missed: meetings?.filter((m) => m.status === "Missed").length ?? 0,
    upcoming: meetings?.filter((m) => m.status === "Scheduled" && m.date > today).length ?? 0,
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">All Meetings</h1>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-2">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-xl font-bold text-[#1e3a5f]">{v}</div>
            <div className="text-[10px] text-slate-400 capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2">
        <Select value={filterKam} onValueChange={setFilterKam}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All KAMs" /></SelectTrigger>
          <SelectContent><SelectItem value="All">All KAMs</SelectItem>{kamNames.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="All">All Statuses</SelectItem>{[...MEETING_STATUSES].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs" placeholder="To" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{["Date/Time", "Title", "Client", "KAM", "SE", "Status", "MOM"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {meetings?.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No meetings found</td></tr>}
              {meetings?.map((m) => (
                <tr key={m.meetingId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="text-xs font-medium text-slate-700">{formatDate(m.date)}</div>
                    {m.time && <div className="text-[10px] text-slate-400">{m.time}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[160px] truncate">{m.title}</td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-[120px] truncate">{m.company}</td>
                  <td className="px-3 py-2.5 text-slate-600">{m.kam}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs">{m.se || "—"}</td>
                  <td className="px-3 py-2.5"><MeetingStatusBadge status={m.status} /></td>
                  <td className="px-3 py-2.5">
                    {m.momShared && <Badge variant={m.momShared === "Yes" ? "green" : m.momShared === "Pending" ? "yellow" : "gray"}>{m.momShared}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
