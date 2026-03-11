export interface GifFrame {
  imageData: ImageData;
  delay: number;
}

function quantize(data: Uint8ClampedArray): {
  palette: number[];
  indices: Uint8Array;
  transparentIndex: number;
} {
  const colorMap = new Map<number, number>();
  const palette: number[] = [0, 0, 0];
  const indices = new Uint8Array(data.length / 4);
  const transparentIndex = 0;
  colorMap.set(-1, 0);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const pi = i / 4;

    if (a < 64) {
      indices[pi] = 0;
      continue;
    }

    const key = (r << 16) | (g << 8) | b;
    if (colorMap.has(key)) {
      indices[pi] = colorMap.get(key)!;
    } else {
      const colorCount = palette.length / 3;
      if (colorCount < 255) {
        const idx = colorCount;
        colorMap.set(key, idx);
        palette.push(r, g, b);
        indices[pi] = idx;
      } else {
        let best = 0;
        let bestD = Number.POSITIVE_INFINITY;
        for (const [k, ci] of colorMap) {
          if (k === -1) continue;
          const dr = r - ((k >> 16) & 255);
          const dg = g - ((k >> 8) & 255);
          const db = b - (k & 255);
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) {
            bestD = d;
            best = ci;
          }
        }
        colorMap.set(key, best);
        indices[pi] = best;
      }
    }
  }

  return { palette, indices, transparentIndex };
}

function padPalette(palette: number[]): { padded: Uint8Array; bits: number } {
  const count = palette.length / 3;
  let bits = 2;
  while (1 << bits < count) bits++;
  const size = 1 << bits;
  const padded = new Uint8Array(size * 3);
  padded.set(palette);
  return { padded, bits };
}

function lzwEncode(indices: Uint8Array, minCode: number): number[] {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let size = minCode + 1;
  let max = 1 << size;
  let next = eoi + 1;
  const table = new Map<string, number>();

  const reset = () => {
    table.clear();
    for (let i = 0; i < clear; i++) table.set(String.fromCharCode(i), i);
    size = minCode + 1;
    max = 1 << size;
    next = eoi + 1;
  };

  let bitBuf = 0;
  let bitLen = 0;
  const bytes: number[] = [];

  const emit = (code: number) => {
    bitBuf |= code << bitLen;
    bitLen += size;
    while (bitLen >= 8) {
      bytes.push(bitBuf & 255);
      bitBuf >>= 8;
      bitLen -= 8;
    }
  };

  reset();
  emit(clear);

  let buf = "";
  for (let i = 0; i < indices.length; i++) {
    const pixel = String.fromCharCode(indices[i]);
    const cand = buf + pixel;
    if (table.has(cand)) {
      buf = cand;
    } else {
      emit(table.get(buf)!);
      if (next < 4096) {
        table.set(cand, next++);
        if (next > max && size < 12) {
          size++;
          max = 1 << size;
        }
      } else {
        emit(clear);
        reset();
      }
      buf = pixel;
    }
  }
  if (buf) emit(table.get(buf)!);
  emit(eoi);
  if (bitLen > 0) bytes.push(bitBuf & 255);

  const result: number[] = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    result.push(chunk.length, ...chunk);
  }
  result.push(0);
  return result;
}

export function encodeAnimatedGif(
  frames: GifFrame[],
  width: number,
  height: number,
): Blob {
  const out: number[] = [];
  const u16 = (n: number) => out.push(n & 255, (n >> 8) & 255);
  const byte = (...a: number[]) => out.push(...a);
  const str = (s: string) => {
    for (const c of s) out.push(c.charCodeAt(0));
  };

  const firstQ = quantize(frames[0].imageData.data);
  const { padded: gct, bits: gctBits } = padPalette(firstQ.palette);

  str("GIF89a");
  u16(width);
  u16(height);
  byte(0x80 | (gctBits - 1), 0, 0);
  out.push(...gct);

  byte(0x21, 0xff, 11);
  str("NETSCAPE2.0");
  byte(3, 1);
  u16(0);
  byte(0);

  for (const frame of frames) {
    const { palette, indices } = quantize(frame.imageData.data);
    const { padded: lct, bits: lctBits } = padPalette(palette);
    const minCode = Math.max(2, lctBits);
    const delay = Math.max(2, Math.round(frame.delay / 10));

    byte(0x21, 0xf9, 4, 0x01);
    u16(delay);
    byte(0, 0);

    byte(0x2c);
    u16(0);
    u16(0);
    u16(width);
    u16(height);
    byte(0x80 | (lctBits - 1));
    out.push(...lct);
    byte(minCode);
    out.push(...lzwEncode(indices, minCode));
  }

  byte(0x3b);
  return new Blob([new Uint8Array(out)], { type: "image/gif" });
}
