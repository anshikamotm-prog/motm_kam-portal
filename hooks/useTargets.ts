"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Target, AddTargetInput } from "@/types/target"

export function useTargets(period?: string) {
  const qs = period ? `?period=${encodeURIComponent(period)}` : ""
  return useQuery<Target[]>({
    queryKey: ["targets", period],
    queryFn: () => fetch(`/api/targets${qs}`).then((r) => r.json()),
  })
}

export function useAddTarget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AddTargetInput) =>
      fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["targets"] }),
  })
}

export function useUpdateTarget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rowNum, ...data }: { rowNum: number; achieved?: number; type?: string; notes?: string; target?: number }) =>
      fetch(`/api/targets/${rowNum}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["targets"] }),
  })
}

export function useRolloverTargets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetch("/api/targets/rollover", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["targets"] }),
  })
}

export function useBulkSaveTargets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { period: string; rows: AddTargetInput[] }) =>
      fetch("/api/targets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["targets"] }),
  })
}
