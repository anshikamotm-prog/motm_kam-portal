"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Client } from "@/types/client"

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => fetch("/api/clients").then((r) => r.json()),
  })
}

export function useArchivedClients() {
  return useQuery<Client[]>({
    queryKey: ["clients", "archived"],
    queryFn: () => fetch("/api/clients/archived").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Client>) =>
      fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  })
}
