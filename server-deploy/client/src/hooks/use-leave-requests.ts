import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LeaveRequest } from "@db/schema";

export function useLeaveRequests() {
  const queryClient = useQueryClient();

  const { data: leaveRequests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const createRequest = useMutation({
    mutationFn: async (request: Omit<LeaveRequest, "id" | "userId" | "createdAt" | "status">) => {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
    },
  });

  return {
    leaveRequests,
    isLoading,
    createRequest: createRequest.mutateAsync,
    updateRequest: updateRequest.mutateAsync,
  };
}
