"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Card = {
  href: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
};

const MAX_TILT = 12;
const PERSPECTIVE = 1100;
const LIFT_Z = 32;
const LERP = 0.12;
const LERP_OFF = 0.2;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = () => setReduced(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

/**
 * tom_ui / 21st.dev style tilt: rAF-smoothed rotate + translateZ, moving specular, edge glow.
 */
function TiltLink({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const hovering = useRef(false);
  const reduced = usePrefersReducedMotion();
  const target = useRef({ rx: 0, ry: 0, z: 0, gx: 50, gy: 50, shine: 0 });
  const current = useRef({ rx: 0, ry: 0, z: 0, gx: 50, gy: 50, shine: 0 });
  const running = useRef(false);

  const applyFrame = useCallback(() => {
    const inner = innerRef.current;
    const wrap = wrapRef.current;
    if (!inner || !wrap) {
      running.current = false;
      return;
    }

    const c = current.current;
    const t = target.current;
    const rate = hovering.current ? LERP : LERP_OFF;
    c.rx = lerp(c.rx, t.rx, rate);
    c.ry = lerp(c.ry, t.ry, rate);
    c.z = lerp(c.z, t.z, rate);
    c.gx = lerp(c.gx, t.gx, rate);
    c.gy = lerp(c.gy, t.gy, rate);
    c.shine = lerp(c.shine, t.shine, rate);

    wrap.style.setProperty("--tilt-gx", `${c.gx}%`);
    wrap.style.setProperty("--tilt-gy", `${c.gy}%`);
    wrap.style.setProperty("--tilt-s", String(c.shine));
    inner.style.transform = `perspective(${PERSPECTIVE}px) translateZ(${c.z}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg)`;

    const settled =
      Math.abs(t.rx - c.rx) < 0.02 &&
      Math.abs(t.ry - c.ry) < 0.02 &&
      Math.abs(t.z - c.z) < 0.15 &&
      Math.abs(t.gx - c.gx) < 0.1 &&
      Math.abs(t.gy - c.gy) < 0.1 &&
      Math.abs(t.shine - c.shine) < 0.01;

    if (!settled) {
      rafRef.current = requestAnimationFrame(applyFrame);
    } else {
      running.current = false;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (running.current) return;
    running.current = true;
    rafRef.current = requestAnimationFrame(applyFrame);
  }, [applyFrame]);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (reduced) return;
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 2 * MAX_TILT;
      const ry = (x - 0.5) * 2 * MAX_TILT;
      target.current = { rx, ry, z: LIFT_Z, gx: x * 100, gy: y * 100, shine: 1 };
      hovering.current = true;
      startLoop();
    },
    [reduced, startLoop],
  );

  const onLeave = useCallback(() => {
    hovering.current = false;
    target.current = { rx: 0, ry: 0, z: 0, gx: 50, gy: 50, shine: 0 };
    if (!reduced) startLoop();
    else {
      const inner = innerRef.current;
      const wrap = wrapRef.current;
      if (inner) inner.style.transform = `perspective(${PERSPECTIVE}px) translateZ(0)`;
      if (wrap) {
        wrap.style.setProperty("--tilt-gx", "50%");
        wrap.style.setProperty("--tilt-gy", "50%");
        wrap.style.setProperty("--tilt-s", "0");
      }
    }
  }, [reduced, startLoop]);

  const onEnter = useCallback(() => {
    if (reduced) {
      const inner = innerRef.current;
      if (inner) inner.style.transform = `perspective(${PERSPECTIVE}px) translateZ(12px)`;
    }
  }, [reduced]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <div
      ref={wrapRef}
      className="home-ai-tilt__wrap"
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ ["--tilt-gx" as string]: "50%", ["--tilt-gy" as string]: "50%", ["--tilt-s" as string]: "0" }}
    >
      <div ref={innerRef} className="home-ai-tilt__inner" style={{ transformStyle: "preserve-3d" }}>
        <div className="home-ai__tilt-sheen home-ai__tilt-sheen--gloss" aria-hidden />
        <div className="home-ai__tilt-sheen home-ai__tilt-sheen--edge" aria-hidden />
        <span className="home-ai__tilt-edge" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function HomeToolsTiltGrid({ cards }: { cards: Card[] }) {
  return (
    <ul className="home-ai__grid home-ai__grid--tilt" role="list">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <li key={c.href}>
            <TiltLink>
              <Link className="home-ai__card home-ai__card--tilt" href={c.href}>
                <span className="home-ai__icon" aria-hidden>
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className="home-ai__card-title">{c.label}</span>
                <span className="home-ai__card-blurb">{c.blurb}</span>
              </Link>
            </TiltLink>
          </li>
        );
      })}
    </ul>
  );
}
