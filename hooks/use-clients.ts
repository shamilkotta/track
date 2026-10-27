"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClientBoard } from "@/lib/clients/api";

export const clientKeys = { board: ["clients", "board"] as const };

export function useClientBoardQuery() {
  return useQuery({ queryKey: clientKeys.board, queryFn: fetchClientBoard });
}

// Every clients mutation refetches the board afterwards; the server is the source
// of truth for status, versions and counts.
export function useClientMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: clientKeys.board }),
  });
}
