"use client";

import { useCallback, useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; base: number; speed: number; tw: number };

/**
 * Subtle full-viewport starfield (dark theme) — fixed behind page content, pointer-events none.
 * Does not receive pointer events; content stays fully interactive.
 */
export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);
  const buildStars = useCallback((w: number, h: number) => {
    const area = w * h;
    const n = Math.min(520, Math.max(180, Math.floor(area / 4500)));
    const arr: Star[] = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.15,
        base: 0.15 + Math.random() * 0.55,
        speed: 0.4 + Math.random() * 1.2,
        tw: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      starsRef.current = buildStars(w, h);
    };

    const draw = (t: number) => {
      const time = t * 0.001;
      ctx.fillStyle = "#020203";
      ctx.fillRect(0, 0, w, h);
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const tw = 0.3 + 0.25 * Math.sin(time * s.speed + s.tw);
        const a = Math.min(1, s.base + tw);
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.9})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    const onResize = () => {
      resize();
    };
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [buildStars]);

  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas"
      aria-hidden
      data-nosnippet
    />
  );
}
