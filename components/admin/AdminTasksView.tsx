"use client"
import { useState } from "react"
import { useTasks, useUpdateTask, useAddTask } from "@/hooks/useTasks"
import { PriorityBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import { PRIORITY_OPTIONS } from "@/constants"
import { useKAMNames } from "@/hooks/useKAMNames"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import { useClients } from "@/hooks/useClients"
import { Plus } from "lucide-react"

const TASK_STATUSES = ["Open", "In Progress", "Pending", "Done", "Cancelled"]

export default function AdminTasksView() {
  const [showCompleted, setShowCompleted] = useState(false)
  const { data: kamNames = [] } = useKAMNames()
  const [filterKam, setFilterKam] = useState("All")
  const [filterPriority, setFilterPriority] = useState("All")
  const [addOpen, setAddOpen] = useState(false)

  const params: Record<string, string> = {}
  if (filterKam !== "All") params.kam = filterKam
  if (filterPriority !== "All") params.priority = filterPriority
  if (showCompleted) params.completed = "true"

  const { data: tasks, isLoading } = useTasks(params)
  const updateTask = useUpdateTask()

  const openCount = tasks?.filter((t) => t.status === "Open" || t.status === "Pending").length ?? 0
  const overdueCount = tasks?.filter((t) => t.overdue === "YES").length ?? 0
  const inProgressCount = tasks?.filter((t) => t.status === "In Progress").length ?? 0

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">All Tasks</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Task</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Open" value={openCount} />
        <StatCard label="Overdue" value={overdueCount} danger={overdueCount > 0} />
        <StatCard label="In Progress" value={inProgressCount} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2">
        <Select value={filterKam} onValueChange={setFilterKam}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All KAMs" /></SelectTrigger>
          <SelectContent><SelectItem value="All">All KAMs</SelectItem>{kamNames.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
          <SelectContent><SelectItem value="All">All Priorities</SelectItem>{[...PRIORITY_OPTIONS].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setShowCompleted((v) => !v)}>
          {showCompleted ? "Show Open" : "Show Completed"}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Client", "KAM", "Task", "Priority", "Due", "Status", "Update"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {tasks?.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No tasks found</td></tr>}
            {tasks?.map((t) => (
              <tr key={t.taskId} className={`border-b border-slate-100 hover:bg-slate-50 ${t.overdue === "YES" ? "bg-red-50/30" : ""}`}>
                <td className="px-3 py-2.5">
                  <div className="text-slate-800 text-xs">{t.company || "—"}</div>
                  <div className="text-[10px] text-slate-400">{t.clientId}</div>
                </td>
                <td className="px-3 py-2.5 text-slate-600 text-xs">{t.kam}</td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <div className="font-medium text-slate-800 truncate">{t.title}</div>
                  {t.description && <div className="text-[10px] text-slate-400 truncate">{t.description}</div>}
                </td>
                <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                <td className={`px-3 py-2.5 text-xs whitespace-nowrap ${t.overdue === "YES" ? "text-red-600 font-medium" : "text-slate-500"}`}>
                  {formatDate(t.dueDate)} {t.overdue === "YES" && "(OD)"}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={t.status === "Done" ? "green" : t.status === "In Progress" ? "blue" : "gray"}>{t.status}</Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Select value={t.status} onValueChange={(v) => updateTask.mutate({ id: t.taskId, status: v })}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && <AdminAddTaskModal kamNames={kamNames} onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function AdminAddTaskModal({ kamNames, onClose }: { kamNames: string[]; onClose: () => void }) {
  const addTask = useAddTask()
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({ kam: "", clientId: "", company: "", title: "", description: "", priority: "Medium", dueDate: today, assignedTo: "" })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const { data: clients = [] } = useClients()
  const { data: teamMembers = [] } = useTeamMembers(form.kam)

  const kamClients = form.kam ? clients.filter((c) => c.kam === form.kam) : clients

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">KAM</Label>
            <Select value={form.kam} onValueChange={(v) => { set("kam", v); set("assignedTo", ""); set("clientId", ""); set("company", "") }}>
              <SelectTrigger><SelectValue placeholder="Select KAM" /></SelectTrigger>
              <SelectContent>
                {kamNames.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Assign To</Label>
            <Select value={form.assignedTo} onValueChange={(v) => set("assignedTo", v)} disabled={!form.kam}>
              <SelectTrigger><SelectValue placeholder={form.kam ? "Assign to KAM" : "Select KAM first"} /></SelectTrigger>
              <SelectContent>
                {form.kam && <SelectItem value="">Assign to KAM ({form.kam})</SelectItem>}
                {teamMembers.map((u) => (
                  <SelectItem key={u.fullName} value={u.fullName}>{u.fullName} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Client (optional)</Label>
            <Select value={form.clientId} onValueChange={(v) => { const c = kamClients.find((c) => c.clientId === v); set("clientId", v); set("company", c?.company ?? "") }}>
              <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No client</SelectItem>
                {kamClients.map((c) => <SelectItem key={c.clientId} value={c.clientId}>{c.company}</SelectItem>)}
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
          <Button
            disabled={!form.kam || !form.title || !form.dueDate}
            onClick={() => { addTask.mutate({ ...form, kam: form.kam, assignedTo: form.assignedTo || undefined }); onClose() }}
          >Add Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-2xl font-bold ${danger ? "text-red-600" : "text-[#1e3a5f]"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
