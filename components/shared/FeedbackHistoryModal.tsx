"use client"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HealthBadge, FeedbackBadge } from "@/components/shared/StatusBadge"
import { formatDate } from "@/lib/utils"

interface Props {
  clientId: string
  company: string
  onClose: () => void
}

export function FeedbackHistoryModal({ clientId, company, onClose }: Props) {
  const { data: feedbacks = [], isLoading } = useQuery<any[]>({
    queryKey: ["feedback", clientId],
    queryFn: () => fetch(`/api/feedback?clientId=${clientId}`).then((r) => r.json()),
  })
  const latest = Array.isArray(feedbacks) ? feedbacks.slice(0, 5) : []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Last 5 Feedbacks — {company}</DialogTitle>
        </DialogHeader>
        {isLoading && <div className="text-sm text-slate-400 py-4 text-center">Loading...</div>}
        {!isLoading && latest.length === 0 && (
          <div className="text-sm text-slate-400 py-4 text-center">No feedback recorded yet.</div>
        )}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {latest.map((f, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700">{formatDate(f.date)}</span>
                <div className="flex gap-1.5">
                  {f.healthUpdate && <HealthBadge health={f.healthUpdate} />}
                  {f.feedbackStatus && <FeedbackBadge status={f.feedbackStatus} />}
                </div>
              </div>
              {f.interactionType && <div className="text-[10px] text-slate-400">Type: {f.interactionType}</div>}
              {f.whatDiscussed && (
                <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                  <span className="font-medium text-slate-500">Discussed: </span>{f.whatDiscussed}
                </div>
              )}
              {f.clientConcern && (
                <div className="text-xs text-slate-600 bg-yellow-50 rounded px-2 py-1">
                  <span className="font-medium text-yellow-700">Client Concern: </span>{f.clientConcern}
                </div>
              )}
              {f.actionRequired && (
                <div className="text-xs text-slate-600 bg-blue-50 rounded px-2 py-1">
                  <span className="font-medium text-blue-600">Action Required: </span>{f.actionRequired}
                  {f.actionOwner && <span className="text-slate-400"> · Owner: {f.actionOwner}</span>}
                  {f.actionDueDate && <span className="text-slate-400"> · Due: {formatDate(f.actionDueDate)}</span>}
                </div>
              )}
              {f.resolutionStatus && (
                <div className="text-xs text-slate-600 bg-green-50 rounded px-2 py-1">
                  <span className="font-medium text-green-700">Resolution: </span>{f.resolutionStatus}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
