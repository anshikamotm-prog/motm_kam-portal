"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import type { AdminNote } from "@/types/guidance"
import { cn } from "@/lib/utils"

const REACTIONS = [
  { value: "Done", label: "✅ Done", variant: "green" as const },
  { value: "In Progress", label: "🔄 In Progress", variant: "blue" as const },
  { value: "Need Help", label: "🆘 Need Help", variant: "red" as const },
]

export default function GuidanceView() {
  const qc = useQueryClient()
  const [reacting, setReacting] = useState<AdminNote | null>(null)
  const [reactionChoice, setReactionChoice] = useState("")
  const [reactionNote, setReactionNote] = useState("")

  const { data: notes, isLoading } = useQuery<AdminNote[]>({
    queryKey: ["guidance"],
    queryFn: () => fetch("/api/guidance").then((r) => r.json()),
  })

  const react = useMutation({
    mutationFn: ({ id, reaction, note }: { id: number; reaction: string; note: string }) =>
      fetch(`/api/guidance/${id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction, reactionNote: note }),
      }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["guidance"] }); setReacting(null) },
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Admin Guidance</h1>
        <p className="text-sm text-slate-500 mt-1">Notes from management for your clients</p>
      </div>

      {notes?.length === 0 && <div className="text-sm text-slate-400 text-center py-8">No guidance notes found</div>}

      {notes?.map((n) => (
        <div key={n.rowNum} className={cn(
          "bg-white rounded-xl border-l-4 border border-slate-200 p-4 shadow-sm",
          n.reaction === "Done" ? "border-l-green-400" :
          n.reaction === "Need Help" ? "border-l-red-400" :
          n.reaction === "In Progress" ? "border-l-blue-400" : "border-l-slate-300",
        )}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-semibold text-slate-800">{n.company || "General"}</div>
              <div className="text-xs text-slate-400">{formatDate(n.timestamp)} · by {n.postedBy}</div>
            </div>
            <div className="flex items-center gap-2">
              {n.read !== "Yes" && <Badge variant="blue">New</Badge>}
              {n.reaction && <Badge variant={n.reaction === "Done" ? "green" : n.reaction === "Need Help" ? "red" : "blue"}>{n.reaction}</Badge>}
            </div>
          </div>

          <p className="text-sm text-slate-700 mb-3">{n.note}</p>

          {n.reactionNote && (
            <div className="text-xs text-slate-500 italic mb-3">"{n.reactionNote}"</div>
          )}

          <div className="flex gap-2">
            {REACTIONS.map((r) => (
              <Button key={r.value} size="sm" variant={n.reaction === r.value ? "default" : "outline"}
                onClick={() => { setReacting(n); setReactionChoice(r.value); setReactionNote("") }}>
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={!!reacting} onOpenChange={() => setReacting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>React: {reactionChoice}</DialogTitle></DialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">Optional note</Label>
            <Textarea value={reactionNote} onChange={(e) => setReactionNote(e.target.value)} placeholder="Add context..." className="min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReacting(null)}>Cancel</Button>
            <Button onClick={() => reacting && react.mutate({ id: reacting.rowNum, reaction: reactionChoice, note: reactionNote })}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
