"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", notify);
      return () => m.removeEventListener("change", notify);
    },
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}

/** Flips to true the first time the element is meaningfully on screen. */
export function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** Types `text` out one character at a time. */
export function useTyped(text: string, delayMs: number, speedMs: number, reduced: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let i = 0;
    let iv: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      iv = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(iv);
      }, speedMs);
    }, delayMs);
    return () => {
      clearTimeout(start);
      clearInterval(iv);
    };
  }, [text, delayMs, speedMs, reduced]);
  const count = reduced ? text.length : n;
  return { shown: text.slice(0, count), done: count >= text.length };
}

/** Counts from 0 up to `to` once, after `delayMs`. */
export function useCountUp(to: number, delayMs: number, durationMs: number, reduced: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = setTimeout(() => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / durationMs);
        setV(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, [to, delayMs, durationMs, reduced]);
  return reduced ? to : v;
}

export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
