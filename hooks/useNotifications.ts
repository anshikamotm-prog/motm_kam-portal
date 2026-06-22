"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Notification } from "@/types/notification"

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 60_000,
  })
}

export function useAckNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rowNum: number) =>
      fetch(`/api/notifications/${rowNum}/ack`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })
}
