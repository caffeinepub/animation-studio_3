import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  Download,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSaveProject } from "../hooks/useQueries";
import type { FrameState, LayerState, ProjectState, Tool } from "../types";
import { compositeFrameLayers } from "../utils/canvasUtils";
import { encodeAnimatedGif } from "../utils/gifEncoder";
import Canvas, { type CanvasHandle } from "./Canvas";
import LayersPanel from "./LayersPanel";
import Timeline from "./Timeline";
import Toolbar from "./Toolbar";

const MAX_HISTORY = 40;

function makeLayer(name = "Layer 1"): LayerState {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    locked: false,
    imageData: "",
  };
}

function makeFrame(): FrameState {
  return { id: crypto.randomUUID(), layers: [makeLayer()], duration: 100 };
}

interface Props {
  project: ProjectState;
  onBack: () => void;
}

export default function Editor({ project, onBack }: Props) {
  const [frames, setFrames] = useState<FrameState[]>(project.frames);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [currentLayerIndex, setCurrentLayerIndex] = useState(0);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackLoop, setPlaybackLoop] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);

  const framesRef = useRef(frames);
  framesRef.current = frames;
  const currentFrameIndexRef = useRef(currentFrameIndex);
  currentFrameIndexRef.current = currentFrameIndex;

  const canvasRef = useRef<CanvasHandle>(null);
  const historyRef = useRef<FrameState[][]>([]);
  const historyPosRef = useRef(-1);

  const saveMutation = useSaveProject();

  const pushHistory = useCallback((f: FrameState[]) => {
    const pos = historyPosRef.current;
    historyRef.current = historyRef.current.slice(0, pos + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(f)) as FrameState[]);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyPosRef.current = historyRef.current.length - 1;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount
  useEffect(() => {
    pushHistory(frames);
  }, []);

  // Playback
  useEffect(() => {
    if (!isPlaying) return;
    const dur = framesRef.current[currentFrameIndex]?.duration ?? 100;
    const timer = setTimeout(() => {
      const next = currentFrameIndex + 1;
      if (next >= framesRef.current.length) {
        if (playbackLoop) setCurrentFrameIndex(0);
        else setIsPlaying(false);
      } else {
        setCurrentFrameIndex(next);
      }
    }, dur);
    return () => clearTimeout(timer);
  }, [isPlaying, currentFrameIndex, playbackLoop]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
          return;
        }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
          return;
        }
        if (e.key === "s") {
          e.preventDefault();
          handleSave();
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case "p":
          setTool("pencil");
          break;
        case "b":
          setTool("brush");
          break;
        case "e":
          setTool("eraser");
          break;
        case "f":
          setTool("fill");
          break;
        case "r":
          setTool("rect");
          break;
        case "o":
          setTool("ellipse");
          break;
        case "l":
          setTool("line");
          break;
        case "i":
          setTool("eyedropper");
          break;
        case " ":
          e.preventDefault();
          setTool("pan");
          break;
        case "arrowleft":
          if (currentFrameIndexRef.current > 0)
            switchFrame(currentFrameIndexRef.current - 1);
          break;
        case "arrowright":
          if (currentFrameIndexRef.current < framesRef.current.length - 1)
            switchFrame(currentFrameIndexRef.current + 1);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function serializeCurrentFrame(currentFrames: FrameState[]): FrameState[] {
    if (!canvasRef.current) return currentFrames;
    const serialized = canvasRef.current.serializeLayers();
    return currentFrames.map((f, i) =>
      i === currentFrameIndexRef.current ? { ...f, layers: serialized } : f,
    );
  }

  function switchFrame(newIdx: number) {
    const updated = serializeCurrentFrame(framesRef.current);
    setFrames(updated);
    setCurrentFrameIndex(newIdx);
    setCurrentLayerIndex(0);
    setLoadVersion((v) => v + 1);
  }

  function handleUndo() {
    const pos = historyPosRef.current;
    if (pos <= 0) return;
    historyPosRef.current = pos - 1;
    const prev = historyRef.current[historyPosRef.current];
    setFrames(prev);
    setLoadVersion((v) => v + 1);
  }

  function handleRedo() {
    const pos = historyPosRef.current;
    if (pos >= historyRef.current.length - 1) return;
    historyPosRef.current = pos + 1;
    const next = historyRef.current[historyPosRef.current];
    setFrames(next);
    setLoadVersion((v) => v + 1);
  }

  function handleLayerDataChange(layerIdx: number, data: string) {
    setFrames((prev) => {
      const updated = prev.map((f, fi) =>
        fi === currentFrameIndexRef.current
          ? {
              ...f,
              layers: f.layers.map((l, li) =>
                li === layerIdx ? { ...l, imageData: data } : l,
              ),
            }
          : f,
      );
      pushHistory(updated);
      return updated;
    });
  }

  function addLayer() {
    setFrames((prev) => {
      const updated = prev.map((f, fi) =>
        fi === currentFrameIndexRef.current
          ? {
              ...f,
              layers: [makeLayer(`Layer ${f.layers.length + 1}`), ...f.layers],
            }
          : f,
      );
      pushHistory(updated);
      return updated;
    });
    setCurrentLayerIndex(0);
  }

  function duplicateLayer(i: number) {
    setFrames((prev) => {
      const frame = prev[currentFrameIndexRef.current];
      const layer = frame.layers[i];
      const copy: LayerState = {
        ...layer,
        id: crypto.randomUUID(),
        name: `${layer.name} copy`,
      };
      const updated = prev.map((f, fi) =>
        fi === currentFrameIndexRef.current
          ? {
              ...f,
              layers: [
                ...f.layers.slice(0, i + 1),
                copy,
                ...f.layers.slice(i + 1),
              ],
            }
          : f,
      );
      pushHistory(updated);
      return updated;
    });
  }

  function deleteLayer(i: number) {
    setFrames((prev) => {
      const frame = prev[currentFrameIndexRef.current];
      if (frame.layers.length <= 1) return prev;
      const updated = prev.map((f, fi) =>
        fi === currentFrameIndexRef.current
          ? { ...f, layers: f.layers.filter((_, li) => li !== i) }
          : f,
      );
      pushHistory(updated);
      setCurrentLayerIndex((idx) =>
        Math.min(idx, updated[currentFrameIndexRef.current].layers.length - 1),
      );
      setLoadVersion((v) => v + 1);
      return updated;
    });
  }

  function updateLayerProp(fi: number, li: number, patch: Partial<LayerState>) {
    setFrames((prev) =>
      prev.map((f, fIdx) =>
        fIdx === fi
          ? {
              ...f,
              layers: f.layers.map((l, lIdx) =>
                lIdx === li ? { ...l, ...patch } : l,
              ),
            }
          : f,
      ),
    );
  }

  function addFrame() {
    const newFrame = makeFrame();
    setFrames((prev) => {
      const updated = [...prev, newFrame];
      pushHistory(updated);
      return updated;
    });
    setTimeout(() => switchFrame(framesRef.current.length), 0);
  }

  function duplicateFrame(i: number) {
    setFrames((prev) => {
      const frame = prev[i];
      const copy: FrameState = {
        id: crypto.randomUUID(),
        duration: frame.duration,
        layers: frame.layers.map((l) => ({ ...l, id: crypto.randomUUID() })),
      };
      const updated = [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
      pushHistory(updated);
      return updated;
    });
  }

  function deleteFrame(i: number) {
    if (framesRef.current.length <= 1) return;
    setFrames((prev) => {
      const updated = prev.filter((_, idx) => idx !== i);
      pushHistory(updated);
      return updated;
    });
    const newIdx = Math.min(i, framesRef.current.length - 2);
    setCurrentFrameIndex(newIdx);
    setLoadVersion((v) => v + 1);
  }

  async function handleSave() {
    const serialized = serializeCurrentFrame(framesRef.current);
    const backendFrames = serialized.map((f) => ({
      layers: f.layers.map((l) => ({
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        imageData: l.imageData,
      })),
    }));
    try {
      await saveMutation.mutateAsync({
        id: project.id,
        name: project.name,
        width: project.width,
        height: project.height,
        frames: backendFrames,
      });
      toast.success("Project saved!");
    } catch {
      toast.error("Save failed");
    }
  }

  async function handleExportPNG() {
    const composite = canvasRef.current?.getComposite();
    if (!composite) return;
    const a = document.createElement("a");
    a.href = composite;
    a.download = `${project.name}-frame${currentFrameIndex + 1}.png`;
    a.click();
    toast.success("PNG exported");
  }

  async function handleExportSpriteSheet() {
    const serialized = serializeCurrentFrame(framesRef.current);
    const composites: string[] = [];
    for (const frame of serialized) {
      const c = await compositeFrameLayers(
        frame.layers,
        project.width,
        project.height,
      );
      composites.push(c);
    }
    const sheet = document.createElement("canvas");
    sheet.width = project.width * composites.length;
    sheet.height = project.height;
    const ctx = sheet.getContext("2d")!;
    await Promise.all(
      composites.map(
        (src, i) =>
          new Promise<void>((res) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, i * project.width, 0);
              res();
            };
            img.src = src;
          }),
      ),
    );
    const a = document.createElement("a");
    a.href = sheet.toDataURL();
    a.download = `${project.name}-spritesheet.png`;
    a.click();
    toast.success("Sprite sheet exported");
  }

  async function handleExportGIF() {
    toast.loading("Generating GIF…", { id: "gif" });
    try {
      const serialized = serializeCurrentFrame(framesRef.current);
      const gifFrames: Array<{ imageData: ImageData; delay: number }> = [];
      for (const frame of serialized) {
        const src = await compositeFrameLayers(
          frame.layers,
          project.width,
          project.height,
        );
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.src = src;
        });
        const tmp = document.createElement("canvas");
        tmp.width = project.width;
        tmp.height = project.height;
        const tmpCtx = tmp.getContext("2d")!;
        tmpCtx.drawImage(img, 0, 0);
        gifFrames.push({
          imageData: tmpCtx.getImageData(0, 0, project.width, project.height),
          delay: frame.duration,
        });
      }
      const blob = encodeAnimatedGif(gifFrames, project.width, project.height);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("GIF exported!", { id: "gif" });
    } catch (err) {
      console.error(err);
      toast.error("GIF export failed", { id: "gif" });
    }
  }

  const currentFrame = frames[currentFrameIndex];
  const prevFrame =
    onionSkin && currentFrameIndex > 0 ? frames[currentFrameIndex - 1] : null;
  const frameDuration = currentFrame?.duration ?? 100;
  const fps = Math.max(1, Math.round(1000 / frameDuration));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-sidebar shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm truncate">{project.name}</span>
          <span className="text-xs text-muted-foreground mono ml-2">
            {project.width}×{project.height}
          </span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            title="Zoom out (make canvas smaller)"
            onClick={() =>
              setZoom((z) => Math.max(0.1, Math.round((z - 0.25) * 100) / 100))
            }
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <button
            type="button"
            className="text-xs mono w-12 text-center text-muted-foreground hover:text-foreground"
            title="Click to reset zoom to 100%"
            onClick={() => {
              setZoom(1);
              setPanOffset({ x: 0, y: 0 });
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            title="Zoom in (make canvas larger)"
            onClick={() =>
              setZoom((z) => Math.min(8, Math.round((z + 0.25) * 100) / 100))
            }
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Undo / Redo with labels */}
        <Button
          data-ocid="topbar.undo_button"
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          title="Undo last action (Ctrl+Z)"
          onClick={handleUndo}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Undo
        </Button>
        <Button
          data-ocid="topbar.redo_button"
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          title="Redo last undone action (Ctrl+Y)"
          onClick={handleRedo}
        >
          <RotateCw className="w-3.5 h-3.5" />
          Redo
        </Button>

        <div className="w-px h-5 bg-border" />

        <Button
          data-ocid="topbar.save_button"
          size="sm"
          variant="outline"
          className="gap-1.5 h-7 text-xs"
          title="Save your project (Ctrl+S)"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Save
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-ocid="topbar.export_button"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              title="Export your animation as an image or GIF"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPNG}>
              PNG (current frame)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportGIF}>
              Animated GIF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSpriteSheet}>
              Sprite Sheet (PNG)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          tool={tool}
          color={color}
          brushSize={brushSize}
          opacity={opacity}
          onToolChange={setTool}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
          onOpacityChange={setOpacity}
        />

        {/* Canvas area */}
        <div
          className="flex-1 overflow-hidden relative"
          style={{ background: "oklch(0.08 0.005 250)" }}
        >
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              x: panOffset.x,
              y: panOffset.y,
              translateX: "-50%",
              translateY: "-50%",
              scale: zoom,
              transformOrigin: "center center",
            }}
          >
            {currentFrame && (
              <Canvas
                ref={canvasRef}
                canvasWidth={project.width}
                canvasHeight={project.height}
                layers={currentFrame.layers}
                prevFrameLayers={prevFrame?.layers ?? null}
                loadVersion={loadVersion}
                currentLayerIndex={currentLayerIndex}
                tool={tool}
                color={color}
                brushSize={brushSize}
                opacity={opacity}
                zoom={zoom}
                panOffset={panOffset}
                onLayerDataChange={handleLayerDataChange}
                onColorPick={setColor}
                onPanChange={setPanOffset}
                onZoomChange={setZoom}
              />
            )}
          </motion.div>
        </div>

        {currentFrame && (
          <LayersPanel
            layers={currentFrame.layers}
            currentLayerIndex={currentLayerIndex}
            onLayerSelect={setCurrentLayerIndex}
            onLayerVisibility={(i, v) =>
              updateLayerProp(currentFrameIndex, i, { visible: v })
            }
            onLayerLock={(i, l) =>
              updateLayerProp(currentFrameIndex, i, { locked: l })
            }
            onLayerRename={(i, name) =>
              updateLayerProp(currentFrameIndex, i, { name })
            }
            onLayerAdd={addLayer}
            onLayerDuplicate={duplicateLayer}
            onLayerDelete={deleteLayer}
          />
        )}
      </div>

      <Timeline
        frames={frames}
        currentFrameIndex={currentFrameIndex}
        isPlaying={isPlaying}
        playbackLoop={playbackLoop}
        onionSkin={onionSkin}
        frameDuration={frameDuration}
        fps={fps}
        onFrameSelect={switchFrame}
        onFrameAdd={addFrame}
        onFrameDuplicate={duplicateFrame}
        onFrameDelete={deleteFrame}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStop={() => {
          setIsPlaying(false);
          switchFrame(0);
        }}
        onLoopToggle={() => setPlaybackLoop((l) => !l)}
        onOnionToggle={() => setOnionSkin((o) => !o)}
        onFrameDurationChange={(ms) =>
          setFrames((prev) =>
            prev.map((f, i) =>
              i === currentFrameIndex ? { ...f, duration: ms } : f,
            ),
          )
        }
      />
    </div>
  );
}
