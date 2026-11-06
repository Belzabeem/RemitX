"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface NodeCity {
  id: string;
  name: string;
  code: string;
  lat: number;
  lon: number;
  flag: string;
}

interface Corridor {
  id: string;
  from: NodeCity;
  to: NodeCity;
  rate: string;
  speed: string;
}

const CITIES: Record<string, NodeCity> = {
  NYC: { id: "NYC", name: "New York", code: "USD", lat: 40.71, lon: -74.0, flag: "🇺🇸" },
  LON: { id: "LON", name: "London", code: "GBP", lat: 51.5, lon: -0.12, flag: "🇬🇧" },
  LOS: { id: "LOS", name: "Lagos", code: "NGN", lat: 6.52, lon: 3.37, flag: "🇳🇬" },
  MNL: { id: "MNL", name: "Manila", code: "PHP", lat: 14.59, lon: 120.98, flag: "🇵🇭" },
};

const CORRIDORS: Corridor[] = [
  { id: "usd-ngn", from: CITIES.NYC, to: CITIES.LOS, rate: "1 USD = ₦1,525", speed: "~4.8s" },
  { id: "usd-gbp", from: CITIES.NYC, to: CITIES.LON, rate: "1 USD = £0.79", speed: "~5.1s" },
  { id: "gbp-ngn", from: CITIES.LON, to: CITIES.LOS, rate: "1 GBP = ₦1,930", speed: "~4.6s" },
  { id: "usd-php", from: CITIES.NYC, to: CITIES.MNL, rate: "1 USD = ₱58.2", speed: "~5.3s" },
];

function isLand(lat: number, lon: number): boolean {
  let l = lon;
  while (l > 180) l -= 360;
  while (l < -180) l += 360;

  // North America
  if (lat > 15 && lat < 72 && l > -168 && l < -52) {
    if (lat > 50) return true;
    if (lat > 25 && l > -125 && l < -70) return true;
    if (lat >= 15 && lat <= 25 && l > -105 && l < -85) return true;
  }
  // South America
  if (lat > -55 && lat < 13 && l > -82 && l < -34) {
    if (lat > -20 && l > -80 && l < -35) return true;
    if (lat <= -20 && l > -75 && l < -45) return true;
  }
  // Europe
  if (lat > 36 && lat < 71 && l > -11 && l < 42) {
    if (lat > 55 && l > 4 && l < 32) return true;
    if (lat > 50 && lat < 60 && l > -10 && l < 2) return true;
    if (lat >= 36 && lat <= 58 && l > -10 && l < 40) return true;
  }
  // Africa
  if (lat > -35 && lat < 38 && l > -18 && l < 52) {
    if (lat > 15 && l > -17 && l < 35) return true;
    if (lat > 4 && lat <= 15 && l > -18 && l < 45) return true;
    if (lat <= 4 && lat > -35 && l > 8 && l < 42) return true;
    if (lat > 4 && lat < 12 && l > 35 && l < 52) return true;
  }
  // Asia
  if (lat > 8 && lat < 75 && l > 40 && l < 180) {
    if (lat > 55 && l > 40 && l < 170) return true;
    if (lat > 20 && lat <= 55 && l > 60 && l < 140) return true;
    if (lat >= 8 && lat <= 35 && l > 68 && l < 90) return true;
    if (lat > 12 && lat < 40 && l > 35 && l < 60) return true;
    if (lat >= 10 && lat <= 25 && l > 95 && l < 110) return true;
    if (lat >= 5 && lat <= 20 && l > 118 && l < 127) return true;
    if (lat > 30 && lat < 46 && l > 128 && l < 146) return true;
  }
  // Australia & NZ
  if (lat > -44 && lat < -10 && l > 112 && l < 155) return true;

  return false;
}

function latLonTo3D(lat: number, lon: number, r: number) {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  return {
    x: r * Math.cos(phi) * Math.sin(theta),
    y: -r * Math.sin(phi),
    z: r * Math.cos(phi) * Math.cos(theta),
  };
}

function rotatePoint(p: { x: number; y: number; z: number }, rotX: number, rotY: number) {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = p.x * cosY + p.z * sinY;
  const z1 = -p.x * sinY + p.z * cosY;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  return { x: x1, y: y2, z: z2 };
}

interface SphereDot {
  x: number;
  y: number;
  z: number;
  isLand: boolean;
  baseRadius: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  opacity: number;
  color: string;
}

export default function GlobeNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeCorridor, setActiveCorridor] = useState<number>(0);

  // Rotation state
  const rotYRef = useRef(0.4);
  const rotXRef = useRef(0.25);
  const targetRotYRef = useRef<number | null>(null);
  const targetRotXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const ripplesRef = useRef<Ripple[]>([]);

  // Focus globe on a corridor
  const focusCorridor = useCallback((idx: number) => {
    setActiveCorridor(idx);
    const corr = CORRIDORS[idx];
    const midLon = (corr.from.lon + corr.to.lon) / 2;
    const midLat = (corr.from.lat + corr.to.lat) / 2;
    // Target rotation to bring midpoint to front
    targetRotYRef.current = -((midLon * Math.PI) / 180) + Math.PI / 2;
    targetRotXRef.current = ((midLat * Math.PI) / 180) * 0.5;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    let globeRadius = 145;
    let dots: SphereDot[] = [];

    // Precompute Fibonacci sphere dots with land distribution
    const numDots = 1100;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    dots = [];
    for (let i = 0; i < numDots; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numDots);
      const lat = 90 - (phi * 180) / Math.PI;
      const lon = ((theta * 180) / Math.PI) % 360;

      const land = isLand(lat, lon);
      // Unit sphere coords
      const x = Math.sin(phi) * Math.sin(theta);
      const y = -Math.cos(phi);
      const z = Math.sin(phi) * Math.cos(theta);

      dots.push({
        x,
        y,
        z,
        isLand: land,
        baseRadius: land ? 1.65 : 0.9,
      });
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      globeRadius = Math.min(145, Math.min(width, height) * 0.44);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Particle streams on corridors
    const particles = CORRIDORS.map((_, i) => ({
      corridorIndex: i,
      t: (i * 0.25) % 1,
      speed: 0.005 + (i % 2) * 0.002,
    }));

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(40, time - lastTime);
      lastTime = time;

      // Handle smooth interpolation to target rotation
      if (targetRotYRef.current !== null && targetRotXRef.current !== null) {
        const diffY = targetRotYRef.current - rotYRef.current;
        const diffX = targetRotXRef.current - rotXRef.current;
        rotYRef.current += diffY * 0.07;
        rotXRef.current += diffX * 0.07;
        if (Math.abs(diffY) < 0.005 && Math.abs(diffX) < 0.005) {
          targetRotYRef.current = null;
          targetRotXRef.current = null;
        }
      } else if (!isDraggingRef.current) {
        // Inertia damping
        rotYRef.current += velRef.current.y;
        rotXRef.current += velRef.current.x;
        velRef.current.y *= 0.94;
        velRef.current.x *= 0.94;
        // Ambient gentle drift
        rotYRef.current += 0.0016;
      }

      // Clamp X rotation to prevent flipping
      rotXRef.current = Math.max(-0.6, Math.min(0.6, rotXRef.current));

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const r = globeRadius;
      const rotX = rotXRef.current;
      const rotY = rotYRef.current;

      // 1. Draw subtle ambient globe glow & halo
      const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.05);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
      grad.addColorStop(0.85, "rgba(238, 237, 233, 0)");
      grad.addColorStop(1, "rgba(17, 17, 17, 0.04)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer delicate boundary ring
      ctx.strokeStyle = "rgba(17, 17, 17, 0.09)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. Render all sphere dots with depth sorting / projection
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const p3d = { x: d.x * r, y: d.y * r, z: d.z * r };
        const pRot = rotatePoint(p3d, rotX, rotY);

        const screenX = cx + pRot.x;
        const screenY = cy + pRot.y;

        const isFront = pRot.z > 0;
        const depthRatio = (pRot.z + r) / (2 * r); // 0 (back) to 1 (front)

        if (isFront) {
          const alpha = d.isLand
            ? 0.35 + 0.55 * (pRot.z / r)
            : 0.08 + 0.1 * (pRot.z / r);
          const rad = d.baseRadius * (0.85 + 0.4 * depthRatio);

          ctx.fillStyle = d.isLand
            ? `rgba(17, 17, 17, ${alpha.toFixed(3)})`
            : `rgba(17, 17, 17, ${(alpha * 0.4).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, rad, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Subtle holographic backface
          if (d.isLand && i % 2 === 0) {
            ctx.fillStyle = "rgba(17, 17, 17, 0.045)";
            ctx.beginPath();
            ctx.arc(screenX, screenY, d.baseRadius * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Render Corridor 3D Arcs & Travelling Currency Particles
      for (let cIdx = 0; cIdx < CORRIDORS.length; cIdx++) {
        const corr = CORRIDORS[cIdx];
        const isActive = cIdx === activeCorridor;

        const pA3d = latLonTo3D(corr.from.lat, corr.from.lon, r);
        const pB3d = latLonTo3D(corr.to.lat, corr.to.lon, r);

        // Compute 3D apex
        const mx = (pA3d.x + pB3d.x) / 2;
        const my = (pA3d.y + pB3d.y) / 2;
        const mz = (pA3d.z + pB3d.z) / 2;
        const mLen = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
        const dist = Math.sqrt(
          (pA3d.x - pB3d.x) ** 2 + (pA3d.y - pB3d.y) ** 2 + (pA3d.z - pB3d.z) ** 2
        );
        const apexHeight = r * (1 + 0.38 * (dist / (2 * r)));
        const ctrl = {
          x: (mx / mLen) * apexHeight,
          y: (my / mLen) * apexHeight,
          z: (mz / mLen) * apexHeight,
        };

        // Sample arc points in 3D
        const steps = 36;
        const arcScreenPts: { x: number; y: number; z: number }[] = [];
        let frontCount = 0;

        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const inv = 1 - t;
          const x3d = inv * inv * pA3d.x + 2 * inv * t * ctrl.x + t * t * pB3d.x;
          const y3d = inv * inv * pA3d.y + 2 * inv * t * ctrl.y + t * t * pB3d.y;
          const z3d = inv * inv * pA3d.z + 2 * inv * t * ctrl.z + t * t * pB3d.z;

          const rot = rotatePoint({ x: x3d, y: y3d, z: z3d }, rotX, rotY);
          arcScreenPts.push({ x: cx + rot.x, y: cy + rot.y, z: rot.z });
          if (rot.z > -10) frontCount++;
        }

        // Draw 3D arc path if partly on front hemisphere
        if (frontCount > 4) {
          ctx.beginPath();
          ctx.moveTo(arcScreenPts[0].x, arcScreenPts[0].y);
          for (let s = 1; s < arcScreenPts.length; s++) {
            ctx.lineTo(arcScreenPts[s].x, arcScreenPts[s].y);
          }
          ctx.strokeStyle = isActive
            ? "rgba(17, 17, 17, 0.45)"
            : "rgba(17, 17, 17, 0.16)";
          ctx.lineWidth = isActive ? 1.6 : 1;
          ctx.setLineDash(isActive ? [] : [3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 4. Update & Render Traveling Particles on this Arc
        const part = particles[cIdx];
        part.t += part.speed * (dt / 16.6);
        if (part.t >= 1) {
          part.t = 0;
          // Trigger destination arrival ripple
          const pDestRot = rotatePoint(pB3d, rotX, rotY);
          if (pDestRot.z > -20) {
            ripplesRef.current.push({
              x: cx + pDestRot.x,
              y: cy + pDestRot.y,
              r: 3,
              maxR: 16,
              opacity: 0.8,
              color: isActive ? "#17603c" : "#111111",
            });
          }
        }

        // Compute particle position at progress part.t
        const pt = part.t;
        const invT = 1 - pt;
        const px = invT * invT * pA3d.x + 2 * invT * pt * ctrl.x + pt * pt * pB3d.x;
        const py = invT * invT * pA3d.y + 2 * invT * pt * ctrl.y + pt * pt * pB3d.y;
        const pz = invT * invT * pA3d.z + 2 * invT * pt * ctrl.z + pt * pt * pB3d.z;
        const pRot = rotatePoint({ x: px, y: py, z: pz }, rotX, rotY);

        if (pRot.z > -15) {
          const sx = cx + pRot.x;
          const sy = cy + pRot.y;

          // Soft radiant halo
          ctx.fillStyle = isActive ? "rgba(23, 96, 60, 0.22)" : "rgba(17, 17, 17, 0.14)";
          ctx.beginPath();
          ctx.arc(sx, sy, isActive ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Core bright currency bead
          ctx.fillStyle = isActive ? "#17603c" : "#111111";
          ctx.beginPath();
          ctx.arc(sx, sy, isActive ? 3 : 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Render Expanding Settlement Ripples
      const activeRipples = ripplesRef.current;
      for (let i = activeRipples.length - 1; i >= 0; i--) {
        const rip = activeRipples[i];
        rip.r += 0.45;
        rip.opacity -= 0.024;
        if (rip.opacity <= 0 || rip.r >= rip.maxR) {
          activeRipples.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = rip.color;
        ctx.globalAlpha = Math.max(0, rip.opacity);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 6. Render City Corridor Nodes & Badges
      const cityEntries = Object.values(CITIES);
      for (const city of cityEntries) {
        const p3d = latLonTo3D(city.lat, city.lon, r);
        const pRot = rotatePoint(p3d, rotX, rotY);

        if (pRot.z > -25) {
          const sx = cx + pRot.x;
          const sy = cy + pRot.y;
          const depthRatio = (pRot.z + r) / (2 * r);
          const isFront = pRot.z > 0;

          // City core dot
          ctx.fillStyle = "#111111";
          ctx.beginPath();
          ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
          ctx.fill();

          // Subtle outer ring
          ctx.strokeStyle = "rgba(17, 17, 17, 0.35)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(sx, sy, 6.2, 0, Math.PI * 2);
          ctx.stroke();

          // Pill tag for currency when near the front
          if (isFront && depthRatio > 0.45) {
            const label = `${city.flag} ${city.code}`;
            ctx.font = "600 10.5px Inter, sans-serif";
            const textMetrics = ctx.measureText(label);
            const textWidth = textMetrics.width;
            const padX = 5;
            const boxW = textWidth + padX * 2;
            const boxH = 16;
            const boxX = sx + 8;
            const boxY = sy - 8;

            // Box shadow / backdrop
            ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 4);
            ctx.fill();
            ctx.strokeStyle = "rgba(17, 17, 17, 0.18)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label text
            ctx.fillStyle = "#111111";
            ctx.fillText(label, boxX + padX, boxY + 11.5);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [activeCorridor]);

  // Pointer interaction for 3D rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    targetRotYRef.current = null;
    targetRotXRef.current = null;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    rotYRef.current += dx * 0.007;
    rotXRef.current += dy * 0.007;
    velRef.current = { x: dy * 0.004, y: dx * 0.004 };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  const active = CORRIDORS[activeCorridor];

  return (
    <div className="relative my-2 w-full max-w-[420px] select-none rounded-2xl border border-black/[0.07] bg-white/60 p-4 shadow-xs backdrop-blur-xs">
      {/* Top HUD */}
      <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 text-[12.5px]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
          </span>
          <span className="font-medium tracking-tight text-ink">Stellar Liquidity Mesh</span>
        </div>
        <div className="text-[12px] font-medium text-muted">
          Avg. settlement <span className="font-semibold text-ink">{active.speed}</span>
        </div>
      </div>

      {/* 3D Canvas with drag handle hint */}
      <div className="relative h-[250px] w-full cursor-grab active:cursor-grabbing sm:h-[270px]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-full w-full touch-none"
          role="img"
          aria-label="Interactive 3D dot-matrix globe showing active cross-border payment corridors on Stellar"
        />
        <div className="pointer-events-none absolute bottom-1 right-2 rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-medium text-muted backdrop-blur-xs">
          Drag to explore
        </div>
      </div>

      {/* Active Corridor Live Summary */}
      <div className="mt-1 rounded-xl bg-[#eeede9]/60 px-3.5 py-2.5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium text-ink">
            {active.from.name} → {active.to.name}
          </span>
          <span className="font-semibold text-ink">{active.rate}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11.5px] text-muted">
          <span>Direct DEX Path Payment</span>
          <span className="font-medium text-positive">Zero bank markup</span>
        </div>
      </div>

      {/* Quick Corridor Selection Pills */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {CORRIDORS.map((c, idx) => {
          const isSelected = idx === activeCorridor;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => focusCorridor(idx)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                isSelected
                  ? "bg-ink text-white shadow-xs"
                  : "bg-white/80 text-muted hover:bg-white hover:text-ink border border-black/5"
              }`}
            >
              <span>{c.from.flag}</span>
              <span>{c.from.code} → {c.to.code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
