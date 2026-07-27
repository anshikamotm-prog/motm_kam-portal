"use client"
import { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Client } from "@/types/client"
import type { FeedbackEntry } from "@/types/feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { INTERACTION_TYPES, FEEDBACK_STATUS, HEALTH_OPTIONS, ACTION_OWNERS, RESOLUTION_STATUS_OPTIONS } from "@/constants"

interface Props {
  client?: Client
  existingEntry?: FeedbackEntry  // when provided, modal is in edit mode
  onClose: () => void
  onSaved?: () => void
}

export function LogFeedbackModal({ client, existingEntry, onClose, onSaved }: Props) {
  const qc = useQueryClient()
  const isEdit = !!existingEntry
  const displayName = existingEntry?.company ?? client?.company ?? ""

  const [form, setForm] = useState({
    date: existingEntry?.date ?? new Date().toISOString().split("T")[0],
    clientId: existingEntry?.clientId ?? client?.clientId ?? "",
    company: existingEntry?.company ?? client?.company ?? "",
    seName: existingEntry?.seName ?? client?.se ?? "",
    interactionType: existingEntry?.interactionType ?? "",
    feedbackStatus: existingEntry?.feedbackStatus ?? client?.feedbackStatus ?? "",
    healthUpdate: existingEntry?.healthUpdate ?? client?.health ?? "",
    whatDiscussed: existingEntry?.whatDiscussed ?? "",
    clientConcern: existingEntry?.clientConcern ?? "",
    actionRequired: existingEntry?.actionRequired ?? "",
    actionOwner: existingEntry?.actionOwner ?? "",
    actionDueDate: existingEntry?.actionDueDate ?? "",
    resolutionStatus: existingEntry?.resolutionStatus ?? "",
    currentStatus: existingEntry?.currentStatus ?? "",
    nextFollowupDate: existingEntry?.nextFollowupDate ?? "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const set = useCallback((key: string, value: string) => setForm((f) => ({ ...f, [key]: value })), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.whatDiscussed) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/feedback", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { rowNum: existingEntry!.rowNum, ...form } : form),
      })
      if (res.ok) {
        setSubmitted(true)
        qc.invalidateQueries({ queryKey: ["feedback"] })
        qc.invalidateQueries({ queryKey: ["clients"] })
        onSaved?.()
        setTimeout(onClose, 1200)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to save feedback. Please try again.")
      }
    } catch {
      setError("Network error. Please check your connection.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-[#1e3a5f]">{isEdit ? "Edit Feedback" : "Log Feedback"}</h2>
            <p className="text-xs text-slate-500">{displayName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <LFField label="Date *">
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
            </LFField>
            <LFField label="SE Name">
              <Input value={form.seName} onChange={(e) => set("seName", e.target.value)} placeholder="Sales Engineer" />
            </LFField>
            <LFField label="Interaction Type">
              <Select value={form.interactionType} onValueChange={(v) => set("interactionType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </LFField>
            <LFField label="Feedback Status">
              <Select value={form.feedbackStatus} onValueChange={(v) => set("feedbackStatus", v)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {FEEDBACK_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </LFField>
            <LFField label="Health Update">
              <Select value={form.healthUpdate} onValueChange={(v) => set("healthUpdate", v)}>
                <SelectTrigger><SelectValue placeholder="Select health" /></SelectTrigger>
                <SelectContent>
                  {HEALTH_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </LFField>
            <LFField label="Next Follow-up Date">
              <Input type="date" value={form.nextFollowupDate} onChange={(e) => set("nextFollowupDate", e.target.value)} />
            </LFField>
          </div>

          <LFField label="What Was Discussed *">
            <Textarea
              value={form.whatDiscussed}
              onChange={(e) => set("whatDiscussed", e.target.value)}
              required
              rows={3}
              placeholder="Summary of discussion..."
            />
          </LFField>
          <LFField label="Client Concern">
            <Textarea
              value={form.clientConcern}
              onChange={(e) => set("clientConcern", e.target.value)}
              rows={2}
              placeholder="Any concerns raised..."
            />
          </LFField>

          <div className="grid grid-cols-2 gap-4">
            <LFField label="Action Required">
              <Input value={form.actionRequired} onChange={(e) => set("actionRequired", e.target.value)} placeholder="What needs to be done" />
            </LFField>
            <LFField label="Action Owner">
              <Select value={form.actionOwner} onValueChange={(v) => set("actionOwner", v)}>
                <SelectTrigger><SelectValue placeholder="Who owns it" /></SelectTrigger>
                <SelectContent>
                  {ACTION_OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </LFField>
            <LFField label="Action Due Date">
              <Input type="date" value={form.actionDueDate} onChange={(e) => set("actionDueDate", e.target.value)} />
            </LFField>
            <LFField label="Resolution Status">
              <Select value={form.resolutionStatus} onValueChange={(v) => set("resolutionStatus", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {RESOLUTION_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </LFField>
          </div>

          <LFField label="Current Status (1 line)">
            <Input value={form.currentStatus} onChange={(e) => set("currentStatus", e.target.value)} placeholder="One-line current status..." />
          </LFField>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {error ? (
              <p className="text-xs text-red-600 flex-1">{error}</p>
            ) : <span />}
            <div className="flex gap-3 shrink-0">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting || !form.whatDiscussed}>
                {submitting ? "Saving..." : submitted ? "Saved ✓" : isEdit ? "Update" : "Log Feedback"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function LFField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
