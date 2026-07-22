"use client"
import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useMeetings, useCompleteMeeting, useRescheduleMeeting, useScheduleMeeting, useCancelMeeting } from "@/hooks/useMeetings"
import { useClients } from "@/hooks/useClients"
import { MeetingStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import { MEETING_TYPES, MEETING_STATUSES, ACTION_OWNERS } from "@/constants"
import type { Meeting, CompleteMeetingInput, ActionRow } from "@/types/meeting"
import { CalendarPlus, CheckCircle, RotateCcw } from "lucide-react"

const SUB_TABS = ["All", "Today", "Upcoming", "Pending MOM", "Missed", "Completed"]

export default function MeetingsView() {
  const { data: meetings, isLoading } = useMeetings()
  const { data: clients } = useClients()
  const searchParams = useSearchParams()
  const didPrefill = useRef(false)
  const [tab, setTab] = useState("All")
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [initialClientId, setInitialClientId] = useState("")
  const [completeTarget, setCompleteTarget] = useState<Meeting | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Meeting | null>(null)
  const cancelMeeting = useCancelMeeting()

  // Auto-open schedule modal and pre-fill client from ?clientId= query param
  useEffect(() => {
    if (didPrefill.current || !clients?.length) return
    const id = searchParams.get("clientId")
    if (!id) return
    const exists = clients.some((c) => c.clientId === id)
    if (exists) {
      setInitialClientId(id)
      setScheduleOpen(true)
      didPrefill.current = true
    }
  }, [clients, searchParams])

  const today = new Date().toISOString().split("T")[0]

  const filtered = meetings?.filter((m) => {
    if (tab === "Today") return m.date === today
    if (tab === "Upcoming") return m.status === "Scheduled" && m.date > today
    if (tab === "Pending MOM") return m.status === "Pending Documentation"
    if (tab === "Missed") return m.status === "Missed"
    if (tab === "Completed") return m.status === "Completed"
    return true
  }) ?? []

  const stats = {
    today: meetings?.filter((m) => m.date === today).length ?? 0,
    upcoming: meetings?.filter((m) => m.status === "Scheduled" && m.date > today).length ?? 0,
    pendingMOM: meetings?.filter((m) => m.status === "Pending Documentation").length ?? 0,
    missed: meetings?.filter((m) => m.status === "Missed").length ?? 0,
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">My Meetings</h1>
        <Button size="sm" onClick={() => setScheduleOpen(true)}>
          <CalendarPlus className="h-4 w-4" /> Schedule Meeting
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Today", value: stats.today },
          { label: "Upcoming", value: stats.upcoming },
          { label: "Pending MOM", value: stats.pendingMOM, warn: stats.pendingMOM > 0 },
          { label: "Missed", value: stats.missed, danger: stats.missed > 0 },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.danger ? "border-red-200 bg-red-50" : s.warn ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-white"}`}>
            <div className={`text-2xl font-bold ${s.danger ? "text-red-600" : s.warn ? "text-yellow-600" : "text-[#1e3a5f]"}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-slate-200 p-1">
        {SUB_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? "bg-[#1e3a5f] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-sm text-slate-400 text-center py-8">No meetings found</div>}
        {filtered.map((m) => (
          <div key={m.meetingId} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{m.title}</span>
                  <MeetingStatusBadge status={m.status} />
                  {m.date === today && <Badge variant="blue">TODAY</Badge>}
                </div>
                <div className="text-sm text-slate-600 mt-0.5">{m.company}</div>
                <div className="text-xs text-slate-400 mt-0.5">{formatDate(m.date)} {m.time && `· ${m.time}`} · {m.meetingType}</div>
                {m.summary && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{m.summary}</div>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {(m.status === "Scheduled" || m.status === "Pending Documentation" || m.status === "Rescheduled") && (
                  <Button size="sm" variant="outline" onClick={() => setCompleteTarget(m)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Complete
                  </Button>
                )}
                {(m.status === "Scheduled" || m.status === "Rescheduled") && (
                  <Button size="sm" variant="ghost" onClick={() => setRescheduleTarget(m)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                {m.status === "Rescheduled" && (
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                    onClick={() => { if (confirm("Cancel this meeting?")) cancelMeeting.mutate(m.meetingId) }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {scheduleOpen && <ScheduleMeetingModal open clients={clients ?? []} initialClientId={initialClientId} onClose={() => { setScheduleOpen(false); setInitialClientId("") }} />}
      {completeTarget && <CompleteMeetingModal meeting={completeTarget} onClose={() => setCompleteTarget(null)} />}
      {rescheduleTarget && <RescheduleModal meeting={rescheduleTarget} onClose={() => setRescheduleTarget(null)} />}
    </div>
  )
}

function ScheduleMeetingModal({ open, clients, initialClientId = "", onClose }: { open: boolean; clients: { clientId: string; company: string; se: string }[]; initialClientId?: string; onClose: () => void }) {
  const schedule = useScheduleMeeting()
  const [form, setForm] = useState(() => {
    const c = clients.find((c) => c.clientId === initialClientId)
    return { title: "", clientId: initialClientId, company: c?.company ?? "", meetingType: "", date: "", time: "", participants: "", notes: "" }
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Client</Label>
            <Select value={form.clientId} onValueChange={(v) => { const c = clients.find((c) => c.clientId === v); set("clientId", v); set("company", c?.company ?? "") }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">{clients.map((c) => <SelectItem key={c.clientId} value={c.clientId}>{c.company}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Meeting Type</Label>
            <Select value={form.meetingType} onValueChange={(v) => set("meetingType", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{MEETING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Date *</Label><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Time</Label><Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">Participants</Label><Input value={form.participants} onChange={(e) => set("participants", e.target.value)} /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-[60px]" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.title || !form.date} onClick={() => { schedule.mutate(form); onClose() }}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CompleteMeetingModal({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const complete = useCompleteMeeting()
  const emptyAction = (): ActionRow => ({ item: "", owner: "", dueDate: "" })
  const [form, setForm] = useState<CompleteMeetingInput>({
    summary: "", clientFeedback: "", discussionPoints: "",
    actions: [emptyAction()], momShared: "Pending", nextReviewDate: "",
  })
  const set = (k: keyof Omit<CompleteMeetingInput, "actions">, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const updateAction = (i: number, k: keyof ActionRow, v: string) =>
    setForm((f) => { const a = [...f.actions]; a[i] = { ...a[i], [k]: v }; return { ...f, actions: a } })
  const addAction = () => setForm((f) => ({ ...f, actions: [...f.actions, emptyAction()] }))
  const removeAction = (i: number) => setForm((f) => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }))

  const hasAction = form.actions.some((a) => a.item.trim())

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Complete Meeting: {meeting.title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label className="text-xs">Summary *</Label><Textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">Client Feedback</Label><Textarea value={form.clientFeedback} onChange={(e) => set("clientFeedback", e.target.value)} className="min-h-[60px]" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">Discussion Points</Label><Textarea value={form.discussionPoints} onChange={(e) => set("discussionPoints", e.target.value)} className="min-h-[60px]" /></div>

          {/* Action rows */}
          <div className="col-span-2 space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 text-xs text-slate-500 font-medium px-0.5">
              <span>Action Item *</span><span>Owner</span><span className="w-28">Due Date</span><span></span>
            </div>
            {form.actions.map((action, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
                <Input value={action.item} onChange={(e) => updateAction(i, "item", e.target.value)} placeholder="Action..." className="text-xs h-8" />
                <Input value={action.owner} onChange={(e) => updateAction(i, "owner", e.target.value)} placeholder="Owner..." className="text-xs h-8" />
                <Input type="date" value={action.dueDate} onChange={(e) => updateAction(i, "dueDate", e.target.value)} className="text-xs h-8 w-28" />
                {form.actions.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeAction(i)} className="h-8 w-8 p-0 text-slate-400 hover:text-red-500">×</Button>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addAction} className="text-xs h-7">+ Add Action</Button>
          </div>

          <div className="space-y-1"><Label className="text-xs">MOM Shared</Label>
            <Select value={form.momShared} onValueChange={(v) => set("momShared", v as CompleteMeetingInput["momShared"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Yes", "No", "Pending"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Next Review Date</Label><Input type="date" value={form.nextReviewDate} onChange={(e) => set("nextReviewDate", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.summary || !hasAction} onClick={() => { complete.mutate({ id: meeting.meetingId, ...form }); onClose() }}>Complete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RescheduleModal({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const reschedule = useRescheduleMeeting()
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [reason, setReason] = useState("")

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Reschedule: {meeting.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">New Date *</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">New Time</Label><Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for reschedule..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!newDate} onClick={() => { reschedule.mutate({ id: meeting.meetingId, newDate, newTime, reason }); onClose() }}>Reschedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
