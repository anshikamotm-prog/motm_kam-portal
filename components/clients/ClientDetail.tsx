"use client"
import { useState, useMemo } from "react"
import type { Client } from "@/types/client"
import { useUpdateClient } from "@/hooks/useClients"
import { useMeetings } from "@/hooks/useMeetings"
import { useTasks } from "@/hooks/useTasks"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { HealthDot } from "@/components/shared/HealthDot"
import { HealthBadge, FeedbackBadge, ClientStatusBadge } from "@/components/shared/StatusBadge"
import { LogFeedbackModal } from "@/components/shared/LogFeedbackModal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatDate, daysSince, cn } from "@/lib/utils"
import { STATUS_OPTIONS, HEALTH_OPTIONS, FEEDBACK_STATUS, RESOLUTION_STATUS_OPTIONS } from "@/constants"
import type { FeedbackEntry } from "@/types/feedback"
import { ExternalLink, MessageSquare, CalendarPlus, FileText, Star, ChevronDown, ChevronUp, Plus, Activity } from "lucide-react"

interface Props {
  client: Client
  onUpdated: (c: Client) => void
}

export function ClientDetail({ client, onUpdated }: Props) {
  const [form, setForm] = useState({
    status: client.status,
    health: client.health,
    feedbackStatus: client.feedbackStatus,
    nextFollowup: client.nextFollowup,
    lastFeedbackDate: client.lastFeedbackDate,
    kamNotes: client.kamNotes,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMOM, setShowMOM] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [resolutionStatus, setResolutionStatus] = useState("")
  const update = useUpdateClient()
  const qc = useQueryClient()

  const { data: feedbackData } = useQuery<FeedbackEntry[]>({
    queryKey: ["feedback", client.clientId],
    queryFn: () => fetch(`/api/feedback?clientId=${client.clientId}`).then((r) => r.json()),
  })
  const lastFeedback = Array.isArray(feedbackData) ? (feedbackData[0] ?? null) : null

  const updateResolution = useMutation({
    mutationFn: (data: { rowNum: number; resolutionStatus: string }) =>
      fetch("/api/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback", client.clientId] })
      setResolutionStatus("") // clear local selection so the refreshed value from the query drives the display
    },
  })

  const { data: momEntries = [], isLoading: momLoading } = useQuery<any[]>({
    queryKey: ["mom", client.clientId],
    queryFn: () => fetch(`/api/mom/${client.clientId}`).then((r) => r.json()),
    enabled: showMOM,
  })

  const { data: allMeetings = [] } = useMeetings()
  const { data: allTasks = [] } = useTasks()

  // Compute timeline only when expanded
  const timeline = useMemo(() => {
    if (!showTimeline) return []
    type TEntry = { type: "feedback" | "meeting" | "task"; date: string; label: string; sub: string; done: boolean }
    const events: TEntry[] = []

    if (Array.isArray(feedbackData)) {
      feedbackData.forEach((f) => events.push({
        type: "feedback",
        date: f.date,
        label: f.interactionType || "Feedback",
        sub: f.whatDiscussed,
        done: true,
      }))
    }

    allMeetings
      .filter((m) => m.clientId === client.clientId)
      .forEach((m) => events.push({
        type: "meeting",
        date: m.date,
        label: m.title || m.meetingType || "Meeting",
        sub: m.status,
        done: m.status === "Completed",
      }))

    allTasks
      .filter((t) => t.clientId === client.clientId)
      .forEach((t) => events.push({
        type: "task",
        date: t.dueDate || "",
        label: t.title,
        sub: t.status,
        done: t.status === "Done" || t.status === "Completed",
      }))

    return events
      .filter((e) => e.date)
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      .slice(0, 30)
  }, [showTimeline, feedbackData, allMeetings, allTasks, client.clientId])

  const createTask = useMutation({
    mutationFn: (data: object) => fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await update.mutateAsync({ id: client.clientId, ...form })
      setSaved(true)
      onUpdated({ ...client, ...form })
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const days = daysSince(client.lastFeedbackDate)

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <HealthDot health={client.health} className="h-3.5 w-3.5" />
          <h2 className="text-xl font-bold text-[#1e3a5f]">{client.company}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="gray">{client.clientId}</Badge>
          {client.industry && <Badge variant="gray">{client.industry}</Badge>}
          <ClientStatusBadge status={client.status} />
          <HealthBadge health={client.health} />
          <FeedbackBadge status={client.feedbackStatus} />
          {client.overdue === "YES" && <Badge variant="red">Overdue</Badge>}
          {client.aiPriority && <Badge variant="purple">{client.aiPriority}</Badge>}
        </div>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <InfoCell label="SE" value={client.se || "—"} />
        <InfoCell label="Start Date" value={formatDate(client.startDate)} />
        <InfoCell label="Duration" value={client.durationDays ? `${client.durationDays} days` : "—"} />
        <InfoCell label="Last Feedback" value={formatDate(client.lastFeedbackDate)} highlight={days !== null && days > 7} />
        <InfoCell label="Days Since" value={days !== null ? `${days}d` : "—"} highlight={days !== null && days > 7} />
        <InfoCell label="Next Follow-up" value={formatDate(client.nextFollowup)} />
      </div>

      {/* Quick Update */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Quick Update</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Health</Label>
            <Select value={form.health} onValueChange={(v) => setForm((f) => ({ ...f, health: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEALTH_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Feedback Status</Label>
            <Select value={form.feedbackStatus} onValueChange={(v) => setForm((f) => ({ ...f, feedbackStatus: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_STATUS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Next Follow-up</Label>
            <input
              type="date"
              value={form.nextFollowup}
              onChange={(e) => setForm((f) => ({ ...f, nextFollowup: e.target.value }))}
              className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">KAM Notes</Label>
          <Textarea
            value={form.kamNotes}
            onChange={(e) => setForm((f) => ({ ...f, kamNotes: e.target.value }))}
            className="min-h-[60px] text-xs"
            placeholder="Internal notes..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowFeedbackModal(true)}>
            <MessageSquare className="h-3.5 w-3.5" /> Log Feedback
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/dashboard/meetings?new=1&clientId=${client.clientId}`}>
              <CalendarPlus className="h-3.5 w-3.5" /> Meeting
            </a>
          </Button>
        </div>
      </div>

      {/* Last Feedback */}
      {lastFeedback && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Last Feedback</h3>
            <span className="text-xs text-slate-400">{formatDate(lastFeedback.date)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lastFeedback.healthUpdate && <HealthBadge health={lastFeedback.healthUpdate} />}
            {lastFeedback.feedbackStatus && <FeedbackBadge status={lastFeedback.feedbackStatus} />}
            {lastFeedback.interactionType && <Badge variant="gray">{lastFeedback.interactionType}</Badge>}
          </div>
          {lastFeedback.whatDiscussed && (
            <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5">
              <span className="font-medium text-slate-500">Discussed: </span>{lastFeedback.whatDiscussed}
            </div>
          )}
          {lastFeedback.clientConcern && (
            <div className="text-xs text-slate-600 bg-yellow-50 rounded px-2 py-1.5">
              <span className="font-medium text-yellow-700">Client Concern: </span>{lastFeedback.clientConcern}
            </div>
          )}
          {lastFeedback.actionRequired && (
            <div className="text-xs text-slate-600 bg-blue-50 rounded px-2 py-1.5">
              <span className="font-medium text-blue-600">Action: </span>{lastFeedback.actionRequired}
              {lastFeedback.actionOwner && <span className="text-slate-400"> · {lastFeedback.actionOwner}</span>}
              {lastFeedback.actionDueDate && <span className="text-slate-400"> · Due {formatDate(lastFeedback.actionDueDate)}</span>}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <Label className="text-xs shrink-0 text-slate-500">Resolution:</Label>
            <Select
              value={resolutionStatus || lastFeedback.resolutionStatus}
              onValueChange={setResolutionStatus}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-7 text-xs px-3 shrink-0"
              disabled={!resolutionStatus || resolutionStatus === lastFeedback.resolutionStatus || updateResolution.isPending}
              onClick={() => updateResolution.mutate({ rowNum: lastFeedback.rowNum, resolutionStatus })}
            >
              {updateResolution.isPending ? "..." : updateResolution.isSuccess ? "Saved ✓" : "Update"}
            </Button>
          </div>
        </div>
      )}

      {/* Quick action links */}
      <div className="flex flex-wrap gap-2">
        {client.sheetId && (
          <a href={`https://docs.google.com/spreadsheets/d/${client.sheetId}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#0369a1] hover:underline">
            <FileText className="h-3.5 w-3.5" /> Client Sheet
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {client.dashboardId && (
          <a href={client.dashboardId} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#0369a1] hover:underline">
            <Star className="h-3.5 w-3.5" /> Dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Contact & Services */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact</h4>
          <div className="space-y-0.5">
            <div className="text-slate-700">{client.contact || "—"}</div>
            {client.phone && <div className="text-slate-500 text-xs">{client.phone}</div>}
            <div className="text-slate-500 text-xs">{client.city}</div>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Services</h4>
          <div className="text-slate-700 text-xs">{client.services || "—"}</div>
          {client.contractValue && (
            <div className="text-xs text-slate-500 mt-1">Contract: ₹{client.contractValue}</div>
          )}
          {client.monthlyValue && (
            <div className="text-xs text-slate-500">Monthly: ₹{client.monthlyValue}</div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowTimeline((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            Activity Timeline
          </span>
          {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showTimeline && (
          <div className="divide-y divide-slate-100">
            {timeline.length === 0 && (
              <div className="px-4 py-6 text-xs text-slate-400 text-center">No activity recorded</div>
            )}
            {timeline.map((entry, i) => (
              <div key={i} className="px-4 py-2.5 flex gap-3 items-start">
                <div className="mt-1.5 shrink-0">
                  {entry.type === "feedback" && <div className="h-2 w-2 rounded-full bg-blue-400" />}
                  {entry.type === "meeting" && <div className="h-2 w-2 rounded-full bg-green-400" />}
                  {entry.type === "task" && <div className="h-2 w-2 rounded-full bg-purple-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700 capitalize">{entry.type}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatDate(entry.date)}</span>
                  </div>
                  <div className="text-xs text-slate-600 truncate">{entry.label}</div>
                  {entry.sub && (
                    <div className={cn(
                      "text-[10px] mt-0.5",
                      entry.done ? "text-green-600" : "text-slate-400"
                    )}>
                      {entry.sub}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MOM History */}
      {client.sheetId && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowMOM((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span>MOM History</span>
            {showMOM ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showMOM && (
            <div className="divide-y divide-slate-100">
              {momLoading && <div className="px-4 py-6 text-xs text-slate-400 text-center">Loading...</div>}
              {!momLoading && momEntries.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-400 text-center">No MOM records found</div>
              )}
              {momEntries.map((mom, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{mom.date}</span>
                      {mom.meetingType && <Badge variant="gray" className="text-[10px]">{mom.meetingType}</Badge>}
                    </div>
                    {mom.actionItems && (
                      <Button
                        size="sm" variant="outline"
                        className="h-6 text-[10px] gap-1 px-2"
                        onClick={() => createTask.mutate({
                          clientId: client.clientId,
                          company: client.company,
                          title: `MOM Action — ${mom.date}`,
                          description: mom.actionItems,
                          priority: "Medium",
                          dueDate: mom.nextMeetingDate || new Date().toISOString().split("T")[0],
                          source: "MOM",
                        })}
                      >
                        <Plus className="h-3 w-3" /> Create Task
                      </Button>
                    )}
                  </div>
                  {mom.attendees && <div className="text-[10px] text-slate-400">Attendees: {mom.attendees}</div>}
                  {mom.discussionPoints && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                      <span className="font-medium text-slate-500">Discussion: </span>{mom.discussionPoints}
                    </div>
                  )}
                  {mom.actionItems && (
                    <div className="text-xs text-slate-600 bg-blue-50 rounded px-2 py-1">
                      <span className="font-medium text-blue-600">Actions: </span>{mom.actionItems}
                    </div>
                  )}
                  {mom.decisionsTaken && (
                    <div className="text-xs text-slate-600 bg-green-50 rounded px-2 py-1">
                      <span className="font-medium text-green-600">Decisions: </span>{mom.decisionsTaken}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline Log Feedback modal */}
      {showFeedbackModal && (
        <LogFeedbackModal
          client={client}
          onClose={() => setShowFeedbackModal(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["feedback", client.clientId] })}
        />
      )}
    </div>
  )
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-medium ${highlight ? "text-red-600" : "text-slate-700"}`}>{value}</div>
    </div>
  )
}
