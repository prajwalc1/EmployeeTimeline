import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TimeEntry } from "@db/schema";

export function useTimeEntries() {
  const queryClient = useQueryClient();

  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const createEntry = useMutation({
    mutationFn: async (entry: Omit<TimeEntry, "id" | "userId" | "createdAt">) => {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
  });

  return {
    timeEntries,
    isLoading,
    createEntry: createEntry.mutateAsync,
  };
}
