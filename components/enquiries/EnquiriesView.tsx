"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import type { Enquiry } from "@/types/guidance"

const STATUS_LIST = ["New", "In Progress", "Qualified", "Not Interested", "Closed"]

const statusVariant = (s?: string) => {
  if (s === "Qualified") return "green" as const
  if (s === "In Progress") return "blue" as const
  if (s === "Not Interested" || s === "Closed") return "red" as const
  return "gray" as const
}

export default function EnquiriesView() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("All")
  const [detail, setDetail] = useState<Enquiry | null>(null)

  const { data: enquiries, isLoading } = useQuery<Enquiry[]>({
    queryKey: ["enquiries"],
    queryFn: () => fetch("/api/enquiries").then((r) => r.json()),
  })

  const updateStatus = useMutation({
    mutationFn: ({ key, status, note }: { key: string; status: string; note?: string }) =>
      fetch(`/api/enquiries/${encodeURIComponent(key)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enquiries"] }),
  })

  const filtered = enquiries?.filter((e) => statusFilter === "All" || e.status === statusFilter) ?? []

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Enquiries</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Date", "Code", "Company", "SE", "Person", "Type", "Status", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400 text-sm">No enquiries found</td></tr>
            )}
            {filtered.map((e) => (
              <tr key={e.key} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(e.enquiryDate || e.timestamp)}</td>
                <td className="px-3 py-2.5"><Badge variant="gray" className="text-[10px]">{e.clientCode}</Badge></td>
                <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[140px] truncate">{e.company}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{e.seName || e.teamName || "—"}</td>
                <td className="px-3 py-2.5 max-w-[120px]">
                  <div className="truncate text-slate-700">{e.personName}</div>
                  <div className="text-[10px] text-slate-400 truncate">{e.designation}</div>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{e.enquiryType}</td>
                <td className="px-3 py-2.5"><Badge variant={statusVariant(e.status)}>{e.status ?? "New"}</Badge></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetail(e)}>View</Button>
                    <Select value={e.status ?? "New"} onValueChange={(v) => updateStatus.mutate({ key: e.key, status: v })}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.company}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Row label="Date" value={formatDate(detail.enquiryDate || detail.timestamp)} />
              <Row label="Client Code" value={detail.clientCode} />
              <Row label="Enquiry Type" value={detail.enquiryType} />
              <Row label="Contact" value={`${detail.personName} (${detail.designation})`} />
              <Row label="Phone" value={detail.phone} />
              <Row label="Email" value={detail.personEmail} />
              <Row label="Location" value={detail.location} />
              <Row label="Industry" value={detail.industry} />
              {detail.discussion && <div><div className="text-xs font-medium text-slate-500 mb-0.5">Discussion</div><div className="text-slate-700">{detail.discussion}</div></div>}
              {detail.details && <div><div className="text-xs font-medium text-slate-500 mb-0.5">Enquiry Details</div><div className="text-slate-700">{detail.details}</div></div>}
              <div className="flex gap-2 pt-2 flex-wrap">
                {STATUS_LIST.map((s) => (
                  <Button key={s} size="sm" variant={detail.status === s ? "default" : "outline"}
                    onClick={() => { updateStatus.mutate({ key: detail.key, status: s }); setDetail({ ...detail, status: s }) }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <div className="text-xs text-slate-400 w-28 shrink-0">{label}</div>
      <div className="text-slate-700">{value}</div>
    </div>
  )
}
