"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageSpinner } from "@/components/shared/Spinner"
import type { AppUser } from "@/types/user"
import { useKAMNames } from "@/hooks/useKAMNames"

export default function AdminUsersView() {
  const qc = useQueryClient()
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data: users, isLoading } = useQuery<AppUser[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  })

  const save = useMutation({
    mutationFn: (u: AppUser) => fetch(`/api/users/${u.rowNum}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: u.email, fullName: u.fullName, role: u.role, kamName: u.kamName, active: u.active }),
    }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setEditUser(null) },
  })

  const addNew = useMutation({
    mutationFn: (u: Partial<AppUser>) => fetch("/api/users/new", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(u),
    }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setAddOpen(false) },
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">User Management</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>+ Add User</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Email", "Name", "Role", "KAM Name", "Active", ""].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.rowNum} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2.5 text-slate-700">{u.email}</td>
                <td className="px-3 py-2.5 font-medium text-slate-800">{u.fullName}</td>
                <td className="px-3 py-2.5"><Badge variant={u.role === "Admin" ? "purple" : u.role === "SE" ? "green" : "blue"}>{u.role}</Badge></td>
                <td className="px-3 py-2.5 text-slate-500">{u.kamName || "—"}</td>
                <td className="px-3 py-2.5"><Badge variant={u.active === "Yes" ? "green" : "red"}>{u.active}</Badge></td>
                <td className="px-3 py-2.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditUser(u)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editUser && <UserModal user={editUser} onSave={(u) => save.mutate(u)} onClose={() => setEditUser(null)} />}
      {addOpen && <UserModal onSave={(u) => addNew.mutate(u)} onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function UserModal({ user, onSave, onClose }: { user?: AppUser; onSave: (u: any) => void; onClose: () => void }) {
  const { data: kamNames = [] } = useKAMNames()
  const [form, setForm] = useState({ email: user?.email ?? "", fullName: user?.fullName ?? "", role: user?.role ?? "KAM", kamName: user?.kamName ?? "", active: user?.active ?? "Yes" })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Email *</Label><Input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" /></div>
          <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="KAM">KAM</SelectItem>
                <SelectItem value="SE">SE (Sales Engineer)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.role === "KAM" || form.role === "SE") && (
            <div className="space-y-1">
              <Label className="text-xs">{form.role === "SE" ? "Reports to KAM" : "KAM Name"}</Label>
              <Select value={form.kamName} onValueChange={(v) => set("kamName", v)}>
                <SelectTrigger><SelectValue placeholder="Select KAM" /></SelectTrigger>
                <SelectContent>{kamNames.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label className="text-xs">Active</Label>
            <Select value={form.active} onValueChange={(v) => set("active", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.email} onClick={() => { onSave({ ...(user ?? {}), ...form }); }}>{user ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
