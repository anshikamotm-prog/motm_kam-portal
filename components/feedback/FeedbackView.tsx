"use client"
import { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { useClients } from "@/hooks/useClients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FeedbackBadge, HealthBadge } from "@/components/shared/StatusBadge"
import { formatDate } from "@/lib/utils"
import { INTERACTION_TYPES, FEEDBACK_STATUS, HEALTH_OPTIONS, ACTION_OWNERS, RESOLUTION_STATUS_OPTIONS } from "@/constants"
import type { FeedbackEntry } from "@/types/feedback"

const today = new Date().toISOString().split("T")[0]

export default function FeedbackView() {
  const { data: clients } = useClients()
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const didPrefill = useRef(false)
  const [form, setForm] = useState({
    date: today,
    clientId: "",
    company: "",
    seName: "",
    interactionType: "",
    feedbackStatus: "",
    healthUpdate: "",
    whatDiscussed: "",
    clientConcern: "",
    actionRequired: "",
    actionOwner: "",
    actionDueDate: "",
    resolutionStatus: "",
    currentStatus: "",
    nextFollowupDate: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Pre-fill client from ?clientId= query param (e.g. navigating from ClientDetail)
  useEffect(() => {
    if (didPrefill.current || !clients?.length) return
    const id = searchParams.get("clientId")
    if (!id) return
    const c = clients.find((c) => c.clientId === id)
    if (c) {
      setForm((f) => ({ ...f, clientId: id, company: c.company, seName: c.se, feedbackStatus: c.feedbackStatus, healthUpdate: c.health }))
      didPrefill.current = true
    }
  }, [clients, searchParams])

  const { data: recent } = useQuery<FeedbackEntry[]>({
    queryKey: ["feedback"],
    queryFn: () => fetch("/api/feedback").then((r) => r.json()),
  })

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleClientChange = (clientId: string) => {
    const c = clients?.find((c) => c.clientId === clientId)
    setForm((f) => ({
      ...f, clientId,
      company: c?.company ?? "",
      seName: c?.se ?? "",
      feedbackStatus: c?.feedbackStatus ?? "",
      healthUpdate: c?.health ?? "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.whatDiscussed) return
    setSubmitting(true)
    const res = await fetch("/api/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    })
    if (res.ok) {
      setSubmitted(true)
      qc.invalidateQueries({ queryKey: ["feedback"] })
      qc.invalidateQueries({ queryKey: ["clients"] })
      setForm((f) => ({ ...f, whatDiscussed: "", clientConcern: "", actionRequired: "", currentStatus: "" }))
      setTimeout(() => setSubmitted(false), 3000)
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Log Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">Record client interaction and update status</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date *">
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          </Field>
          <Field label="Client *">
            <Select value={form.clientId} onValueChange={handleClientChange}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {clients?.map((c) => <SelectItem key={c.clientId} value={c.clientId}>{c.company}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="SE Name">
            <Input value={form.seName} onChange={(e) => set("seName", e.target.value)} placeholder="Sales Engineer" />
          </Field>
          <Field label="Interaction Type">
            <Select value={form.interactionType} onValueChange={(v) => set("interactionType", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Feedback Status">
            <Select value={form.feedbackStatus} onValueChange={(v) => set("feedbackStatus", v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Health Update">
            <Select value={form.healthUpdate} onValueChange={(v) => set("healthUpdate", v)}>
              <SelectTrigger><SelectValue placeholder="Select health" /></SelectTrigger>
              <SelectContent>
                {HEALTH_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="What Was Discussed *">
          <Textarea value={form.whatDiscussed} onChange={(e) => set("whatDiscussed", e.target.value)} required rows={3} placeholder="Summary of discussion..." />
        </Field>
        <Field label="Client Concern">
          <Textarea value={form.clientConcern} onChange={(e) => set("clientConcern", e.target.value)} rows={2} placeholder="Any concerns raised..." />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Action Required">
            <Input value={form.actionRequired} onChange={(e) => set("actionRequired", e.target.value)} placeholder="What needs to be done" />
          </Field>
          <Field label="Action Owner">
            <Select value={form.actionOwner} onValueChange={(v) => set("actionOwner", v)}>
              <SelectTrigger><SelectValue placeholder="Who owns it" /></SelectTrigger>
              <SelectContent>
                {ACTION_OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Action Due Date">
            <Input type="date" value={form.actionDueDate} onChange={(e) => set("actionDueDate", e.target.value)} />
          </Field>
          <Field label="Resolution Status">
            <Select value={form.resolutionStatus} onValueChange={(v) => set("resolutionStatus", v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {RESOLUTION_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Next Follow-up Date">
            <Input type="date" value={form.nextFollowupDate} onChange={(e) => set("nextFollowupDate", e.target.value)} />
          </Field>
        </div>
        <Field label="Current Status (1 line)">
          <Input value={form.currentStatus} onChange={(e) => set("currentStatus", e.target.value)} placeholder="One-line current status..." />
        </Field>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting || !form.whatDiscussed}>
            {submitting ? "Saving..." : submitted ? "Saved ✓" : "Log Feedback"}
          </Button>
        </div>
      </form>

      {/* Recent feedback */}
      <div>
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-3">Recent Feedback (30 days)</h2>
        <div className="space-y-2">
          {recent?.map((f) => (
            <div key={f.rowNum} className="bg-white rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-slate-800">{f.company}</div>
                <div className="flex items-center gap-2">
                  <FeedbackBadge status={f.feedbackStatus} />
                  <span className="text-xs text-slate-400">{formatDate(f.date)}</span>
                </div>
              </div>
              <div className="text-slate-600 text-xs">{f.interactionType} · {f.seName}</div>
              <div className="text-slate-700 mt-1 text-xs line-clamp-2">{f.whatDiscussed}</div>
            </div>
          ))}
          {!recent?.length && <div className="text-sm text-slate-400">No recent feedback found.</div>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
