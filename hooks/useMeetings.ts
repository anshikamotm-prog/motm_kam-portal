"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Meeting, ScheduleMeetingInput, CompleteMeetingInput } from "@/types/meeting"

export function useMeetings(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : ""
  return useQuery<Meeting[]>({
    queryKey: ["meetings", params],
    queryFn: () => fetch(`/api/meetings${qs}`).then((r) => r.json()),
  })
}

export function useScheduleMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ScheduleMeetingInput) =>
      fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  })
}

export function useCompleteMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & CompleteMeetingInput) =>
      fetch(`/api/meetings/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  })
}

export function useRescheduleMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newDate, newTime, reason }: { id: string; newDate: string; newTime?: string; reason?: string }) =>
      fetch(`/api/meetings/${id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newDate, newTime, reason }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  })
}
