import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Eye, EyeOff, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { LayerState } from "../types";

interface Props {
  layers: LayerState[];
  currentLayerIndex: number;
  onLayerSelect: (i: number) => void;
  onLayerVisibility: (i: number, v: boolean) => void;
  onLayerLock: (i: number, l: boolean) => void;
  onLayerRename: (i: number, name: string) => void;
  onLayerAdd: () => void;
  onLayerDuplicate: (i: number) => void;
  onLayerDelete: (i: number) => void;
}

export default function LayersPanel({
  layers,
  currentLayerIndex,
  onLayerSelect,
  onLayerVisibility,
  onLayerLock,
  onLayerRename,
  onLayerAdd,
  onLayerDuplicate,
  onLayerDelete,
}: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  function startEdit(i: number) {
    setEditingIdx(i);
    setEditName(layers[i].name);
  }

  function commitEdit(i: number) {
    if (editName.trim()) onLayerRename(i, editName.trim());
    setEditingIdx(null);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full bg-sidebar border-l border-border w-48 shrink-0">
        <div className="panel-header flex items-center justify-between">
          <span>Layers</span>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-ocid="layers.add_button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-1.5"
                  title="Add a new blank layer on top"
                  onClick={onLayerAdd}
                >
                  <Plus className="w-3 h-3" />
                  Add Layer
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Add a new blank layer above all others
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  title="Duplicate the selected layer"
                  onClick={() => onLayerDuplicate(currentLayerIndex)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate selected layer</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {layers.map((layer, i) => (
            <div
              key={layer.id}
              data-ocid={`layers.item.${i + 1}`}
              onClick={() => onLayerSelect(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onLayerSelect(i);
              }}
              className={`flex items-center gap-1.5 px-2 py-2 cursor-pointer border-b border-border/50 transition-colors group ${
                i === currentLayerIndex
                  ? "bg-primary/10 border-l-2 border-l-primary"
                  : "hover:bg-accent"
              }`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerVisibility(i, !layer.visible);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    aria-label={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {layer.visible ? "Hide this layer" : "Show this layer"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerLock(i, !layer.locked);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {layer.locked ? (
                      <Lock className="w-3.5 h-3.5 text-primary/60" />
                    ) : (
                      <LockOpen className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {layer.locked
                    ? "Unlock layer (allow drawing)"
                    : "Lock layer (prevent drawing)"}
                </TooltipContent>
              </Tooltip>

              <div className="flex-1 min-w-0">
                {editingIdx === i ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitEdit(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(i);
                      if (e.key === "Escape") setEditingIdx(null);
                    }}
                    className="w-full bg-background border border-primary rounded px-1 text-xs outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="text-xs truncate block leading-snug"
                    title="Double-click to rename"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(i);
                    }}
                  >
                    {layer.name}
                  </span>
                )}
              </div>

              {layers.length > 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-ocid={`layers.delete_button.${i + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerDelete(i);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      aria-label="Delete layer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete this layer</TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
