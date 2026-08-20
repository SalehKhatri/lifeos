// Centralized animation tuning — see frontend/DESIGN.md. Change durations/
// easing here to retune the whole app's "feel" in one place, rather than
// hunting through every component. Chosen direction: subtle & snappy —
// animation should reinforce actions on the 500th use, not add ceremony.
//
// Ambient/continuous effects (e.g. a glowing pulse) are deliberately NOT
// here — those are plain CSS `@keyframes` in globals.css, cheaper to run
// forever than a JS-driven loop. Motion is for enter/exit and
// interaction-driven transitions only.

import type { Transition, Variants } from "motion/react";

export const TRANSITION_FAST: Transition = {
  duration: 0.15,
  ease: [0.16, 1, 0.3, 1],
};

export const TRANSITION_BASE: Transition = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1],
};

// Small upward fade — the default for cards/rows entering the viewport.
// `exit` only fires inside an `<AnimatePresence>` — without one, Motion has
// no chance to animate a departing element, React just unmounts it. Shrinks
// rather than sliding back down (the reverse of `hidden`'s `y: 8`) so a
// deleted/filtered-out row reads as "removed," not "un-entering" — those
// are different actions and shouldn't look identical played backwards.
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: TRANSITION_BASE },
  exit: { opacity: 0, scale: 0.97, transition: TRANSITION_FAST },
};

// Wrap a list container with this + fadeInUp on each child for a staggered entrance.
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

// For a hero moment (e.g. the Today page's top task reveal) — a touch more
// motion than fadeInUp, still fast.
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: TRANSITION_BASE },
};
