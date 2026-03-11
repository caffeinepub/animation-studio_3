import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronRight,
  Clock,
  Eye,
  Film,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateProject,
  useDeleteProject,
  useGetVisitCount,
  useListProjects,
  useLoadProject,
} from "../hooks/useQueries";
import type { FrameState, LayerState, ProjectState } from "../types";

const PRESETS = [
  {
    label: "480×270",
    w: 480,
    h: 270,
    hint: "Great for beginners!",
    color: "text-green-400",
  },
  {
    label: "800×450",
    w: 800,
    h: 450,
    hint: "Medium detail",
    color: "text-yellow-400",
  },
  {
    label: "1280×720",
    w: 1280,
    h: 720,
    hint: "HD quality",
    color: "text-blue-400",
  },
];

const STEPS = [
  {
    num: 1,
    title: "Create a Project",
    desc: 'Click "New Project", pick a canvas size. Start small — 480×270 is perfect!',
    icon: "📁",
  },
  {
    num: 2,
    title: "Draw on the Canvas",
    desc: "Pick the Pencil or Brush tool from the left panel, then click and drag to draw.",
    icon: "✏️",
  },
  {
    num: 3,
    title: "Add Frames & Animate",
    desc: 'Use the timeline at the bottom to add frames, then press "Play" to preview your animation.',
    icon: "▶️",
  },
];

function makeDefaultLayer(): LayerState {
  return {
    id: crypto.randomUUID(),
    name: "Layer 1",
    visible: true,
    locked: false,
    imageData: "",
  };
}

function makeDefaultFrame(): FrameState {
  return {
    id: crypto.randomUUID(),
    layers: [makeDefaultLayer()],
    duration: 100,
  };
}

interface Props {
  onOpenProject: (p: ProjectState) => void;
}

export default function Dashboard({ onOpenProject }: Props) {
  const { data: projects = [], isLoading } = useListProjects();
  const { data: visitCount } = useGetVisitCount();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();
  const loadMutation = useLoadProject();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newW, setNewW] = useState(480);
  const [newH, setNewH] = useState(270);
  const [customSize, setCustomSize] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Project name required");
      return;
    }
    const id = crypto.randomUUID();
    try {
      await createMutation.mutateAsync({
        id,
        name: newName.trim(),
        width: newW,
        height: newH,
      });
      const p: ProjectState = {
        id,
        name: newName.trim(),
        width: newW,
        height: newH,
        frames: [makeDefaultFrame()],
      };
      setNewOpen(false);
      setNewName("");
      onOpenProject(p);
    } catch {
      toast.error("Failed to create project");
    }
  }

  async function handleOpen(id: string) {
    try {
      const raw = await loadMutation.mutateAsync(id);
      let frames: FrameState[] = raw.frames.map((f) => ({
        id: crypto.randomUUID(),
        duration: 100,
        layers: f.layers.map((l) => ({
          id: crypto.randomUUID(),
          name: l.name,
          visible: l.visible,
          locked: l.locked,
          imageData: l.imageData,
        })),
      }));
      if (frames.length === 0) frames = [makeDefaultFrame()];
      onOpenProject({
        id: raw.id,
        name: raw.name,
        width: Number(raw.width),
        height: Number(raw.height),
        frames,
      });
    } catch {
      toast.error("Failed to load project");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteId(null);
    }
  }

  const showBanner = !bannerDismissed;
  const formattedVisits =
    visitCount != null ? Number(visitCount).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              Animation Studio
            </h1>
            <p className="text-xs text-muted-foreground mono">
              Frame-by-frame creator
            </p>
          </div>
        </div>
        <Button
          data-ocid="projects.new_button"
          size="sm"
          onClick={() => setNewOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Quick Start Banner */}
        <AnimatePresence>
          {showBanner && (
            <motion.div
              data-ocid="quickstart.panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-primary">Quick tip: </span>
                <span className="text-muted-foreground">
                  New to animation? Start with a small canvas{" "}
                  <span className="font-mono text-foreground">480×270</span> and
                  just draw something on Frame 1. You can always add more frames
                  later!
                </span>
              </div>
              <button
                type="button"
                data-ocid="quickstart.close_button"
                onClick={() => setBannerDismissed(true)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Dismiss tip"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground py-12">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* 3-step guide */}
            <div className="border border-dashed border-border rounded-xl p-8">
              <div className="text-center mb-8">
                <Film className="w-10 h-10 text-primary/60 mx-auto mb-3" />
                <h3 className="text-lg font-bold">
                  Welcome to Animation Studio!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have any projects yet. Here's how to get started:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                {STEPS.map((step, idx) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col items-center text-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                      {step.num}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center">
                <Button
                  data-ocid="empty.new_project_button"
                  onClick={() => setNewOpen(true)}
                  className="gap-2"
                  size="lg"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Project
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {projects.map((proj, idx) => (
                <motion.div
                  key={proj.id}
                  data-ocid={`projects.item.${idx + 1}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group relative border border-border rounded bg-card hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleOpen(proj.id)}
                >
                  <div className="aspect-video checkerboard rounded-t overflow-hidden flex items-center justify-center">
                    <Film className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">
                      {proj.name}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground mono">
                      <span>
                        {Number(proj.width)}×{Number(proj.height)}
                      </span>
                      <span>·</span>
                      <span>{proj.frames.length} fr</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(
                          Number(proj.updatedAt) / 1_000_000,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded bg-background/80 hover:bg-destructive text-muted-foreground hover:text-destructive-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(proj.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded bg-background/80 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen(proj.id);
                      }}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
          {formattedVisits != null && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>{formattedVisits} visits</span>
            </p>
          )}
        </div>
      </footer>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent data-ocid="new_project.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-2 block">Project Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Animation"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Canvas Size</Label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => {
                      setNewW(p.w);
                      setNewH(p.h);
                      setCustomSize(false);
                    }}
                    className={`text-xs py-2 px-2 rounded border transition-colors ${
                      !customSize && newW === p.w && newH === p.h
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="font-mono font-semibold block">
                      {p.label}
                    </span>
                    <span
                      className={`text-[10px] block mt-0.5 ${!customSize && newW === p.w && newH === p.h ? "text-primary/80" : p.color}`}
                    >
                      {p.hint}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCustomSize(true)}
                className={`w-full text-xs py-2 rounded border transition-colors ${
                  customSize
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                Custom Size
              </button>
              {customSize && (
                <div className="flex gap-2 mt-3">
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Width (px)</Label>
                    <Input
                      type="number"
                      value={newW}
                      onChange={(e) => setNewW(Number(e.target.value))}
                      className="mono"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Height (px)</Label>
                    <Input
                      type="number"
                      value={newH}
                      onChange={(e) => setNewH(Number(e.target.value))}
                      className="mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="new_project.submit_button"
              size="sm"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Create &amp; Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
