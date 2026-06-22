"use client"
import { useState } from "react"
import { useTasks, useUpdateTask, useAddTask } from "@/hooks/useTasks"
import { useClients } from "@/hooks/useClients"
import { PriorityBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import { PRIORITY_OPTIONS } from "@/constants"
import { Plus, MessageSquare } from "lucide-react"
import type { Task } from "@/types/task"

const TASK_STATUSES = ["Open", "In Progress", "Pending", "Done", "Cancelled"]

export default function TasksView() {
  const [showCompleted, setShowCompleted] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [responding, setResponding] = useState<{ task: Task; status: string } | null>(null)
  const { data: tasks, isLoading } = useTasks(showCompleted ? { completed: "true" } : {})
  const { data: clients } = useClients()
  const updateTask = useUpdateTask()

  const handleStatusChange = (task: Task, newStatus: string) => {
    setResponding({ task, status: newStatus })
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">My Tasks</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCompleted((v) => !v)}>
            {showCompleted ? "Show Open" : "Show Completed"}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {tasks?.length === 0 && <div className="text-sm text-slate-400 text-center py-8">No tasks found</div>}
        {tasks?.map((t) => (
          <div key={t.taskId} className={`bg-white rounded-xl border p-4 ${t.overdue === "YES" ? "border-red-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                  <Badge variant={t.status === "Done" ? "green" : t.status === "In Progress" ? "blue" : "gray"}>{t.status}</Badge>
                  {t.overdue === "YES" && <Badge variant="red">OVERDUE</Badge>}
                </div>
                {t.company && <div className="text-sm text-slate-500 mt-0.5">{t.company}</div>}
                {t.description && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</div>}
                <div className="text-xs text-slate-400 mt-1">Due: {formatDate(t.dueDate)} · {t.department || "General"}</div>
                {t.notes && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5">
                    <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0 text-slate-400" />
                    <span>{t.notes}</span>
                  </div>
                )}
              </div>
              <Select value={t.status} onValueChange={(v) => handleStatusChange(t, v)}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {addOpen && <AddTaskModal clients={clients ?? []} onClose={() => setAddOpen(false)} />}

      {responding && (
        <RespondModal
          task={responding.task}
          newStatus={responding.status}
          onClose={() => setResponding(null)}
          onConfirm={(note) => {
            updateTask.mutate({ id: responding.task.taskId, status: responding.status, notes: note || undefined })
            setResponding(null)
          }}
        />
      )}
    </div>
  )
}

function RespondModal({ task, newStatus, onClose, onConfirm }: {
  task: Task; newStatus: string; onClose: () => void; onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState(task.notes || "")
  const needsNote = newStatus === "Done" || newStatus === "In Progress"

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Task Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm">
            <div className="font-medium text-slate-800">{task.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Changing status to: <span className={`font-semibold ${newStatus === "Done" ? "text-green-600" : newStatus === "In Progress" ? "text-blue-600" : "text-slate-600"}`}>{newStatus}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{needsNote ? "Response / Update Note" : "Note (optional)"}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={needsNote ? "What did you do? Any updates for admin..." : "Any note..."}
              className="min-h-[80px]"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(note)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddTaskModal({ clients, onClose }: { clients: { clientId: string; company: string }[]; onClose: () => void }) {
  const addTask = useAddTask()
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({ clientId: "", company: "", title: "", description: "", priority: "Medium", dueDate: today })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Client (optional)</Label>
            <Select value={form.clientId} onValueChange={(v) => { const c = clients.find((c) => c.clientId === v); set("clientId", v); set("company", c?.company ?? "") }}>
              <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No client</SelectItem>
                {clients.map((c) => <SelectItem key={c.clientId} value={c.clientId}>{c.company}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="min-h-[60px]" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Due Date *</Label><Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.title || !form.dueDate} onClick={() => { addTask.mutate(form); onClose() }}>Add Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
