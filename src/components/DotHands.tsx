"use client";

import { useEffect, useRef } from "react";

const SHEET =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_025250_100df7b8-31fd-4614-aa4a-c1b7d5b6b273.png&w=1600&q=85";

// [x, y, w, h] as fractions of the sheet
const SRC = {
  LA: [0, 0.06, 0.47, 0.4],
  RA: [0.53, 0.06, 0.47, 0.4],
  LB: [0, 0.55, 0.47, 0.4],
  RB: [0.53, 0.55, 0.47, 0.4],
} as const;
type Key = keyof typeof SRC;

const LOOP = 20;
const LEVELS = [0, 0.26, 0.52, 0.78, 1];
const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mixAt = (t: number, on: number, off: number, dur: number) =>
  smooth(on, on + dur, t) * (1 - smooth(off, off + dur, t));

export default function DotHands() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1, step = 7, rowStep = 14, cols = 0, rows = 0, R = 3;
    let seeds = new Float32Array(0);
    let raf = 0;
    let alive = true;
    const tiles: Partial<Record<Key, HTMLCanvasElement>> = {};
    let ready = false;

    const fA = document.createElement("canvas");
    const fB = document.createElement("canvas");
    const cA = fA.getContext("2d", { willReadFrequently: true })!;
    const cB = fB.getContext("2d", { willReadFrequently: true })!;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      step = Math.max(5, W / 205);
      rowStep = step * 2.05;
      cols = Math.ceil(W / step);
      rows = Math.ceil(H / rowStep);
      R = step * 0.46;
      fA.width = fB.width = cols;
      fA.height = fB.height = rows;
      seeds = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++)
          seeds[j * cols + i] = 0.55 * hash(i, j) + 0.45 * hash(j * 3.1, 7.7);
    };

    const drawHand = (c: CanvasRenderingContext2D, key: Key, left: boolean, t: number) => {
      const tile = tiles[key];
      if (!tile) return;
      const portrait = H > W;
      const a = (2 * Math.PI * t) / LOOP;
      const ph = left ? 0 : Math.PI;
      const hw = W * (portrait ? 0.66 : 0.53);
      const hh = hw * ((0.4 * 1520) / (0.47 * 2688));
      const cy = H * (portrait ? 0.66 : 0.54);
      const reach = (0.035 * Math.sin(a + ph) + 0.012 * Math.sin(2 * a + 1.3 + ph)) * W;
      const scale = 1 + 0.07 * Math.sin(a + 0.9 + ph);
      const rot = (left ? 1 : -1) * 0.045 * Math.sin(a + 2.1 + ph);
      const x = left ? reach - W * 0.045 : W - hw + W * 0.045 - reach;
      const px = left ? x : x + hw;
      c.save();
      c.scale(cols / W, rows / H);
      c.translate(px, cy);
      c.rotate(rot);
      c.scale(scale, scale);
      c.translate(-px, -cy);
      c.drawImage(tile, x, cy - hh / 2, hw, hh);
      c.restore();
    };

    const render = (tIn: number) => {
      if (!ready || !W) return;
      const t = ((tIn % LOOP) + LOOP) % LOOP;
      const portrait = H > W;
      for (const c of [cA, cB]) {
        c.fillStyle = "#fff";
        c.fillRect(0, 0, cols, rows);
      }
      drawHand(cA, "LA", true, t);
      drawHand(cA, "RA", false, t);
      drawHand(cB, "LB", true, t);
      drawHand(cB, "RB", false, t);
      const dA = cA.getImageData(0, 0, cols, rows).data;
      const dB = cB.getImageData(0, 0, cols, rows).data;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = "#0d0d0d";

      const mL = mixAt(t, 6.2, 14.6, 1.6);
      const mR = mixAt(t, 2.4, 10.4, 1.6);
      const tick = Math.floor(t * 7);

      for (let j = 0; j < rows; j++) {
        let shift = 0;
        if (hash(j, tick) > 0.965) shift = Math.round((hash(tick, j) - 0.5) * 8);
        const yc = (j + 0.5) * rowStep;
        const ey = (yc / H - (portrait ? 0.33 : 0.385)) / 0.085;
        for (let i = 0; i < cols; i++) {
          const si = clamp(i - shift, 0, cols - 1);
          const idx = j * cols + si;
          const seed = seeds[idx];
          const m = i < cols / 2 ? mL : mR;
          const useB = seed < m;
          const v0 = ((useB ? dB : dA)[idx * 4]) / 255;
          let v = clamp((1 - v0 - 0.16) / 0.42, 0, 1);
          if (v <= 0) continue;
          if (m > 0.001 && m < 0.999) {
            const d = Math.abs(seed - m);
            if (d < 0.12) {
              v *= d / 0.12;
              if (hash(i + tick, j) <= 0.4) v *= 0.3;
            }
          }
          v *= 0.86 + 0.14 * Math.sin(t * 3.2 + seed * 40);
          const cx = Math.abs((i + 0.5) / cols - 0.5);
          v *= smooth(0.035, 0.11, cx);
          const ex = cx / (portrait ? 0.44 : 0.2);
          v *= smooth(0.85, 1.25, Math.hypot(ex, ey));
          let lvl = 0;
          for (let k = LEVELS.length - 1; k >= 0; k--) {
            if (v >= LEVELS[k] - 0.13) { lvl = k; break; }
          }
          if (lvl === 0) continue;
          const r = lvl === 1 ? R * 0.38 : R * LEVELS[lvl];
          ctx.beginPath();
          ctx.arc((i + 0.5) * step, yc, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      (Object.keys(SRC) as Key[]).forEach((k) => {
        const [fx, fy, fw, fh] = SRC[k];
        const sw = fw * iw, sh = fh * ih;
        const tc = document.createElement("canvas");
        tc.width = 420;
        tc.height = Math.round(420 * (sh / sw));
        const c = tc.getContext("2d")!;
        c.imageSmoothingQuality = "high";
        c.drawImage(img, fx * iw, fy * ih, sw, sh, 0, 0, tc.width, tc.height);
        tiles[k] = tc;
      });
      ready = true;
    };
    img.src = SHEET;

    resize();
    window.addEventListener("resize", resize);
    const t0 = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      render((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
