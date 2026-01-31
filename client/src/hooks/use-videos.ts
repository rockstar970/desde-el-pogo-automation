import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useVideos() {
  return useQuery({
    queryKey: [api.videos.list.path],
    queryFn: async () => {
      const res = await fetch(api.videos.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      return api.videos.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Auto-refresh status
  });
}

export function useVideo(id: number) {
  return useQuery({
    queryKey: [api.videos.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.videos.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch video");
      return api.videos.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCreateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.videos.create.input>) => {
      const res = await fetch(api.videos.create.path, {
        method: api.videos.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.videos.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create video generation task");
      }
      return api.videos.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}
