import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { LayerState, Tool } from "../types";
import { floodFill, hexToRgba, rgbToHex } from "../utils/canvasUtils";

export interface CanvasHandle {
  serializeLayers: () => LayerState[];
  getComposite: () => string;
}

interface Props {
  canvasWidth: number;
  canvasHeight: number;
  layers: LayerState[];
  prevFrameLayers: LayerState[] | null;
  loadVersion: number;
  currentLayerIndex: number;
  tool: Tool;
  color: string;
  brushSize: number;
  opacity: number;
  zoom: number;
  panOffset: { x: number; y: number };
  onLayerDataChange: (layerIdx: number, data: string) => void;
  onColorPick: (color: string) => void;
  onPanChange: (offset: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

const Canvas = forwardRef<CanvasHandle, Props>((props, ref) => {
  const {
    canvasWidth,
    canvasHeight,
    layers,
    prevFrameLayers,
    loadVersion,
    currentLayerIndex,
    tool,
    color,
    brushSize,
    opacity,
    zoom,
    panOffset,
    onLayerDataChange,
    onColorPick,
    onPanChange,
    onZoomChange,
  } = props;

  const displayRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const layerMapRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const drawRef = useRef({
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
  });

  // Keep mutable refs for handler closures
  const layersRef = useRef(layers);
  const currentLayerRef = useRef(currentLayerIndex);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const opacityRef = useRef(opacity);
  const panRef = useRef(panOffset);
  const zoomRef = useRef(zoom);
  const onLayerDataChangeRef = useRef(onLayerDataChange);
  const onColorPickRef = useRef(onColorPick);
  const onPanChangeRef = useRef(onPanChange);
  const onZoomChangeRef = useRef(onZoomChange);

  layersRef.current = layers;
  currentLayerRef.current = currentLayerIndex;
  toolRef.current = tool;
  colorRef.current = color;
  brushSizeRef.current = brushSize;
  opacityRef.current = opacity;
  panRef.current = panOffset;
  zoomRef.current = zoom;
  onLayerDataChangeRef.current = onLayerDataChange;
  onColorPickRef.current = onColorPick;
  onPanChangeRef.current = onPanChange;
  onZoomChangeRef.current = onZoomChange;

  // Reload layer canvases when loadVersion changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reloads only on loadVersion
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const currentLayers = layersRef.current;
      const promises = currentLayers.map(
        (layer) =>
          new Promise<void>((resolve) => {
            let canvas = layerMapRef.current.get(layer.id);
            if (!canvas) {
              canvas = document.createElement("canvas");
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;
              layerMapRef.current.set(layer.id, canvas);
            }
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            if (!layer.imageData) {
              resolve();
              return;
            }
            const img = new Image();
            img.onload = () => {
              if (!cancelled) ctx.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = layer.imageData;
          }),
      );
      await Promise.all(promises);
      if (!cancelled) composite();
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [loadVersion, canvasWidth, canvasHeight]);

  // Handle new layers being added
  // biome-ignore lint/correctness/useExhaustiveDependencies: dep array uses derived strings
  useEffect(() => {
    for (const layer of layers) {
      if (!layerMapRef.current.has(layer.id)) {
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        layerMapRef.current.set(layer.id, canvas);
        // Load imageData if present
        if (layer.imageData) {
          const img = new Image();
          img.onload = () => {
            canvas.getContext("2d")?.drawImage(img, 0, 0);
            composite();
          };
          img.src = layer.imageData;
        }
      }
    }
    composite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    layers
      .map((l) => l.id)
      .join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    layers
      .map((l) => String(l.visible))
      .join(","),
  ]);

  function composite() {
    const display = displayRef.current;
    if (!display) return;
    const ctx = display.getContext("2d")!;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Onion skin (previous frame)
    const prevLayers = prevFrameLayers;
    if (prevLayers && prevLayers.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      for (const layer of [...prevLayers].reverse()) {
        if (!layer.visible || !layer.imageData) continue;
        const img = new Image();
        img.src = layer.imageData;
        if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, 0, 0);
      }
      ctx.restore();
    }

    // Current layers bottom to top
    for (const layer of [...layersRef.current].reverse()) {
      if (!layer.visible) continue;
      const lc = layerMapRef.current.get(layer.id);
      if (lc) ctx.drawImage(lc, 0, 0);
    }
  }

  function getActiveCanvas(): HTMLCanvasElement | null {
    const layer = layersRef.current[currentLayerRef.current];
    if (!layer || layer.locked) return null;
    return layerMapRef.current.get(layer.id) ?? null;
  }

  function getPoint(e: React.PointerEvent): { x: number; y: number } {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const rect = overlay.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoomRef.current,
      y: (e.clientY - rect.top) / zoomRef.current,
    };
  }

  function stroke(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    size: number,
    col: string,
    opa: number,
    erase: boolean,
  ) {
    ctx.save();
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.globalAlpha = opa;
    ctx.strokeStyle = erase ? "rgba(0,0,0,1)" : col;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawShapePreview(x: number, y: number) {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d")!;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const { startX, startY } = drawRef.current;
    ctx.save();
    ctx.strokeStyle = colorRef.current;
    ctx.globalAlpha = opacityRef.current;
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = "round";
    const t = toolRef.current;
    if (t === "rect") {
      ctx.strokeRect(startX, startY, x - startX, y - startY);
    } else if (t === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        (startX + x) / 2,
        (startY + y) / 2,
        Math.abs(x - startX) / 2,
        Math.abs(y - startY) / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (t === "line") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function commitShape(x: number, y: number) {
    const lc = getActiveCanvas();
    if (!lc) return;
    const ctx = lc.getContext("2d")!;
    ctx.save();
    ctx.strokeStyle = colorRef.current;
    ctx.globalAlpha = opacityRef.current;
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = "round";
    const { startX, startY } = drawRef.current;
    const t = toolRef.current;
    if (t === "rect") {
      ctx.strokeRect(startX, startY, x - startX, y - startY);
    } else if (t === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        (startX + x) / 2,
        (startY + y) / 2,
        Math.abs(x - startX) / 2,
        Math.abs(y - startY) / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (t === "line") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
    const oc = overlayRef.current?.getContext("2d");
    if (oc) oc.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getPoint(e);
    drawRef.current.isDrawing = true;
    drawRef.current.lastX = pt.x;
    drawRef.current.lastY = pt.y;
    drawRef.current.startX = pt.x;
    drawRef.current.startY = pt.y;

    const t = toolRef.current;

    if (t === "fill") {
      const lc = getActiveCanvas();
      if (!lc) return;
      const ctx = lc.getContext("2d")!;
      const [r, g, b, a] = hexToRgba(colorRef.current, opacityRef.current);
      floodFill(ctx, pt.x, pt.y, r, g, b, a);
      composite();
      onLayerDataChangeRef.current(currentLayerRef.current, lc.toDataURL());
      drawRef.current.isDrawing = false;
      return;
    }

    if (t === "eyedropper") {
      const display = displayRef.current;
      if (!display) return;
      const ctx = display.getContext("2d")!;
      const px = Math.max(0, Math.min(canvasWidth - 1, Math.floor(pt.x)));
      const py = Math.max(0, Math.min(canvasHeight - 1, Math.floor(pt.y)));
      const d = ctx.getImageData(px, py, 1, 1).data;
      onColorPickRef.current(rgbToHex(d[0], d[1], d[2]));
      drawRef.current.isDrawing = false;
      return;
    }

    if (t === "pencil" || t === "brush" || t === "eraser") {
      const lc = getActiveCanvas();
      if (!lc) return;
      const ctx = lc.getContext("2d")!;
      const size =
        t === "brush" ? brushSizeRef.current * 2 : brushSizeRef.current;
      stroke(
        ctx,
        pt.x,
        pt.y,
        pt.x + 0.1,
        pt.y + 0.1,
        size,
        colorRef.current,
        opacityRef.current,
        t === "eraser",
      );
      composite();
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawRef.current.isDrawing) return;
    const pt = getPoint(e);
    const t = toolRef.current;

    if (t === "pencil" || t === "brush" || t === "eraser") {
      const lc = getActiveCanvas();
      if (!lc) return;
      const ctx = lc.getContext("2d")!;
      const size =
        t === "brush" ? brushSizeRef.current * 2 : brushSizeRef.current;
      stroke(
        ctx,
        drawRef.current.lastX,
        drawRef.current.lastY,
        pt.x,
        pt.y,
        size,
        colorRef.current,
        opacityRef.current,
        t === "eraser",
      );
      composite();
    } else if (t === "rect" || t === "ellipse" || t === "line") {
      drawShapePreview(pt.x, pt.y);
    } else if (t === "pan") {
      onPanChangeRef.current({
        x: panRef.current.x + e.movementX,
        y: panRef.current.y + e.movementY,
      });
    }

    drawRef.current.lastX = pt.x;
    drawRef.current.lastY = pt.y;
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!drawRef.current.isDrawing) return;
    drawRef.current.isDrawing = false;
    const pt = getPoint(e);
    const t = toolRef.current;

    if (t === "rect" || t === "ellipse" || t === "line") {
      commitShape(pt.x, pt.y);
      composite();
    }

    if (t !== "pan" && t !== "eyedropper" && t !== "fill") {
      const lc = getActiveCanvas();
      if (lc)
        onLayerDataChangeRef.current(currentLayerRef.current, lc.toDataURL());
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(8, zoomRef.current + delta));
    onZoomChangeRef.current(newZoom);
  }

  useImperativeHandle(ref, () => ({
    serializeLayers() {
      return layersRef.current.map((layer) => ({
        ...layer,
        imageData:
          layerMapRef.current.get(layer.id)?.toDataURL() ?? layer.imageData,
      }));
    },
    getComposite() {
      return displayRef.current?.toDataURL() ?? "";
    },
  }));

  const getCursor = () => {
    if (tool === "pan") return "grab";
    if (tool === "eyedropper") return "crosshair";
    if (tool === "fill") return "cell";
    return "crosshair";
  };

  return (
    <div
      className="relative"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      <div
        className="absolute inset-0 checkerboard"
        style={{ width: canvasWidth, height: canvasHeight }}
      />
      <canvas
        ref={displayRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0"
        style={{ imageRendering: zoom > 2 ? "pixelated" : "auto" }}
      />
      <canvas
        ref={overlayRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 pointer-events-none"
        style={{ imageRendering: zoom > 2 ? "pixelated" : "auto" }}
      />
      <div
        data-ocid="canvas_target"
        className="absolute inset-0"
        style={{ cursor: getCursor(), touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
});

Canvas.displayName = "Canvas";
export default Canvas;
