import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Copy,
  Ghost,
  Pause,
  Play,
  Plus,
  Repeat,
  SkipBack,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { FrameState } from "../types";

interface Props {
  frames: FrameState[];
  currentFrameIndex: number;
  isPlaying: boolean;
  playbackLoop: boolean;
  onionSkin: boolean;
  frameDuration: number;
  fps: number;
  onFrameSelect: (i: number) => void;
  onFrameAdd: () => void;
  onFrameDuplicate: (i: number) => void;
  onFrameDelete: (i: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onLoopToggle: () => void;
  onOnionToggle: () => void;
  onFrameDurationChange: (ms: number) => void;
}

export default function Timeline({
  frames,
  currentFrameIndex,
  isPlaying,
  playbackLoop,
  onionSkin,
  frameDuration,
  fps,
  onFrameSelect,
  onFrameAdd,
  onFrameDuplicate,
  onFrameDelete,
  onPlay,
  onPause,
  onStop,
  onLoopToggle,
  onOnionToggle,
  onFrameDurationChange,
}: Props) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stripRef.current) return;
    const el = stripRef.current.children[currentFrameIndex] as HTMLElement;
    if (el) el.scrollIntoView({ inline: "nearest", behavior: "smooth" });
  }, [currentFrameIndex]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border-t border-border bg-sidebar shrink-0">
        {/* Controls */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border flex-wrap">
          {/* Playback buttons */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7"
                  title="Go to first frame"
                  onClick={onStop}
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Jump to First Frame</TooltipContent>
            </Tooltip>

            {isPlaying ? (
              <Button
                data-ocid="playback.pause_button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-primary px-2"
                title="Pause the animation"
                onClick={onPause}
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </Button>
            ) : (
              <Button
                data-ocid="playback.play_button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-primary px-2"
                title="Play the animation"
                onClick={onPlay}
              >
                <Play className="w-3.5 h-3.5" />
                Play
              </Button>
            )}

            <Button
              data-ocid="playback.stop_button"
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              title="Stop and return to frame 1"
              onClick={onStop}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>
          </div>

          <div className="w-px h-4 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-ocid="playback.loop_toggle"
                variant="ghost"
                size="sm"
                className={`h-7 text-xs gap-1.5 px-2 ${
                  playbackLoop ? "text-primary" : "text-muted-foreground"
                }`}
                title={
                  playbackLoop
                    ? "Loop is ON — click to disable"
                    : "Loop is OFF — click to enable"
                }
                onClick={onLoopToggle}
              >
                <Repeat className="w-3.5 h-3.5" />
                Loop
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {playbackLoop
                ? "Loop is enabled — animation will repeat"
                : "Loop is disabled — animation plays once"}
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1.5">
            <Switch
              id="onion"
              checked={onionSkin}
              onCheckedChange={onOnionToggle}
              className="scale-75 origin-left"
            />
            <Label
              htmlFor="onion"
              className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"
              title="Onion skin shows the previous frame as a ghost behind your current frame — helps you draw smooth motion"
            >
              <Ghost className="w-3 h-3" />
              Onion Skin
            </Label>
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mono">
              {fps} fps
            </span>
            <div className="flex items-center gap-1">
              <label
                htmlFor="frame-duration"
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                Frame Duration (ms):
              </label>
              <input
                id="frame-duration"
                type="number"
                min={1}
                max={5000}
                value={frameDuration}
                onChange={(e) => onFrameDurationChange(Number(e.target.value))}
                title="How long each frame is displayed (in milliseconds). Lower = faster animation. Changes apply to all frames."
                className="w-16 bg-background border border-border rounded px-2 py-0.5 text-xs mono outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-ocid="timeline.add_button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 px-2"
                  title="Add a new blank frame to the animation"
                  onClick={onFrameAdd}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Frame
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Add a new blank frame after the last one
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7"
                  title="Duplicate the current frame"
                  onClick={() => onFrameDuplicate(currentFrameIndex)}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate Current Frame</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive"
                  title="Delete the current frame"
                  onClick={() => onFrameDelete(currentFrameIndex)}
                  disabled={frames.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Current Frame</TooltipContent>
            </Tooltip>
          </div>

          <div className="ml-auto text-xs text-muted-foreground mono">
            {currentFrameIndex + 1} / {frames.length}
          </div>
        </div>

        {/* Frame strip */}
        <div
          ref={stripRef}
          className="flex gap-1 px-2 py-2 overflow-x-auto"
          style={{ height: 72, minHeight: 72 }}
        >
          {frames.map((frame, i) => (
            <button
              type="button"
              key={frame.id}
              data-ocid={`timeline.item.${i + 1}`}
              title={`Go to Frame ${i + 1}`}
              onClick={() => onFrameSelect(i)}
              className={`flex-shrink-0 w-14 rounded border-2 overflow-hidden relative transition-colors ${
                i === currentFrameIndex
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              }`}
              style={{ height: 56 }}
            >
              <div className="w-full h-full checkerboard" />
              <div className="absolute bottom-0 left-0 right-0 text-center bg-black/50 text-[9px] mono py-px">
                {i + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
