import type { Transition } from "framer-motion";

export function pageTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) return { duration: 0 };
  return { duration: 0.22, ease: [0.22, 1, 0.36, 1] };
}

export function sectionTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) return { duration: 0 };
  return { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
}

export function staggerChildren(reduceMotion: boolean, stagger = 0.06): number {
  return reduceMotion ? 0 : stagger;
}
