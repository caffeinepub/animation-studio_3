export function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA: number,
): void {
  const canvas = ctx.canvas;
  const W = canvas.width;
  const H = canvas.height;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || ix >= W || iy < 0 || iy >= H) return;

  const idx0 = (iy * W + ix) * 4;
  const tR = data[idx0];
  const tG = data[idx0 + 1];
  const tB = data[idx0 + 2];
  const tA = data[idx0 + 3];

  if (tR === fillR && tG === fillG && tB === fillB && tA === fillA) return;

  const stack: number[] = [ix + iy * W];
  const visited = new Uint8Array(W * H);

  while (stack.length > 0) {
    const pos = stack.pop()!;
    if (visited[pos]) continue;
    visited[pos] = 1;

    const i = pos * 4;
    if (
      data[i] !== tR ||
      data[i + 1] !== tG ||
      data[i + 2] !== tB ||
      data[i + 3] !== tA
    )
      continue;

    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = fillA;

    const cx = pos % W;
    const cy = Math.floor(pos / W);
    if (cx > 0) stack.push(pos - 1);
    if (cx < W - 1) stack.push(pos + 1);
    if (cy > 0) stack.push(pos - W);
    if (cy < H - 1) stack.push(pos + W);
  }

  ctx.putImageData(imageData, 0, 0);
}

export function hexToRgba(
  hex: string,
  opacity = 1,
): [number, number, number, number] {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return [r, g, b, Math.round(opacity * 255)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function compositeFrameLayers(
  layers: { imageData: string; visible: boolean }[],
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    const visible = [...layers]
      .reverse()
      .filter((l) => l.visible && l.imageData);
    if (visible.length === 0) {
      resolve(canvas.toDataURL());
      return;
    }

    let loaded = 0;
    for (const layer of visible) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        loaded++;
        if (loaded === visible.length) resolve(canvas.toDataURL());
      };
      img.onerror = () => {
        loaded++;
        if (loaded === visible.length) resolve(canvas.toDataURL());
      };
      img.src = layer.imageData;
    }
  });
}
