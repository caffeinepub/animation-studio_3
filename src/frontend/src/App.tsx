import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Dashboard from "./components/Dashboard";
import Editor from "./components/Editor";
import { useRecordVisit } from "./hooks/useQueries";
import type { ProjectState } from "./types";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
      <Toaster />
    </QueryClientProvider>
  );
}

function AppInner() {
  const [view, setView] = useState<"dashboard" | "editor">("dashboard");
  const [project, setProject] = useState<ProjectState | null>(null);
  const recordVisit = useRecordVisit();
  const recordVisitRef = useRef(recordVisit.mutate);
  recordVisitRef.current = recordVisit.mutate;

  useEffect(() => {
    recordVisitRef.current();
  }, []);

  function openProject(p: ProjectState) {
    setProject(p);
    setView("editor");
  }

  function backToDashboard() {
    setView("dashboard");
    setProject(null);
  }

  if (view === "editor" && project) {
    return <Editor project={project} onBack={backToDashboard} />;
  }

  return <Dashboard onOpenProject={openProject} />;
}
