import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Frame } from "../backend.d";
import { useActor } from "./useActor";

export function useListProjects() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateProject() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      name: string;
      width: number;
      height: number;
    }) => {
      if (!actor) throw new Error("No actor");
      await actor.createProject(
        p.id,
        p.name,
        BigInt(p.width),
        BigInt(p.height),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteProject(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useSaveProject() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      name: string;
      width: number;
      height: number;
      frames: Frame[];
    }) => {
      if (!actor) throw new Error("No actor");
      await actor.saveProject(
        p.id,
        p.name,
        BigInt(p.width),
        BigInt(p.height),
        p.frames,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useLoadProject() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.loadProject(id);
    },
  });
}

export function useGetVisitCount() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["visitCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return (actor as any).getVisitCount() as Promise<bigint>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRecordVisit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) return;
      await (actor as any).recordVisit();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitCount"] }),
  });
}
