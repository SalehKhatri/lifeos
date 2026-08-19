"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { scaleIn } from "@/lib/motion";

// "Torch" effect tuning — cursor proximity brightens the ambient orbs. See
// frontend/DESIGN.md's Microinteractions section.
const TORCH_RADIUS = 420; // px — distance at which an orb reaches full brightness
const DIM_OPACITY = 0.35;
const BRIGHT_OPACITY = 1;

function proximityOpacity(distance: number) {
  const t = 1 - Math.min(distance / TORCH_RADIUS, 1);
  return DIM_OPACITY + t * (BRIGHT_OPACITY - DIM_OPACITY);
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Shared shell for /login + /register — two-column on md+ (branding panel +
// form), single column on mobile (branding panel hidden, the Card's own
// header carries the wordmark instead — see each page).
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Raw motion values written directly on pointermove (no React re-render per
  // pixel of mouse movement — important since this fires constantly), then
  // smoothed through a spring so both the following motion and the
  // settle-back-to-dim on pointer-leave feel natural rather than snapping.
  const cyanTarget = useMotionValue(DIM_OPACITY);
  const magentaTarget = useMotionValue(DIM_OPACITY);
  const cyanOpacity = useSpring(cyanTarget, { stiffness: 120, damping: 20 });
  const magentaOpacity = useSpring(magentaTarget, { stiffness: 120, damping: 20 });

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion()) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Approximate orb centers as a fraction of the container — matches their
    // Tailwind positioning below closely enough for an ambient effect that
    // doesn't need to be pixel-perfect.
    cyanTarget.set(proximityOpacity(Math.hypot(x - rect.width * 0.05, y - rect.height * 0.25)));
    magentaTarget.set(
      proximityOpacity(Math.hypot(x - rect.width * 0.95, y - rect.height * 0.75)),
    );
  }

  function handlePointerLeave() {
    cyanTarget.set(DIM_OPACITY);
    magentaTarget.set(DIM_OPACITY);
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="hud-grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
    >
      {/* Ambient decoration only — aria-hidden, no layout impact. */}
      <motion.div
        aria-hidden
        style={{ opacity: cyanOpacity }}
        className="animate-pulse-glow pointer-events-none absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-accent-cyan/25 blur-3xl"
      />
      <motion.div
        aria-hidden
        style={{ opacity: magentaOpacity }}
        className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-accent-magenta/25 blur-3xl"
      />

      <div className="relative z-10 grid w-full max-w-4xl items-center gap-12 md:grid-cols-2">
        <div className="hidden flex-col gap-4 md:flex">
          <p className="font-brand text-4xl tracking-wide text-accent-cyan">LIFEOS</p>
          <h1 className="font-heading text-2xl font-semibold text-balance">
            What should you work on right now?
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Deadlines, priority, and your actual free time — one ranked answer, always up to
            date.
          </p>
        </div>

        <motion.div initial="hidden" animate="visible" variants={scaleIn}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
