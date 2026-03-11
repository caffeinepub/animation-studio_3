import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Brush,
  Circle,
  Eraser,
  Hand,
  Minus,
  PaintBucket,
  Pencil,
  Pipette,
  Square,
} from "lucide-react";
import { useRef } from "react";
import type { Tool } from "../types";

interface ToolDef {
  id: Tool;
  icon: React.ReactNode;
  label: string;
  shortName: string;
  ocid: string;
}

const TOOLS: ToolDef[] = [
  {
    id: "pencil",
    icon: <Pencil className="w-4 h-4" />,
    label: "Pencil — draw crisp pixel lines (P)",
    shortName: "Pencil",
    ocid: "toolbar.pencil_button",
  },
  {
    id: "brush",
    icon: <Brush className="w-4 h-4" />,
    label: "Brush — soft, smooth strokes (B)",
    shortName: "Brush",
    ocid: "toolbar.brush_button",
  },
  {
    id: "eraser",
    icon: <Eraser className="w-4 h-4" />,
    label: "Eraser — remove pixels (E)",
    shortName: "Eraser",
    ocid: "toolbar.eraser_button",
  },
  {
    id: "fill",
    icon: <PaintBucket className="w-4 h-4" />,
    label: "Fill — flood fill an area with color (F)",
    shortName: "Fill",
    ocid: "toolbar.fill_button",
  },
  {
    id: "rect",
    icon: <Square className="w-4 h-4" />,
    label: "Rectangle — draw a rectangle (R)",
    shortName: "Rect",
    ocid: "toolbar.rect_button",
  },
  {
    id: "ellipse",
    icon: <Circle className="w-4 h-4" />,
    label: "Ellipse — draw a circle or oval (O)",
    shortName: "Ellipse",
    ocid: "toolbar.ellipse_button",
  },
  {
    id: "line",
    icon: <Minus className="w-4 h-4" />,
    label: "Line — draw a straight line (L)",
    shortName: "Line",
    ocid: "toolbar.line_button",
  },
  {
    id: "eyedropper",
    icon: <Pipette className="w-4 h-4" />,
    label: "Eyedropper — pick a color from canvas (I)",
    shortName: "Pick",
    ocid: "toolbar.eyedropper_button",
  },
  {
    id: "pan",
    icon: <Hand className="w-4 h-4" />,
    label: "Pan — scroll / move the canvas (Space)",
    shortName: "Pan",
    ocid: "toolbar.pan_button",
  },
];

interface Props {
  tool: Tool;
  color: string;
  brushSize: number;
  opacity: number;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onBrushSizeChange: (s: number) => void;
  onOpacityChange: (o: number) => void;
}

export default function Toolbar({
  tool,
  color,
  brushSize,
  opacity,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onOpacityChange,
}: Props) {
  const colorRef = useRef<HTMLInputElement>(null);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col items-center gap-1 py-2 px-1.5 bg-sidebar border-r border-border w-20 overflow-y-auto shrink-0">
        {TOOLS.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-ocid={t.ocid}
                onClick={() => onToolChange(t.id)}
                className={`tool-btn flex flex-col items-center gap-0.5 w-full py-1.5 px-1 rounded transition-colors ${
                  tool === t.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {t.icon}
                <span className="text-[8px] leading-none select-none">
                  {t.shortName}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {t.label}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-full h-px bg-border my-1" />

        {/* Color swatch */}
        <div className="flex flex-col items-center gap-0.5 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-ocid="toolbar.color_button"
                onClick={() => colorRef.current?.click()}
                className="w-10 h-10 rounded border-2 border-border hover:border-primary transition-colors"
                style={{ background: color }}
                aria-label="Pick color"
              />
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Click to change your drawing color
            </TooltipContent>
          </Tooltip>
          <span className="text-[8px] text-muted-foreground leading-none">
            Color
          </span>
        </div>
        <input
          ref={colorRef}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="sr-only"
        />

        <div className="w-full h-px bg-border my-1" />

        {/* Brush size */}
        <div className="w-full flex flex-col items-center gap-1">
          <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wide">
            Size
          </span>
          <span className="text-[9px] text-muted-foreground mono">
            {brushSize}px
          </span>
          <input
            data-ocid="toolbar.size_input"
            type="range"
            min={1}
            max={64}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            title={`Brush size: ${brushSize}px`}
            className="cursor-pointer"
            style={{
              writingMode: "vertical-lr" as React.CSSProperties["writingMode"],
              direction: "rtl",
              height: 56,
              width: 24,
              accentColor: "oklch(0.7 0.2 195)",
            }}
          />
        </div>

        <div className="w-full h-px bg-border my-1" />

        {/* Opacity */}
        <div className="w-full flex flex-col items-center gap-1">
          <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wide">
            Opacity
          </span>
          <span className="text-[9px] text-muted-foreground mono">
            {Math.round(opacity * 100)}%
          </span>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[opacity]}
            onValueChange={([v]) => onOpacityChange(v)}
            orientation="vertical"
            className="h-14"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
